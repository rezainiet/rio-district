#!/usr/bin/env bash
# Daily backup of the database and uploads (admin images + review photos).
# Install as /etc/cron.daily/rio-district-backup (chmod 750) or a systemd timer.
# Keeps 14 days locally — ALSO copy the result off the server (rclone/scp/object storage).
#   MONGODB_URI is read from /srv/rio-district/shared/.env.local
set -euo pipefail

BACKUP_DIR=/var/backups/rio-district
UPLOAD_DIR=/var/lib/rio-district/uploads
ENV_FILE=/srv/rio-district/shared/.env.local
STAMP=$(date +%Y%m%d-%H%M)
URI=$(grep -E '^MONGODB_URI=' "$ENV_FILE" | cut -d= -f2-)

umask 077
mkdir -p "$BACKUP_DIR"
mongodump --uri="$URI" --archive="$BACKUP_DIR/db-$STAMP.archive.gz" --gzip
tar -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"

# A backup that cannot be read is not a backup.
test -s "$BACKUP_DIR/db-$STAMP.archive.gz"
tar -tzf "$BACKUP_DIR/uploads-$STAMP.tar.gz" > /dev/null

find "$BACKUP_DIR" -type f -mtime +14 -delete
echo "Backup OK: $STAMP"

# Restore test (into a NEW database, never over production):
#   mongorestore --uri="$URI" --archive=db-YYYYMMDD-HHMM.archive.gz --gzip \
#     --nsFrom='riodistrict.*' --nsTo='riodistrict_restore.*'
# Uploads: tar -xzf uploads-YYYYMMDD-HHMM.tar.gz -C /tmp/restore-test
