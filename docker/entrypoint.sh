#!/bin/sh
set -e

echo "Waiting for Postgres to be ready..."
until nc -z postgres 5432; do
  sleep 2
done
echo "Postgres is up."

# Run Prisma migrations or push schema if none exist
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
else
  echo "No migrations found — syncing schema..."
  npx prisma db push
fi

echo "Starting NestJS application..."
exec node dist/main.js