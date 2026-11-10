#!/bin/sh
# Levanta Postgres local (docker-compose.yml, puerto mapeado vía POSTGRES_PORT)
# y garantiza que exista la BD de tests `motivation_calendar_test`.
set -eu

POSTGRES_USER="${POSTGRES_USER:-postgres}"
CONTAINER="${POSTGRES_CONTAINER:-motivation-calendar-postgres}"

docker compose up -d postgres

echo "Esperando a Postgres..."
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -tc \
  "SELECT 1 FROM pg_database WHERE datname='motivation_calendar_test'" | grep -q 1; then
  echo "BD motivation_calendar_test ya existe."
else
  docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -c "CREATE DATABASE motivation_calendar_test"
fi
