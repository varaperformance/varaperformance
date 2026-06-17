#!/usr/bin/env bash

set -euo pipefail

# Seed Kubernetes PostgreSQL with RBAC, exercises, legal documents, and foods.
#
# Usage:
#   ./scripts/seed-k8s.sh
#   ./scripts/seed-k8s.sh --namespace production --skip-food
#   ./scripts/seed-k8s.sh --extract-food
#
# Requirements:
# - kubectl configured for the target cluster
# - go installed (for OpenFoodFacts food seeder)
# - psql available in PATH (or set PSQL_PATH)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NAMESPACE="production"
POSTGRES_SERVICE="varaperformance-postgres"
DB_USER="postgres"
DB_NAME="mydatabase"
DB_PORT="5432"
SEED_RBAC_SQL="$ROOT_DIR/apps/backend/prisma/seeds/seed-rbac.sql"
SEED_EXERCISES_SQL="$ROOT_DIR/apps/backend/prisma/seeds/seed-exercises.sql"
SEED_LEGAL_SQL="$ROOT_DIR/apps/backend/prisma/seeds/seed-legal-documents.sql"
SEED_ACHIEVEMENTS_SQL="$ROOT_DIR/apps/backend/prisma/seeds/seed-achievements.sql"
FOOD_INPUT_JSONL="$ROOT_DIR/hack/foods.jsonl"
FOOD_SOURCE_GZIP="$ROOT_DIR/hack/openfoodfacts-products.jsonl.gz"
USDA_DIR="$ROOT_DIR/hack/usda_data/FoodData_Central_csv_2025-12-18"
OFF_JSONL="$ROOT_DIR/hack/openfoodfacts-us-foods.jsonl"
SKIP_FOOD="false"
EXTRACT_FOOD="false"
TRUNCATE_FOOD="false"

log() {
  printf '\n[%s] %s\n' "$(date +'%H:%M:%S')" "$*"
}

usage() {
  cat <<EOF
Seed cluster database with RBAC, exercises, legal docs, and foods.

Options:
  --namespace <ns>         Kubernetes namespace (default: production)
  --postgres-service <svc> Postgres service name (default: varaperformance-postgres)
  --db-user <user>         Database user (default: postgres)
  --db-name <name>         Database name (default: mydatabase)
  --skip-food              Skip food seeding
  --extract-food           Regenerate foods.jsonl from USDA CSVs + OFF JSONL
  --truncate-food          Truncate Food table before seeding (CASCADE)
  -h, --help               Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace)
      NAMESPACE="$2"
      shift 2
      ;;
    --postgres-service)
      POSTGRES_SERVICE="$2"
      shift 2
      ;;
    --db-user)
      DB_USER="$2"
      shift 2
      ;;
    --db-name)
      DB_NAME="$2"
      shift 2
      ;;
    --skip-food)
      SKIP_FOOD="true"
      shift
      ;;
    --extract-food)
      EXTRACT_FOOD="true"
      shift
      ;;
    --truncate-food)
      TRUNCATE_FOOD="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

get_table_count() {
  local table_name="$1"
  kubectl -n "$NAMESPACE" run count-check --rm -i --restart=Never \
    --image=postgres:17 \
    --command -- sh -lc "psql \"$DB_URL_CLUSTER\" -t -A -c 'select count(*) from \"${table_name}\";'" \
    2>/dev/null | tr -cd '0-9'
}

require_cmd kubectl

if [[ ! -f "$SEED_RBAC_SQL" ]]; then
  echo "Missing RBAC seed file: $SEED_RBAC_SQL"
  exit 1
fi

if [[ ! -f "$SEED_EXERCISES_SQL" ]]; then
  echo "Missing exercises seed file: $SEED_EXERCISES_SQL"
  exit 1
fi

if [[ ! -f "$SEED_LEGAL_SQL" ]]; then
  echo "Missing legal seed file: $SEED_LEGAL_SQL"
  exit 1
fi

if [[ ! -f "$SEED_ACHIEVEMENTS_SQL" ]]; then
  echo "Missing achievements seed file: $SEED_ACHIEVEMENTS_SQL"
  exit 1
fi

DB_URL_CLUSTER="postgresql://${DB_USER}:${DB_USER}@${POSTGRES_SERVICE}.${NAMESPACE}.svc.cluster.local:${DB_PORT}/${DB_NAME}"
DB_URL_LOCAL="postgresql://${DB_USER}:${DB_USER}@localhost:${DB_PORT}/${DB_NAME}"

