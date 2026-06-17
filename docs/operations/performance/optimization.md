# Performance Optimization Checklist

**Open items (3):** see **Images** (logo/favicon, WebP/AVIF) and **HTTP** (Redis cache) subsections below—search for `[ ]` in this file. **Everything else in this file is done** as of audit 2026-04-22.

A short backlog summary also appears under [docs/README.md — Performance & web](./README.md#performance--web-optimizationmd).

Each line item below uses **priority** (P0–P3) and **effort** (S/M/L).

---

## Frontend — Bundle & Code Splitting

- [x] **P1 / S** — Remove unused dependencies from `apps/web/package.json`
  - Removed `@uiw/react-md-editor` (no imports in `src/`)
  - Removed `motion` (transitive dep only via `react-modal-sheet`)
  - Deleted dead Vite template files: `App.tsx`, `App.css`, `App.test.tsx`

- [x] **P1 / S** — Fix `lucide-react` full icon map import in `achievements-card.tsx`
  - Replaced `import { icons as lucideIcons }` with an explicit allowlist of ~10 achievement icons
  - Eliminates ~200 KB+ of tree-shake-defeating icon map from the dashboard chunk

- [x] **P1 / M** — Add manual chunks in `vite.config.ts` for heavy libraries not yet split
  - Added `vendor-editor` (TipTap, lowlight, highlight.js)
  - Added `vendor-dnd` (@dnd-kit)
  - Added `vendor-mapbox` (@mapbox)
  - Added `vendor-syntax` (react-syntax-highlighter)
  - Added `vendor-sheet` (react-modal-sheet)
  - Improves long-term cache stability

- [x] **P2 / M** — Lazy-load heavy sub-components within already-lazy routes
  - Blog post fenced code: `react-syntax-highlighter` moved to a lazy chunk (`blog-code-fence.tsx` + `blog-code-fence-prism.tsx`)
  - **Follow-up (optional)**: code-split the admin `BlogEditor` in `admin/blogs.tsx` (TipTap + lowlight + ~2.5k lines) into `admin/blog-editor.tsx` + `React.lazy` in the main admin blogs shell
  - **Follow-up (optional)**: Recharts in `components/ui/chart.tsx` — split by chart type or only import used primitives in each card

- [x] **P2 / S** — Audit route prefetch scope in `route-metadata.ts`
  - **Reduced** hover-prefetch set to: dashboard, admin, messages, calendar, blog, shop (dropped: integrations, recipes, food-diary, workouts, calculators)
  - `prefetchRoute` now defers the dynamic `import()` with `requestIdleCallback` (fallback `setTimeout(0)`) to avoid competing with main-thread work

---

## Frontend — Images & Static Assets

- [x] **P1 / M** — Convert `eager: true` glob to lazy in `home.tsx`
  - Changed `import.meta.glob` from `eager: true` to lazy (dynamic imports)
  - First image loads immediately, remaining images load in background
  - Eliminates multiple heavy images from the initial JS module graph

- [ ] **P1 / S** — Optimize `logo.png` (~107 KB) and `favicon.png` (~110 KB)
  - Convert logo to SVG or compressed WebP for header usage
  - Generate multi-size favicons (16/32/48 px) instead of a single large PNG

- [x] **P2 / M** — Add `loading="lazy"` and `decoding="async"` to below-fold `<img>` tags
  - Added across 37+ files: social feeds, blog cards, exercise lists, recipe cards, shop products, coach avatars, messaging images, admin panels, stories, etc.
  - Skipped above-fold images (logos, hero banners, profile covers)

- [ ] **P3 / S** — Convert static JPEG/PNG marketing images to WebP/AVIF with `<picture>` fallbacks

---

## Frontend — Data Fetching & Caching

- [x] **P0 / M** — Scope pull-to-refresh invalidation (`pull-to-refresh.tsx`)
  - Changed from `queryClient.invalidateQueries()` (all queries) to `{ type: 'active' }` (only active queries)
  - Added `queryFilters` prop so parent pages can scope invalidation to their own queries

- [x] **P1 / M** — Deduplicate notification fetching (`use-notifications.ts`)
  - Added `socketConnected` param to `useNotifications`
  - When socket is connected, disables polling (`refetchInterval: false`) and focus refetch
  - Falls back to polling only when socket is disconnected

- [x] **P1 / M** — Reduce dashboard query burst (`dashboard.tsx` data hooks)
  - `useDashboardDataGate` + `dashboardQueryCards`: once dashboard **preferences** are loaded, each query uses `enabled: gate(...)` so hidden cards do not refetch
  - First visit with no cached prefs still loads all queries (then prefs narrow subsequent visits)
  - `enabled` support added on the underlying health / workout / stack / challenge hooks used by the dashboard

- [x] **P2 / S** — Standardize query key factories
  - Converted 34 hooks files from raw string arrays to typed factory objects
  - All features now use consistent `{domain}Keys` pattern (e.g. `groceryListKeys`, `recipeKeys`, `shopKeys`)
  - Enables precise cache invalidation and prevents key typos

- [x] **P2 / S** — Add `prefetchQuery` for high-intent navigations
  - After login, `AuthProvider` calls `prefetchDashboardPreferences(queryClient)` so `/dashboard` layout prefs are often warm before navigation
  - `prefetchDashboardPreferences` and `dashboardPreferencesQueryKey` live in `use-dashboard-preferences.ts`

---

## Frontend — State & Rendering

- [x] **P1 / M** — Memoize `AuthProvider` context value (`auth-provider.tsx`)
  - Wrapped `hasRole`, `hasPermission`, `hasAnyRole`, `hasAllPermissions`, `logout`, `refresh`, `refreshPermissions` in `useCallback`
  - Wrapped context value object in `useMemo`
  - Prevents cascading re-renders of all `useAuth()` consumers

- [x] **P1 / S** — Memoize `ThemeProvider` context value (`theme-provider.tsx`)
  - Wrapped `setTheme` in `useCallback` and value in `useMemo`
  - Changed `useProfile({ enabled: true })` to `useProfile()` (respects auth state gating)

- [x] **P2 / M** — Fix socket disconnect-on-unmount for shared singletons
  - Added ref-counted `connectNotificationSocket` / `disconnectNotificationSocket`
  - Added ref-counted `connectElevateSocket` / `disconnectElevateSocket`
  - Socket only disconnects when the last consumer unmounts

---

## Backend — Database & Queries

- [x] **P1 / M** — Cap unbounded heart rate queries (`health-data.service.ts`)
  - `getHeartRate`: reduced `take` from 50,000 to 2,000 (sensible per-request cap)
  - `getHeartRateDailySummary`: added `take: 50_000` safety cap (was unbounded)

- [x] **P1 / S** — Batch consent validation (`consent.service.ts`)
  - Replaced N individual `findFirst` calls with a single `findMany` query
  - Validates all consents in memory against the batch result set

- [x] **P1 / S** — Batch consent recording (`consent.service.ts`)
  - Added bulk `findMany` to pre-fetch existing consents before the upsert loop
  - Reduces N+1 `findUnique` lookups to a single batch query
  - Encryption metadata computed once and reused across all upserts

- [x] **P2 / S** — Add `select` to notification queries (`notification.service.ts`)
  - Added explicit `select` clause to `getNotifications` (only fetches needed columns)
  - Parallelized notification list + unread count with `Promise.all`

- [x] **P2 / S** — Eliminate extra cursor lookup in messaging (`messaging.service.ts`)
  - Separated the cursor `findUnique` into its own `select: { createdAt: true }` query
  - Narrows the cursor lookup to a single column

- [x] **P3 / S** — Review notification award loop (`achievements.service.ts`)
  - Replaced sequential `for` loop with `Promise.allSettled` for parallel execution
  - Logs aggregated failure count instead of individual errors

---

## Backend — HTTP & Infrastructure

- [x] **P0 / S** — Enable response compression
  - Added `compression` middleware to `main.ts` (gzip by default)
  - Reduces JSON payload sizes by 60-80% for API responses

- [x] **P2 / S** — Add `Cache-Control` headers to public endpoints
  - Added `@Header('Cache-Control', 'public, max-age=60')` to 33 public GET endpoints
  - Covers blog, FAQ, status, exercises, release notes, spotlight, pricing, commerce, team, coaching, and profile controllers

- [ ] **P2 / M** — Add Redis caching for frequently-read public endpoints
  - Currently Redis is used for auth sessions, permission sets, and Stripe idempotency
  - Candidates: public blog list, pricing plans, FAQ list, status page, exercise library
  - Use short TTLs (30-60s) to keep data fresh

- [x] **P3 / M** — Monitor offset pagination on large tables
  - Documented in `docs/backend/PAGINATION.md` (offset vs cursor, when to watch p95, keyset/EXPLAIN, indexes, count-query notes)
  - No code change required for “monitoring” beyond this runbook; apply DB tuning when APM shows slow deep pages

---

## Build & DevEx

- [x] **P2 / S** — Add `vite-plugin-compression` or equivalent for pre-compressed assets
  - Implemented: `gzip` and `brotliCompress` in `apps/web/vite.config.ts` (emits `*.js.gz` / `*.js.br` next to build output)
  - The web production image’s `apps/web/nginx.conf` uses `gzip on` and **`gzip_static on`** so the pod serves pre-compressed **gzip** from disk. The default image has no Brotli module; `.br` files are still in `dist` for a future Brotli-capable static layer or custom image
  - If the app is only a Node process using middleware compression for static files, build-time files are **optional** (runtime gzip is already doing the job; pre-compressed still helps if you teach the static handler to prefer them)

- [x] **P3 / S** — Add bundle analysis to CI
  - `rollup-plugin-visualizer` in `apps/web/vite.config.ts` when `ANALYZE=1` (see `build:analyze` in `apps/web/package.json`); default `build` is unchanged
  - Web workflow uploads `web-bundle-report` (treemap) from `apps/web/stats.html` after each run for chunk-size review over time

- [x] **P3 / S** — Add `<link rel="preconnect">` hints in `index.html`
  - Added preconnect for `varaperformance.com` and `api.mapbox.com`
  - Added dns-prefetch fallback for Mapbox

---

## Measurement

Before and after each optimization, measure:

| Metric | Tool |
|--------|------|
| Lighthouse Performance score | Chrome DevTools / CI |
| Largest Contentful Paint (LCP) | Web Vitals |
| First Input Delay / INP | Web Vitals |
| Total bundle size (JS + CSS) | `vite build` + `rollup-plugin-visualizer` |
| API p95 response time | Backend APM / logs |
| Database query time | Prisma query logging / `EXPLAIN ANALYZE` |
| Time to Interactive (TTI) | Lighthouse |
