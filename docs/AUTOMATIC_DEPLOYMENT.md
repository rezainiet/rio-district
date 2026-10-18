# Automatic production deployment

Every push to `main` runs `.github/workflows/deploy.yml`. Other branches never deploy.
The workflow can also be run manually from the Actions tab, choosing `main`.

1. A GitHub-hosted Ubuntu runner installs the lockfile with Node 22.23.3, generates
   Next.js route types, and runs TypeScript, ESLint, unit tests, and the isolated
   Everflow integration tests against a disposable MongoDB service.
2. After the checks pass, the runner sends the exact commit SHA through a restricted
   SSH connection. The VPS fetches only this public repository's `main` branch.
3. The VPS backs up the production database, uploads, environment and app service.
   A database archive dry run and upload archive checks run before building.
4. A new release is installed and built on the VPS using its existing production
   environment, then verified on loopback port 3002 while the old release serves traffic.
5. A successful candidate replaces the `current` symlink atomically. Only
   `rio-district.service` restarts. HTTP, database and key route checks run after activation.
   Any failure during activation restores the previous release and restarts the app.

Concurrent deployments are serialized by GitHub and a VPS lock. Superseded commits
are skipped before building and before activation. A failed build leaves the current
release active; failures appear in the repository's Actions tab. No production database
credentials are stored in GitHub. The deploy does not seed, migrate, restore over the
production database, change payment flags, or restart nginx/MongoDB.

The admin payment switch writes a separate persistent flag file at
`/var/lib/rio-district/payment-control/everflow-enabled.env`. Install the narrow
systemd drop-in from `deploy/systemd/rio-district-payment-control.conf` once, with
the directory owned by `riodistrict` and the flag file mode `0600`. The running app
reads the file on each checkout request; systemd loads the same value after a service
restart. Ordinary GitHub deployments preserve it.

## Production environment configuration

GitHub environment: `production`, with deployment branches restricted to `main`.

| Type | Name | Purpose |
| --- | --- | --- |
| Secret | `DEPLOY_SSH_KEY` | Dedicated Ed25519 private key for `rio-deploy` |
| Variable | `DEPLOY_HOST` | Current production VPS address |
| Variable | `DEPLOY_PORT` | Existing SSH port |
| Variable | `DEPLOY_USER` | `rio-deploy` |
| Variable | `DEPLOY_KNOWN_HOSTS` | Independently verified, pinned SSH host key |

The account cannot run arbitrary commands, allocate a terminal, forward ports/agents,
or upload files. Its key runs only the root-owned `/usr/local/sbin/rio-district-deploy`
entry point, which accepts a full SHA on stdin, fetches the repository's current main,
and runs application installs/builds as `riodistrict`. The sudoers entry permits only
that fixed command with no arguments. Existing administrator SSH access is unchanged.

`deploy/github-actions-deploy.sh` is the reviewed source for the installed entry point.
Updating this root-owned script requires an administrator to inspect and install its
new version; ordinary deployments intentionally cannot replace it.

## Recovery and maintenance

Backups: `/var/backups/rio-district/actions-<UTC timestamp>-<SHA prefix>/` (private).
Build/install logs stay there; they are not uploaded to the public Actions log.
`previous-release` records the application rollback target. Current and previous built
releases remain under `/srv/rio-district/releases/`; `REVISION` records each deployed SHA.
`/var/lib/rio-district-deploy/last-successful-revision` records the last successful run.

For a manual application rollback, serialize with `/run/lock/rio-district-deploy.lock`,
verify the selected release's `.next/BUILD_ID`, atomically repoint `current` to the
recorded previous release and restart only `rio-district.service`. Verify `/api/health`
and the storefront. Never restore an old database over newer customer orders.

The deploy requires 2 GiB free disk space and leaves backup/release cleanup to an
administrator. Retain the current and previous releases and required recovery backups.
The database archive dry run checks readability; it does not replace periodic isolated
restore drills or the existing off-server backup process.

GitHub deployment/concurrency reference:
[Deploying with GitHub Actions](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments).
