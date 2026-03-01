#!/bin/bash

# FounderCFO Deployment Script
# Run this script to deploy the application

set -e

echo "🚀 FounderCFO Deployment Script"
echo "================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install it first."
    exit 1
fi

# Parse arguments
MODE=${1:-dev}

echo "📦 Mode: $MODE"

if [ "$MODE" == "dev" ]; then
    echo "🔧 Starting development environment..."
    
    # Start only database and redis
    docker-compose up -d db redis
    
    echo "⏳ Waiting for database to be ready..."
    sleep 5
    
    echo "✅ Database and Redis are running!"
    echo ""
    echo "Now run the following commands in separate terminals:"
    echo "  Backend:  cd apps/backend && npm run start:dev"
    echo "  Frontend: cd apps/frontend && npm run dev -- -p 3005"
    
elif [ "$MODE" == "build" ]; then
    echo "🏗️ Building Docker images..."
    docker-compose build --no-cache
    echo "✅ Build complete!"
    
elif [ "$MODE" == "prod" ]; then
    echo "🚀 Starting production environment..."
    
    # Check for required env vars
    if [ -z "$GOOGLE_CLIENT_ID" ]; then
        echo "⚠️  Warning: GOOGLE_CLIENT_ID not set. Google OAuth will not work."
    fi
    
    docker-compose up -d
    
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    echo ""
    echo "✅ FounderCFO is running!"
    echo "   Frontend: http://localhost:3005"
    echo "   Backend:  http://localhost:3000"
    echo ""
    echo "📊 View logs: docker-compose logs -f"
    
elif [ "$MODE" == "stop" ]; then
    echo "🛑 Stopping all services..."
    docker-compose down
    echo "✅ All services stopped."
    
elif [ "$MODE" == "clean" ]; then
    echo "🧹 Cleaning up..."
    docker-compose down -v --rmi local
    echo "✅ Cleanup complete."
    
else
    echo "Usage: ./deploy.sh [dev|build|prod|stop|clean]"
    echo ""
    echo "  dev   - Start database & redis only (for local development)"
    echo "  build - Build Docker images"
    echo "  prod  - Start all services in production mode"
    echo "  stop  - Stop all services"
    echo "  clean - Stop and remove all containers, volumes, and images"
fi
