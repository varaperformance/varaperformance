# Global app search (header)

Planning document for the **sticky header search** in the authenticated web shell (`apps/web/src/components/layout/app-header.tsx`). Historically this lived under `docs/integrations/`; it belongs here with other **web shell** plans.

---

## Goals

1. **Discoverability** — jump to areas of the app (and later, to specific records) without hunting the sidebar.
2. **Consistency** — one mental model (“I type here”) vs many disconnected search boxes.
3. **Safety** — respect RBAC, encryption, and HIPAA-style minimization (do not expose PHI in autocomplete snippets without explicit design).

Non-goals (initially):

- Replacing **specialized** UIs (e.g. in-conversation message search, recipe filters) where power users need rich controls.
- Public/marketing site search (different layout and SEO concerns).

---

## Current state (codebase)

| Location | Behavior |
|----------|----------|
| `app-header.tsx` | Renders `<GlobalSearch />` (`global-search-command.tsx`): command palette, **⌘K / Ctrl+K**, permission-aware static route index, recents, keyboard navigation. |
| Messages | “Search conversations…” and per-conversation “Search messages…” wired to backend. |
| Recipes | Backend search exists (`RecipesController` / `RecipesService.search`). |
| Elevate | Partner user search (`GET elevate/partners/search`). |
| Admin / IDM | User listing with `search` query (admin-scoped). |
| Food / nutrition | Food search service (`FoodSearchService`) used by food flows. |

There is still **no** single `GET /v1/search` (or equivalent) that aggregates results across domains — **Phase 0** is client-side navigation only; **Phase 1+** below adds server-backed or federated search.

---

## Recommended approach (phased)

### Phase 0 — UX shell (no new backend)

**Status:** Implemented in the web app (`apps/web/src/components/layout/global-search-command.tsx`, `global-search-nav-items.ts`; header wires `GlobalSearch` in `app-header.tsx`). Includes ⌘K / Ctrl+K, static route index with permission-aware filtering, recents in `localStorage`, and keyboard navigation in the palette.

Ship value quickly with **client-only** behavior:

- **Command palette** pattern: focus trap, `⌘K` / `Ctrl+K` to open (optional: keep inline input but open same popover).
- **Static index** of routes + labels + keywords (e.g. “steps”, “weight”, “integrations”, “food”) → `react-router` navigation on select.
- Optional: **recent pages** from `localStorage` (privacy-light).

This already matches common “global search” expectations for internal tools and avoids PHI until server search is designed.

### Phase 1 — Federated search (reuse existing APIs)

Add a thin **orchestrator** (choose one):

| Option | Pros | Cons |
|--------|------|------|
| **A. New backend `SearchModule`** with `GET /v1/search?q=&types=recipes,messages,...` | One auth boundary, consistent rate limits, can rank/merge server-side. | New service + maintenance. |
| **B. Web-only parallel calls** from a hook to existing endpoints | Faster to prototype. | Multiple round-trips, harder to throttle consistently, duplicate permission checks in client. |

**Suggested domains for v1** (subject to product priority):

1. **Recipes** — already searchable server-side.
2. **Elevate partners** — existing search (social graph, not PHI-heavy in the same way as clinical data).
3. **Navigation / help** — still include Phase 0 static results at top of list.

**Messages (cross-conversation):** Today only `GET .../conversations/:id/search` exists. **Global message search** requires a new backend capability (indexed plaintext or search-safe excerpts, conversation membership checks, throttling). Treat as **Phase 2** unless product mandates it for v1.

### Phase 2 — Sensitive and heavy domains

- **Workouts / sessions** — titles, exercise names; watch payload size and encryption (notes are sensitive).
- **Food diary entries** — tie into nutrition APIs with clear scoping.
- **Cross-conversation messaging** — design for content visibility, retention, and audit.

Each addition needs: **data classification**, **minimum necessary fields** in the API response, and **debounce + rate limits**.

---

## UX specification (summary)

