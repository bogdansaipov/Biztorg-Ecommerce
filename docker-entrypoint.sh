#!/bin/sh
set -e

echo "Waiting for database..."
sleep 5

# REMOVED — we run push manually now
echo "Running Drizzle migrations..."
pnpm drizzle:push --force

echo "Starting application..."
exec node dist/src/main.js