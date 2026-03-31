#!/bin/bash
# EcomSpace Analytics — PostgreSQL Restore Script
# Usage: ./scripts/restore-db.sh <backup_file>

set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup_file>"
  echo "Available backups:"
  ls -1t ./backups/ecomspace_*.dump 2>/dev/null | head -10
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# Load .env if it exists
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

POSTGRES_USER="${POSTGRES_USER:-ecomspace}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-ecomspace}"
POSTGRES_DB="${POSTGRES_DB:-ecomspace_analytics}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

echo "Restoring ${POSTGRES_DB} from ${BACKUP_FILE}..."
echo "WARNING: This will overwrite the current database!"
read -p "Continue? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 0
fi

PGPASSWORD="${POSTGRES_PASSWORD}" pg_restore \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --clean \
  --if-exists \
  "${BACKUP_FILE}"

echo "Restore complete."
