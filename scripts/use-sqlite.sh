#!/bin/bash

# Switch from PostgreSQL to SQLite (No Docker needed)

echo "🔄 Switching to SQLite database..."

# Backup current .env
cp apps/backend/.env apps/backend/.env.postgres.backup
echo "✅ Backed up PostgreSQL config to .env.postgres.backup"

# Update DATABASE_URL to SQLite
sed -i '' 's|DATABASE_URL=.*|DATABASE_URL="file:./dev.db"|' apps/backend/.env
echo "✅ Updated DATABASE_URL to SQLite"

# Run migrations
echo "🔄 Running SQLite migrations..."
cd apps/backend
npx prisma migrate dev --name switch_to_sqlite
npx prisma generate
cd ../..

echo ""
echo "✅ Successfully switched to SQLite!"
echo ""
echo "You can now run the app without Docker:"
echo "  cd apps/backend && npm run start:dev"
echo ""
echo "To switch back to PostgreSQL later:"
echo "  cp apps/backend/.env.postgres.backup apps/backend/.env"
echo ""
