#!/usr/bin/env bash
# Installed root-owned as /usr/local/sbin/rio-district-deploy.
# Forced SSH entry point: stdin is exactly one commit SHA, never a shell command.
set -euo pipefail
umask 077
export PATH=/opt/rio-district/node-v22.23.3-linux-x64/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[[ $EUID == 0 && $# == 0 ]] || { echo 'Restricted deployment entry point.' >&2; exit 1; }
read -r revision
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || { echo 'A full commit SHA is required.' >&2; exit 1; }

exec 9>/run/lock/rio-district-deploy.lock
flock -w 1200 9

base=/srv/rio-district
repository=/var/lib/rio-district-deploy/repository.git
environment="$base/shared/.env.local"
node=/opt/rio-district/node-v22.23.3-linux-x64/bin/node
previous=$(readlink -f "$base/current")
[[ "$previous" == "$base/releases/"* && -f "$previous/.next/BUILD_ID" ]]
test -r "$environment"
systemctl is-active --quiet rio-district.service

git_app() { runuser -u riodistrict -- git --git-dir="$repository" "$@"; }
refresh_main() { git_app fetch --quiet --no-tags origin +refs/heads/main:refs/heads/main; }
refresh_main
if [[ $(git_app rev-parse refs/heads/main) != "$revision" ]]; then
  echo 'Skipping a superseded commit; a newer main deployment will follow.'
  exit 0
fi
if [[ -f "$previous/REVISION" && $(cat "$previous/REVISION") == "$revision" ]]; then
  echo "Commit $revision is already deployed."
  exit 0
fi

free_kb=$(df -Pk "$base" | awk 'NR==2 {print $4}')
(( free_kb >= 2097152 )) || { echo 'Deployment requires 2 GiB free disk space.' >&2; exit 1; }
test -z "$(ss -H -ltn 'sport = :3002')"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
release="$base/releases/$stamp-${revision:0:12}"
backup="/var/backups/rio-district/actions-$stamp-${revision:0:12}"
install -d -m 700 "$backup"
install -d -m 750 -o riodistrict -g riodistrict "$release"
candidate_started=0
switched=0
verified=0

cleanup() {
  result=$?
  trap - EXIT
  if [[ "$candidate_started" == 1 ]]; then
    systemctl stop rio-district-ci-candidate.service || true
  fi
  if [[ "$switched" == 1 && "$verified" != 1 ]]; then
    echo 'Health verification failed; restoring the previous application release.' >&2
    ln -s "$previous" "$base/.actions-rollback-${revision:0:12}"
    mv -Tf "$base/.actions-rollback-${revision:0:12}" "$base/current"
    systemctl restart rio-district.service || true
    result=1
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 1' INT TERM HUP

echo "Backing up Rio District before deploying $revision."
cp "$environment" "$backup/environment.private"
cp /etc/systemd/system/rio-district.service "$backup/rio-district.service"
printf '%s\n' "$previous" > "$backup/previous-release"
# Use a private config so the database URI never enters process arguments or CI logs.
python3 - "$environment" "$backup/mongodb.private.yml" <<'PY'
import json, pathlib, sys
for line in pathlib.Path(sys.argv[1]).read_text().splitlines():
    key, separator, value = line.partition('=')
    if separator and key.strip() == 'MONGODB_URI':
        value = value.strip()
        if value.startswith(('"', "'")):
            if len(value) < 2 or value[-1] != value[0]:
                raise SystemExit('Unsupported database URI quoting.')
            value = value[1:-1]
        else:
            value = value.split(' #', 1)[0].strip()
        if not value.startswith(('mongodb://', 'mongodb+srv://')):
            raise SystemExit('Missing database URI.')
        pathlib.Path(sys.argv[2]).write_text('uri: ' + json.dumps(value) + '\n')
        break
else:
    raise SystemExit('Missing database URI.')
PY
mongodump --config="$backup/mongodb.private.yml" --archive="$backup/database.archive.gz" --gzip > "$backup/database.private.log" 2>&1
mongorestore --config="$backup/mongodb.private.yml" --archive="$backup/database.archive.gz" --gzip --dryRun > "$backup/restore-check.private.log" 2>&1
tar -czf "$backup/uploads.tar.gz" -C /var/lib/rio-district uploads
tar -tzf "$backup/uploads.tar.gz" > /dev/null
sha256sum "$backup/database.archive.gz" "$backup/uploads.tar.gz" "$backup/environment.private" > "$backup/checksums.sha256"

echo 'Preparing an isolated release from the exact Git commit.'
git_app archive "$revision" | runuser -u riodistrict -- tar -x -C "$release"
test ! -e "$release/.env.local"
test ! -L "$release/.env.local"
ln -s "$environment" "$release/.env.local"
printf '%s\n' "$revision" > "$release/REVISION"
cp "$release/REVISION" "$release/APPLICATION_REVISION"
cd "$release"
if ! runuser -u riodistrict -- env MONGOMS_DISABLE_POSTINSTALL=1 NEXT_TELEMETRY_DISABLED=1 npm ci --no-audit --no-fund > "$backup/install.private.log" 2>&1; then
  echo "Dependency installation failed; see $backup/install.private.log on the VPS." >&2
  exit 1
fi
if ! nice -n 10 runuser -u riodistrict -- env NODE_ENV=production APP_ENV=production RIO_EVERFLOW_TEST=false NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1024 npm run build > "$backup/build.private.log" 2>&1; then
  echo "Build failed; see $backup/build.private.log on the VPS." >&2
  exit 1
fi
test -f "$release/.next/BUILD_ID"
cmp "$environment" "$backup/environment.private"

wait_health() {
  for _ in {1..40}; do
    if curl -fsS --max-time 3 "$1/api/health" | "$node" -e 'let b="";process.stdin.on("data",d=>b+=d);process.stdin.on("end",()=>{try{const j=JSON.parse(b);process.exit(j.status==="ok"&&j.db==="up"?0:1)}catch{process.exit(1)}})' > /dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}
check_routes() {
  for route in / /produit/veste-bresil-vert /panier /commande /retours-remboursements /admin/login; do
    curl -fsS --max-time 20 "$1$route" > /dev/null
  done
}
echo 'Checking the candidate on loopback port 3002.'
systemd-run --quiet --unit=rio-district-ci-candidate --collect --uid=riodistrict --gid=riodistrict \
  --property=WorkingDirectory="$release" --property=MemoryMax=700M \
  --setenv=NODE_ENV=production --setenv=APP_ENV=production --setenv=RIO_EVERFLOW_TEST=false \
  --setenv=NEXT_TELEMETRY_DISABLED=1 --setenv=NODE_OPTIONS=--max-old-space-size=512 \
  "$node" "$release/node_modules/next/dist/bin/next" start -p 3002 -H 127.0.0.1
candidate_started=1
wait_health http://127.0.0.1:3002
check_routes http://127.0.0.1:3002
systemctl stop rio-district-ci-candidate.service
candidate_started=0

# Do not activate an older build if main moved while it was being prepared.
refresh_main
if [[ $(git_app rev-parse refs/heads/main) != "$revision" ]]; then
  echo 'Candidate passed but main moved; leaving the current release active.'
  exit 0
fi
cmp "$environment" "$backup/environment.private"
echo 'Activating the verified release and restarting only Rio District.'
ln -s "$release" "$base/.actions-current-${revision:0:12}"
switched=1
mv -Tf "$base/.actions-current-${revision:0:12}" "$base/current"
systemctl restart rio-district.service
wait_health http://127.0.0.1:3000
wait_health https://rio-district.store
check_routes https://rio-district.store
cmp "$environment" "$backup/environment.private"
verified=1
printf '%s\n' "$revision" > /var/lib/rio-district-deploy/last-successful-revision
echo "Deployed $revision successfully. Previous release: $previous"
