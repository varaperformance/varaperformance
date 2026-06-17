#!/bin/bash

# RBAC Seed Script
# Seeds roles and permissions into the PostgreSQL database via Docker
# 
# Usage: ./scripts/seed-rbac.sh
# 
# Prerequisites:
# - Docker Compose services running (postgres container)
# - Database migrations already applied

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SEED_FILE="$ROOT_DIR/apps/backend/prisma/seeds/seed-rbac.sql"

# Container and database configuration
CONTAINER_NAME="vp-postgres"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-mydatabase}"

echo "🔐 RBAC Seed Script"
echo "==================="
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Error: PostgreSQL container '${CONTAINER_NAME}' is not running."
    echo "   Run 'docker compose up -d postgres' first."
    exit 1
fi

# Check if seed file exists
if [ ! -f "$SEED_FILE" ]; then
    echo "❌ Error: Seed file not found at: $SEED_FILE"
    exit 1
fi

echo "📦 Container: $CONTAINER_NAME"
echo "🗄️  Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo "📄 Seed file: $SEED_FILE"
echo ""

# Execute the seed file
echo "🌱 Seeding roles and permissions..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$SEED_FILE"

echo ""
echo "✅ RBAC seed completed successfully!"
echo ""

# Show summary
echo "📊 Summary:"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT r.name as role, COUNT(rp.\"permissionId\") as permissions
FROM \"Role\" r
LEFT JOIN \"RolePermission\" rp ON r.id = rp.\"roleId\"
GROUP BY r.name
ORDER BY r.name;
"
