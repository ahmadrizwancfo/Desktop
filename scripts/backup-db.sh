#!/bin/bash
# FounderCFO Database Backup Script
# Run daily via cron: 0 2 * * * /path/to/backup-db.sh

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/foundercfo}"
DB_CONTAINER="${DB_CONTAINER:-foundercfo-db}"
DB_NAME="${DB_NAME:-foundercfo}"
DB_USER="${DB_USER:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"  # Optional: s3://your-bucket/backups

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/foundercfo_${TIMESTAMP}.sql.gz"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 FounderCFO Database Backup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🕐 Started: $(date)"
echo "📁 Backup file: $BACKUP_FILE"

# Check if running in Docker or local
if command -v docker &> /dev/null && docker ps | grep -q "$DB_CONTAINER"; then
    echo "🐳 Running Docker backup..."
    docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
    echo "💻 Running local backup..."
    # For local PostgreSQL
    if [ -n "$DATABASE_URL" ]; then
        pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
    else
        pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
    fi
fi

# Verify backup
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created successfully: $BACKUP_SIZE"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
    echo "☁️  Uploading to S3..."
    if command -v aws &> /dev/null; then
        aws s3 cp "$BACKUP_FILE" "$S3_BUCKET/$(basename $BACKUP_FILE)"
        echo "✅ Uploaded to S3"
    else
        echo "⚠️  AWS CLI not installed, skipping S3 upload"
    fi
fi

# Clean up old backups
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "foundercfo_*.sql.gz" -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/foundercfo_*.sql.gz 2>/dev/null | wc -l)
echo "📊 Remaining backups: $REMAINING"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Backup completed: $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
