# API pagination: offset vs cursor (monitoring)

> **Type:** **Runbook** — run the checklist below when APM shows slow list endpoints, not a default product backlog. See [docs README — Runbooks](../README.md#runbooks).

## Current patterns

- **Offset / `skip` + `take`**: public blog lists, coaching admin lists, status incidents, and other list endpoints that use `skip` for page *n*. Fine for small *n*; cost grows for deep pages because the database must count or scan past earlier rows.
- **Cursor** (`id` or `createdAt` + `take` + `hasMore`): messaging threads, notification feeds, and other “infinite scroll” style APIs. Scales better for append-only or time-ordered data.

## What to watch (production / load tests)

- **Offset endpoints**: watch p95/p99 latency and DB time as `skip` increases (e.g. page 200 of a very large `blog` or `order` list). If degradation appears:
  - Prefer **keyset** pagination (`WHERE createdAt < :cursor` with index on `(userId, createdAt)` or similar), or
  - Cap maximum `offset` and require search/filters, or
  - Add **composite indexes** matching `WHERE` + `ORDER BY` (see `EXPLAIN ANALYZE` in staging).

- **Count queries**: `count()` for `total` + `findMany` per request doubles work; acceptable at moderate volume; for hot paths consider approximate counts, caching totals, or cursor-only responses without a global total.

## Checklist (periodic)

- [ ] Run `EXPLAIN (ANALYZE, BUFFERS)` on the slowest list queries from APM.
- [ ] Verify indexes on columns used in `where`, `orderBy`, and keyset cursors.
- [ ] For public catalog-style APIs, keep short **Cache-Control** (already on many `@Public()` GETs) to reduce repeat load.

## References in repo

- Messaging messages: `apps/backend/src/messaging/messaging.service.ts` (cursor on `before` / `createdAt`)
- Notifications: `apps/backend/src/notification/notification.service.ts`
- Blog list: `apps/backend/src/blog/blog.service.ts` (offset)
