#!/bin/sh

echo "Waiting for Postgres at weather-db:5432..."

while ! nc -z weather-db 5432; do
  sleep 1
done

echo "Postgres is up, running migrations..."

npx knex --knexfile ./knexfile.cjs migrate:latest

echo "Starting app..."
exec node dist/src/app.js
