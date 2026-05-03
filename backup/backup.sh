#!/bin/sh
set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/backups/erp_backup_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup..."

# Dump and compress
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_FILE"

echo "[$(date)] Dump done: $BACKUP_FILE"

# Upload to S3-compatible storage (Backblaze B2 / AWS S3 / MinIO)
if [ -n "$S3_BUCKET" ]; then
  aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/db-backups/" \
    --endpoint-url "$S3_ENDPOINT_URL"
  echo "[$(date)] Uploaded to s3://${S3_BUCKET}/db-backups/"
  rm "$BACKUP_FILE"
else
  echo "[$(date)] S3_BUCKET not set — backup kept locally at $BACKUP_FILE"
fi

# Delete local backups older than 7 days
find /backups -name "*.sql.gz" -mtime +7 -delete
echo "[$(date)] Cleanup done."
