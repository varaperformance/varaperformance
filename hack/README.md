# hack/

One-off scripts and data pipelines for seeding the database. None of these run in production — they are developer tools run manually during initial setup or when reference data needs refreshing.

---

## Go Programs

All Go programs are run with `go run` from the **repo root**. No `go.mod` is needed since they are single-file programs with no external dependencies beyond the standard library.

### `extract_foods.go`

Builds the merged `foods.jsonl` seed file by combining two food databases:

1. **USDA FoodData Central** — reads the raw CSV export in `usda_data/FoodData_Central_csv_2025-12-18/` across seven passes (food metadata, 27M+ nutrient rows, branded food info, portion sizes, measure units). Extracts foundation, SR legacy, branded, and survey FNDDS food types. Applies Atwater validation (4/4/9 kcal/g for protein/carbs/fat) to reject implausible entries and scales all macros to a per-serving basis.

2. **OpenFoodFacts** — reads `openfoodfacts-us-foods.jsonl` and merges in US products whose barcodes are not already covered by USDA. Applies the same Atwater check.

Output is written to `foods.jsonl` — one JSON object per line — which is then consumed by `seed_foods.go`.

```bash
# From repo root (uses default paths)
go run ./hack/extract_foods.go

# Custom paths
go run ./hack/extract_foods.go \
  --usda-dir hack/usda_data/FoodData_Central_csv_2025-12-18 \
  --off-jsonl hack/openfoodfacts-us-foods.jsonl \
  --output hack/foods.jsonl
```

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--usda-dir` | `hack/usda_data/FoodData_Central_csv_2025-12-18` | Path to extracted USDA CSV directory |
| `--off-jsonl` | `hack/openfoodfacts-us-foods.jsonl` | OpenFoodFacts US JSONL file |
| `--output` | `hack/foods.jsonl` | Output path for merged JSONL |
| `--progress` | `100000` | Print a progress line every N nutrient rows |

---

### `seed_foods.go`

Bulk-loads `foods.jsonl` into the `Food` table using PostgreSQL's `COPY` protocol via `psql`. Streams JSON line-by-line and converts to CSV on-the-fly so the entire dataset never needs to fit in memory. Generates a new UUIDv4 for each row.

```bash
# Uses DATABASE_URL from apps/backend/.env automatically
go run ./hack/seed_foods.go

# With explicit DB URL and a fresh start
go run ./hack/seed_foods.go \
  --db-url "postgresql://postgres:postgres@localhost:5432/mydatabase" \
  --truncate

# Validate the input file without touching the DB
go run ./hack/seed_foods.go --dry-run
```

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--input` | `hack/foods.jsonl` | Merged food JSONL to load |
| `--env-file` | `apps/backend/.env` | `.env` file to read `DATABASE_URL` from |
| `--db-url` | *(empty)* | `DATABASE_URL` override (takes priority over env) |
| `--truncate` | `false` | `TRUNCATE Food CASCADE` before loading |
| `--dry-run` | `false` | Validate input rows without writing to the DB |
| `--progress` | `50000` | Print progress every N rows |

---

### `seed_exercises.go`

