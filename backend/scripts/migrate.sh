#!/usr/bin/env bash
# ALLOUL&Q — Alembic migration helper
# Usage:
#   ./scripts/migrate.sh up               # upgrade to head
#   ./scripts/migrate.sh down             # downgrade one
#   ./scripts/migrate.sh new "message"    # create new migration (autogenerate)
#   ./scripts/migrate.sh stamp            # stamp existing DB at baseline
#   ./scripts/migrate.sh history          # show history

set -e

cd "$(dirname "$0")/.."

case "${1:-up}" in
  up)
    alembic upgrade head
    ;;
  down)
    alembic downgrade -1
    ;;
  new)
    if [ -z "$2" ]; then
      echo "Usage: ./scripts/migrate.sh new \"migration message\""
      exit 1
    fi
    alembic revision --autogenerate -m "$2"
    ;;
  stamp)
    alembic stamp head
    ;;
  history)
    alembic history --verbose
    ;;
  current)
    alembic current
    ;;
  *)
    echo "Unknown command: $1"
    echo "Usage: ./scripts/migrate.sh {up|down|new|stamp|history|current}"
    exit 1
    ;;
esac
