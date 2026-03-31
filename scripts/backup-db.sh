#!/bin/bash
# EcomSpace Analytics — PostgreSQL Backup Script
# Usage: ./scripts/backup-db.sh [backup_dir]

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/ecomspace_${TIMESTAMP}.dump"

# Load .env if it exists
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

POSTGRES_USER="${POSTGRES_USER:-ecomspace}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-ecomspace}"
POSTGRES_DB="${POSTGRES_DB:-ecomspace_analytics}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

mkdir -p "${BACKUP_DIR}"

echo "Starting backup of ${POSTGRES_DB} at ${TIMESTAMP}..."

PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  -F custom \
  -f "${BACKUP_FILE}"

echo "Backup created: ${BACKUP_FILE}"
echo "Size: $(du -sh "${BACKUP_FILE}" | cut -f1)"

# Keep only last 30 backups
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/ecomspace_*.dump 2>/dev/null | wc -l)
if [ "${BACKUP_COUNT}" -gt 30 ]; then
  echo "Cleaning up old backups (keeping last 30)..."
  ls -1t "${BACKUP_DIR}"/ecomspace_*.dump | tail -n +31 | xargs rm -f
fi

echo "Backup complete."