Fetches the full exercise catalogue from the [ExerciseDB OSS API](https://oss.exercisedb.dev) and upserts every exercise into the database. Maps API muscle groups and equipment to the app's internal enums, infers difficulty from instruction count, and builds a slug-stable ID so re-runs are idempotent (`ON CONFLICT (slug) DO UPDATE`).

Requires `psql` in `PATH` (or at a common Homebrew location). Port-forward Postgres first when targeting a cluster.

```bash
# Port-forward first if using Kubernetes:
# kubectl port-forward -n production svc/varaperformance-postgres 5433:5432 &

go run ./hack/seed_exercises.go \
  --db-url "postgresql://postgres:postgres@localhost:5433/mydatabase"

# Preview first 5 normalized exercises without touching the DB
go run ./hack/seed_exercises.go --dry-run
```

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--db-url` | `$DATABASE_URL` | Database connection string |
| `--base-url` | `https://oss.exercisedb.dev/api/v1` | ExerciseDB API base URL |
| `--batch` | `25` | Exercises per API page (max 25) |
| `--dry-run` | `false` | Fetch and normalize without writing to the DB |

---

### `seed_recipes.go`

Fetches all recipes from [TheMealDB](https://www.themealdb.com) (free public API, no key required) by iterating a–z and seeding them into the `Recipe` and `RecipeIngredient` tables. Uses deterministic UUIDs derived from recipe and ingredient names so re-runs are idempotent. Nutritional values are approximated (50 kcal per ingredient) since TheMealDB does not provide macros.

Requires an Administrator user to already exist in the database and recipe categories to be seeded.

```bash
# Port-forward first if using Kubernetes:
# kubectl port-forward -n production svc/varaperformance-postgres 5433:5432 &

go run ./hack/seed_recipes.go \
  --db-url "postgresql://postgres:postgres@localhost:5433/mydatabase"

# Preview fetched meals without touching the DB
go run ./hack/seed_recipes.go --dry-run
```

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--db-url` | `$DATABASE_URL` | Database connection string |
| `--dry-run` | `false` | Fetch and normalize without writing to the DB |

---

## Shell Scripts

### `seed-k8s.sh`

Orchestration script that seeds a **Kubernetes-hosted** PostgreSQL database end-to-end: RBAC roles/permissions, exercises, legal documents, achievements, and optionally foods. Runs SQL seeds directly via `kubectl run` (ephemeral pods) and uses a temporary port-forward for the Go food seeder.

```bash
# Full seed against the production namespace
./hack/seed-k8s.sh

# Skip food seeding (faster, for re-running RBAC/exercises only)
./hack/seed-k8s.sh --skip-food

# Regenerate foods.jsonl from raw USDA + OFF data first
./hack/seed-k8s.sh --extract-food

# Target a different namespace
./hack/seed-k8s.sh --namespace staging
```

**Options:** `--namespace`, `--postgres-service`, `--db-user`, `--db-name`, `--skip-food`, `--extract-food`, `--truncate-food`. Run with `--help` for the full list.

---

### `seed-rbac.sh`

Seeds roles and permissions into a **local Docker Compose** PostgreSQL container (`vp-postgres`). A lighter alternative to `seed-k8s.sh` for local development. Prints a role/permission count summary on completion.

```bash
docker compose up -d postgres
./hack/seed-rbac.sh
```

---

### `cleanup-packages.sh`

Prunes old container image versions from GitHub Container Registry (GHCR), keeping the 5 most recent tagged releases per package (`varaperformance-backend`, `varaperformance-web`, `varaperformance-worker`). Also retains any untagged image layers that were built in the same minute as a kept release to avoid breaking layer references.

Requires `gh` (GitHub CLI) authenticated with `write:packages` scope.

```bash
./hack/cleanup-packages.sh
```

---

## Node.js Scripts

### `compliance/update-privacy-legal.mjs`

Syncs the Privacy Policy content from `apps/backend/prisma/seeds/seed-legal-documents.ts` into the live `LegalDocument` table, recomputing its SHA-256 hash. Run this after editing the Privacy Policy seed so the DB stays in sync without a full re-seed.

```bash
# Update local DB (reads DATABASE_URL from apps/backend/.env)
node hack/compliance/update-privacy-legal.mjs --local

# Update the Kubernetes production DB
node hack/compliance/update-privacy-legal.mjs --k8s

# Both at once (default when no flags given)
node hack/compliance/update-privacy-legal.mjs
```

---

### `local/create-blog-post.mjs`

Local-only script (gitignored) for generating blog post content via an LLM. See `local/LLMStudio.md` for setup instructions. Not intended for CI or production use.

---

## Data Files

| Path | Description |
|------|-------------|
| `usda_data/FoodData_Central_csv_2025-12-18/` | Raw USDA FoodData Central CSV export (December 2025). Required by `extract_foods.go`. Download from [fdc.nal.usda.gov](https://fdc.nal.usda.gov/download-foods). |
| `openfoodfacts-products.jsonl.gz` | Full OpenFoodFacts database dump (compressed). Source for filtering US products. |
| `openfoodfacts-us-foods.jsonl` | Pre-filtered US products from OpenFoodFacts. Fed into `extract_foods.go` as the OFF input. |
| `foods.jsonl` | Merged, normalized output of `extract_foods.go`. The direct input to `seed_foods.go`. |

All large data files are gitignored. See `.gitignore` at the repo root.

---

## Typical First-Time Setup Order

```bash
# 1. Start local services
docker compose up -d

# 2. Run backend migrations
pnpm --filter @varaperformance/backend prisma:migrate

# 3. Seed RBAC roles and permissions
./hack/seed-rbac.sh

# 4. Seed exercises (fetches from ExerciseDB OSS)
go run ./hack/seed_exercises.go

# 5. Seed recipes (fetches from TheMealDB; requires an admin user first)
go run ./hack/seed_recipes.go

# 6. Seed foods (requires foods.jsonl — either provided or generated)
#    To generate from scratch: go run ./hack/extract_foods.go
go run ./hack/seed_foods.go
```