log "Checking Kubernetes resources in namespace '$NAMESPACE'"
kubectl -n "$NAMESPACE" get svc "$POSTGRES_SERVICE" >/dev/null

log "Seeding RBAC from SQL"
kubectl -n "$NAMESPACE" run rbac-seed --rm -i --restart=Never \
  --image=postgres:17 \
  --command -- sh -lc "psql \"$DB_URL_CLUSTER\" -v ON_ERROR_STOP=1 -f -" < "$SEED_RBAC_SQL"

log "Seeding exercises from SQL"
EXERCISE_COUNT="$(get_table_count Exercise)"
if [[ "${EXERCISE_COUNT:-0}" != "0" ]]; then
  log "Skipping exercises seed (Exercise has ${EXERCISE_COUNT} rows already)"
else
  kubectl -n "$NAMESPACE" run exercises-seed --rm -i --restart=Never \
    --image=postgres:17 \
    --command -- sh -lc "psql \"$DB_URL_CLUSTER\" -v ON_ERROR_STOP=1 -f -" < "$SEED_EXERCISES_SQL"
fi

log "Seeding legal documents from SQL"
LEGAL_COUNT="$(get_table_count LegalDocument)"
if [[ "${LEGAL_COUNT:-0}" != "0" ]]; then
  log "Skipping legal seed (LegalDocument has ${LEGAL_COUNT} rows already)"
else
  kubectl -n "$NAMESPACE" run legal-seed --rm -i --restart=Never \
    --image=postgres:17 \
    --command -- sh -lc "psql \"$DB_URL_CLUSTER\" -v ON_ERROR_STOP=1 -f -" < "$SEED_LEGAL_SQL"
fi

log "Seeding achievements from SQL"
kubectl -n "$NAMESPACE" run achievements-seed --rm -i --restart=Never \
  --image=postgres:17 \
  --command -- sh -lc "psql \"$DB_URL_CLUSTER\" -v ON_ERROR_STOP=1 -f -" < "$SEED_ACHIEVEMENTS_SQL"

if [[ "$SKIP_FOOD" != "true" ]]; then
  require_cmd go

  if [[ "$EXTRACT_FOOD" == "true" ]]; then
    if [[ ! -d "$USDA_DIR" ]]; then
      echo "USDA CSV directory not found: $USDA_DIR"
      echo "Download and extract FoodData_Central_csv_2025-12-18.zip first"
      exit 1
    fi
    log "Extracting USDA + OFF foods"
    (
      cd "$ROOT_DIR"
      go run ./hack/extract_foods.go \
        --usda-dir "$USDA_DIR" \
        --off-jsonl "$OFF_JSONL" \
        --output "$FOOD_INPUT_JSONL"
    )
  fi

  if [[ ! -f "$FOOD_INPUT_JSONL" ]]; then
    echo "Food JSONL not found: $FOOD_INPUT_JSONL"
    echo "Provide it or rerun with --extract-food"
    exit 1
  fi

  PORT_FWD_PID=""
  cleanup() {
    if [[ -n "$PORT_FWD_PID" ]]; then
      kill "$PORT_FWD_PID" >/dev/null 2>&1 || true
    fi
  }
  trap cleanup EXIT

  log "Starting temporary port-forward for Postgres"
  kubectl -n "$NAMESPACE" port-forward "svc/$POSTGRES_SERVICE" "$DB_PORT:$DB_PORT" >/tmp/seed-k8s-port-forward.log 2>&1 &
  PORT_FWD_PID=$!
  sleep 3

  if ! kill -0 "$PORT_FWD_PID" >/dev/null 2>&1; then
    echo "Port-forward failed. Check /tmp/seed-k8s-port-forward.log"
    exit 1
  fi

  SEED_ARGS=(--input "$FOOD_INPUT_JSONL" --db-url "$DB_URL_LOCAL")
  if [[ "$TRUNCATE_FOOD" == "true" ]]; then
    SEED_ARGS+=(--truncate)
  fi

  log "Seeding foods with Go seeder"
  (
    cd "$ROOT_DIR"
    go run ./hack/seed_foods.go "${SEED_ARGS[@]}"
  )
fi

log "Verifying seed counts"
kubectl -n "$NAMESPACE" run verify-seed --rm -i --restart=Never \
  --image=postgres:17 \
  --command -- sh -lc \
  "psql \"$DB_URL_CLUSTER\" -c 'select count(*) as roles from \"Role\"; select count(*) as exercises from \"Exercise\"; select count(*) as legal_docs from \"LegalDocument\"; select count(*) as achievements from \"Achievement\"; select count(*) as foods from \"Food\";'"

log "Seed workflow completed"
