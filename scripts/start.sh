#!/bin/bash
# ============================================
# Startup Script for Production
# Phase 10 Implementation
# ============================================

set -e

echo "============================================"
echo "Marketplace Order Fulfillment - Starting"
echo "============================================"
echo ""

# Wait for dependencies
echo "Waiting for database..."
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" -c '\q' 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "Database is ready!"

echo ""
echo "Waiting for Redis..."
until redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q PONG; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "Redis is ready!"

echo ""
echo "============================================"
echo "All dependencies ready. Starting API..."
echo "============================================"

# Run migrations if in production
if [ "$NODE_ENV" = "production" ]; then
    echo "Running database migrations..."
    npm run migration:run
    echo "Migrations complete."
fi

# Start the application
exec npm run start