# Database Migration Workflow

This project uses Prisma Migrate with a multi-file schema (`apps/backend/prisma/schema`).

## Required Environment

Set both URLs in `apps/backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydatabase
SHADOW_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydatabase_shadow
```

`SHADOW_DATABASE_URL` must point to a separate database, not the same database with a different schema. This avoids shadow replay conflicts.

## One-Time Local Setup

Create the shadow database once:

```bash
createdb mydatabase_shadow
```

If `createdb` is unavailable, use:

```bash
psql -U postgres -h localhost -p 5432 -c 'CREATE DATABASE mydatabase_shadow;'
```

## Daily Commands (from repo root)

```bash
pnpm db:migrate:status
pnpm db:migrate:dev
pnpm db:migrate:check:schema
pnpm db:migrate:check:history
```

## Rules To Prevent Drift

- Never run `prisma db push` on shared/dev databases.
- Never edit old migration SQL after it is committed.
- Always create schema changes via `pnpm db:migrate:dev`.
- If drift is already present locally, use `pnpm db:migrate:reset` and re-seed.
- Keep migration files small and scoped to one logical change.

## Recovery Playbook

When Prisma reports drift:

1. Confirm this is a development database.
2. Run `pnpm db:migrate:reset`.
3. Run `pnpm db:migrate:status`.
4. Re-apply any new local schema change with `pnpm db:migrate:dev`.
5. Run backend build/tests.
