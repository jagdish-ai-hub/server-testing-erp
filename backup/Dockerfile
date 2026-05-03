# =============================================================================
# Backup Dockerfile — Automated PostgreSQL backup service
# =============================================================================
#
# Runs a cron daemon inside Alpine Linux.
# Every day at 2am it executes backup.sh which:
#   1. Dumps the PostgreSQL database with pg_dump
#   2. Compresses the dump with gzip
#   3. Uploads it to S3-compatible storage (Backblaze B2 / AWS S3) if configured
#   4. Deletes local backup files older than 7 days
#
# Required environment variables (set in docker-compose.yml / .env):
#   DB_HOST               — PostgreSQL host (use 'postgres' inside Docker)
#   DB_USER               — PostgreSQL username
#   DB_PASSWORD           — PostgreSQL password
#   DB_NAME               — PostgreSQL database name
#
# Optional environment variables (leave empty to skip cloud upload):
#   S3_BUCKET             — bucket name for backup storage
#   S3_ENDPOINT_URL       — endpoint URL (e.g. Backblaze B2 regional URL)
#   AWS_ACCESS_KEY_ID     — S3/B2 access key
#   AWS_SECRET_ACCESS_KEY — S3/B2 secret key
#
# Backup files are also kept locally in the backup_data Docker volume.
# To trigger a manual backup: docker exec erp-backup /backup.sh
# =============================================================================

FROM alpine:3.19

# Install: pg_dump client, Python + pip (for awscli), curl
RUN apk add --no-cache postgresql15-client python3 py3-pip curl && \
    pip3 install awscli --break-system-packages

# Copy and permission the backup script
COPY backup.sh /backup.sh
RUN chmod +x /backup.sh

# Register cron job: run backup.sh daily at 2am, log output to /var/log/backup.log
RUN echo "0 2 * * * /backup.sh >> /var/log/backup.log 2>&1" | crontab -

# Run cron in foreground (-f) with log level 2 so container stays alive
CMD ["crond", "-f", "-l", "2"]
