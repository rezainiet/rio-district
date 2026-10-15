#!/usr/bin/env bash
# Daily backup of the database and admin uploads. Template for /etc/cron.daily
# or a systemd timer. Keeps 14 days. Copy the result off the server too.
#   MONGODB_URI is read from /srv/kalt/shared/.env.local
set -euo pipefail

BACKUP_DIR=/var/backups/kalt
UPLOAD_DIR=/var/lib/kalt/uploads
STAMP=$(date +%Y%m%d-%H%M)
URI=$(grep -E '^MONGODB_URI=' /srv/kalt/shared/.env.local | cut -d= -f2-)

mkdir -p "$BACKUP_DIR"
mongodump --uri="$URI" --archive="$BACKUP_DIR/kalt-$STAMP.archive.gz" --gzip
tar -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"

find "$BACKUP_DIR" -type f -mtime +14 -delete
echo "Backup OK: $STAMP"

# Restore (to a NEW database first, then switch):
#   mongorestore --uri="$URI" --archive=kalt-YYYYMMDD-HHMM.archive.gz --gzip --nsFrom='kalt.*' --nsTo='kalt_restore.*'
