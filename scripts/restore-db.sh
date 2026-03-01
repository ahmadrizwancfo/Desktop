#!/bin/bash
# FounderCFO Database Restore Script
# Usage: ./restore-db.sh /path/to/backup.sql.gz

set -e

BACKUP_FILE="$1"
DB_CONTAINER="${DB_CONTAINER:-foundercfo-db}"
DB_NAME="${DB_NAME:-foundercfo}"
DB_USER="${DB_USER:-postgres}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Example: $0 /var/backups/foundercfo/foundercfo_20260126_020000.sql.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 FounderCFO Database Restore"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Backup file: $BACKUP_FILE"
echo ""
echo "⚠️  WARNING: This will OVERWRITE the current database!"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

echo "🔄 Restoring database..."

# Check if running in Docker or local
if command -v docker &> /dev/null && docker ps | grep -q "$DB_CONTAINER"; then
    echo "🐳 Running Docker restore..."
    
    # Drop and recreate database
    docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists "$DB_NAME"
    docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$DB_NAME"
    
    # Restore
    gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" "$DB_NAME"
else
    echo "💻 Running local restore..."
    
    if [ -n "$DATABASE_URL" ]; then
        gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
    else
        dropdb -U "$DB_USER" --if-exists "$DB_NAME"
        createdb -U "$DB_USER" "$DB_NAME"
        gunzip -c "$BACKUP_FILE" | psql -U "$DB_USER" "$DB_NAME"
    fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Database restored successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