1. **Trigger:** Click header input and/or `⌘K` / `Ctrl+K` (document shortcut registration; avoid conflicts in inputs—use library pattern or `cmdk`-style).
2. **Popover / modal:** Full-width on mobile; centered panel on desktop; `aria-*` for accessibility.
3. **Result groups:** e.g. “Go to…”, “Recipes”, “People” — with icons aligned to sidebar metaphors.
4. **Empty / short query:** Show recents + top static shortcuts; avoid hammering APIs for single characters (min length 2–3 for server-backed search).
5. **Loading / errors:** Skeleton rows; toast only on hard failures; do not block typing.
6. **Selection:** Enter opens first result; arrows move selection; Esc closes.

---

## Security, privacy, compliance

- **RBAC:** Reuse existing permissions per sub-query (recipes, messaging, etc.). If one domain fails authorization, omit that group—do not leak “forbidden” vs “empty”.
- **PHI / HIPAA mindset:** Weight, sleep, steps, HR are health data—**do not** add them to global search until there is an explicit design for **what** is indexed (e.g. only non-PHI labels like “Weight tracking” as navigation, not numeric values).
- **Rate limiting:** Apply `@Throttle` on any new aggregate endpoint; align with [PAGINATION.md](../backend/PAGINATION.md) patterns for limits.
- **Logging:** Avoid logging raw search strings at `info` if they may contain PII; prefer metrics (query length, latency) or hashed sampling.

---

## Engineering checklist (when implementing)

**Web (`@varaperformance/web`)**

- [ ] Extract search UI from `app-header.tsx` into e.g. `GlobalSearchCommand` + `useGlobalSearch`.
- [ ] Register keyboard shortcut; respect `prefers-reduced-motion`.
- [ ] Phase 0: static route map + router `navigate()`.
- [ ] Phase 1: TanStack Query with debounced `q`, parallel queries or single gateway client.

**Backend (if Option A)**

- [ ] New `SearchController` + `SearchService` under a clear module (e.g. `src/search/`).
- [ ] Zod DTO: `q`, optional `types[]`, `limit` per group.
- [ ] Delegate to existing services (recipes, elevate, …); no duplicate SQL in controller.
- [ ] OpenAPI / client types if the monorepo generates SDKs from OpenAPI.

**Quality**

- [ ] E2E or Playwright: open palette, select static route, land on page.
- [ ] Unit tests for merge/ranking if non-trivial.

---

## Related code references

| Area | Path / symbol |
|------|----------------|
| Header placeholder | `apps/web/src/components/layout/app-header.tsx` |
| Conversation list search | `apps/web/src/components/messaging/conversation-list.tsx` |
| Messaging page search UX | `apps/web/src/features/messaging/pages/messaging.tsx` |
| Per-conversation message search API | `apps/backend/src/messaging/messaging.controller.ts` (`GET .../search`) |
| Recipe search | `apps/backend/src/health/recipes/recipes.controller.ts` |
| Elevate user search | `apps/backend/src/elevate/elevate.controller.ts` |
| Food search | `apps/backend/libs/common/src/food-search/food-search.service.ts` |

---

## Open questions (product)

1. Should global search include **only navigation** for health sections (safest) vs **content** (recipes, messages) from day one?
2. Is **cross-conversation message search** a P0 requirement? (Drives backend scope significantly.)
3. Should **coaches vs members** see different result sets (e.g. admin-only shortcuts hidden entirely vs disabled)?
4. Mobile Capacitor: same header behavior vs native search button—see [CAPACITOR.md](../CAPACITOR.md) for shell constraints.

---

## Summary

| Phase | Scope | Backend |
|-------|--------|---------|
| **0** | Command palette + static routes + optional recents | None |
| **1** | + Recipes, Elevate (and similar safe APIs) | Optional unified endpoint or parallel calls |
| **2** | + Messages across threads, workouts, diary | New indexes and APIs per domain |

Implementing **Phase 0** removes the “dead control” feeling of the header search with minimal risk; **Phase 1** connects to capabilities you already have while keeping PHI-heavy domains out until explicitly designed.
