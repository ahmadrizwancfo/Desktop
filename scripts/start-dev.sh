#!/bin/bash

# FounderCFO - Quick Start Script (No Docker Required)
# This script starts the backend and frontend for local development

echo "🚀 Starting FounderCFO..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running!"
    echo ""
    echo "You have two options:"
    echo ""
    echo "1. Start Docker Desktop:"
    echo "   - Open Docker Desktop app from Applications"
    echo "   - Wait for it to start (whale icon in menu bar)"
    echo "   - Then run this script again"
    echo ""
    echo "2. Use SQLite (simpler, no Docker needed):"
    echo "   - Run: ./scripts/use-sqlite.sh"
    echo "   - This will reconfigure the app to use SQLite instead of PostgreSQL"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Start Docker services
echo "📦 Starting database..."
docker-compose up -d postgres redis

# Wait for database
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run migrations
echo "🔄 Running database migrations..."
cd apps/backend
npx prisma migrate deploy
npx prisma generate
cd ../..

# Start backend
echo "🔧 Starting backend..."
cd apps/backend
npm run start:dev &
BACKEND_PID=$!
cd ../..

# Wait for backend
sleep 5

# Start frontend
echo "🎨 Starting frontend..."
cd apps/frontend
npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "✅ FounderCFO is running!"
echo ""
echo "📱 Frontend: http://localhost:3001"
echo "🔌 Backend:  http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; docker-compose down; exit" INT
wait
