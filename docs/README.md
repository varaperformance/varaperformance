# Documentation hub (`docs/`)

This folder holds **reference** (how the system works today), **planning** (what to build next), **compliance** (legal and privacy backlog), and **runbooks** (do this when…). It is **not** API reference generated from code; for that, use the NestJS OpenAPI surface and in-repo types.

**Start here**

1. **Open engineering / product work** → [Outstanding work](#outstanding-work) (single list; details live in linked files).
2. **Compliance and privacy** → [compliance/gdpr/overview.md](./compliance/gdpr/overview.md) (includes [what is still remaining](./compliance/gdpr/overview.md#what-is-still-remaining)) and [compliance/](./compliance/README.md).
3. **Backend behavior** → [development/backend/README.md](./development/backend/README.md).
4. **Web client** → [development/frontend/README.md](./development/frontend/README.md).

---

## How this tree is organized

| Kind | Meaning | Examples |
|------|---------|----------|
| **Reference** | Describes current architecture and conventions. | `development/backend/security/permissions.md`, `development/frontend/authentication.md` |
| **Planning** | Specs and phased plans; may contain unchecked work. | `domains/workout-log.md`, `integrations/fitness-platforms/google-fit.md` |
| **Compliance / legal** | GDPR, subprocessors, ROPA drafts; not the product roadmap. | `compliance/gdpr/overview.md`, `compliance/*` |
| **Runbook** | Steps for operators or developers when something breaks or is slow. | `development/backend/database/pagination.md`, `development/backend/database/migrations.md` |
| **Status / audit** | Checklists with done vs open; may lag the code briefly. | `operations/security/audit.md`, `operations/performance/optimization.md` |

Subfolders **avoid dumping everything at repo root**: `development/`, `operations/`, `compliance/`, `integrations/`, `domains/` each have a short **README** index where one exists.

### Keeping docs accurate (maintenance)

1. **When you change behavior** (API fields, Capacitor plugins, env vars), update the **smallest** doc that describes that surface—do not rely only on this README.
2. **Planning docs** (`WORKOUTLOG.md`, `PLAN.md`, `integrations/*.md`) may retain historical sections; add a **Status** line at the top when reality diverges from narrative.
3. **Cross-check** claims against code: e.g. `formatSessionResponse`, `package.json` plugin lists, `NotificationController` routes.
4. **Delete or archive** a doc only when nothing links to it; update [Changelog (docs)](#changelog-docs) when you remove or substantially merge files.

---

## Full documentation map

### Hub and roadmap

| Path | Kind | Description |
|------|------|-------------|
| **This file** (`README.md`) | Hub | Index, outstanding work, changelog. |
| [ROADMAP.md](./ROADMAP.md) | Product | Shipped areas + backlog; links to deeper specs. |
| [PLAN.md](./PLAN.md) | Historical / health | HealthKit / Health Connect / P0–P4; note at top for what is still live vs legacy checklist. |

### Compliance and privacy

| Path | Kind | Description |
|------|------|-------------|
| [compliance/gdpr/overview.md](./compliance/gdpr/overview.md) | Compliance | GDPR gap analysis; **[what is still remaining](./compliance/gdpr/overview.md#what-is-still-remaining)** is authoritative for open items. |
| [compliance/README.md](./compliance/README.md) | Index | Compliance documentation index. |
| [compliance/gdpr/sub-processors.md](./compliance/gdpr/sub-processors.md) | Reference | Sub-processor register (internal). |
| [compliance/gdpr/data-residency.md](./compliance/gdpr/data-residency.md) | Reference | Residency template (fill per env). |
| [compliance/gdpr/record-of-processing-activities.md](./compliance/gdpr/record-of-processing-activities.md) | Draft | Art. 30 ROPA + lawful basis sketch (legal review). |

### Security and quality gates

| Path | Kind | Description |
|------|------|-------------|
| [operations/security/audit.md](./operations/security/audit.md) | Status | Security findings; remaining ops/CI items. |

### Backend (`docs/development/backend/`)

See **[development/backend/README.md](./development/backend/README.md)** for backend architecture, authentication, database, security, and services documentation.

### Web (`docs/development/frontend/`)

See **[development/frontend/README.md](./development/frontend/README.md)** for frontend authentication, features, security, and global search documentation.

### Worker (`docs/operations/worker/`)

See **[operations/worker/README.md](./operations/worker/README.md)** → [queues.md](./operations/worker/queues.md).

### Third-party health integrations (`docs/integrations/`)

See **[integrations/README.md](./integrations/README.md)** and **[integrations/fitness-platforms/README.md](./integrations/fitness-platforms/README.md)** — Google Fit, Garmin, WHOOP, Withings; links to PLAN P5.

### Mobile and native shell

| Path | Kind | Description |
|------|------|-------------|
| [development/mobile/capacitor.md](./development/mobile/capacitor.md) | Reference + gaps | Capacitor config, plugins, **open** push/APNs/FCM work. |
| [development/mobile/cross-platform/performance.md](./development/mobile/cross-platform/performance.md) | Planning | Native UX polish (tabs, sheets, gestures); complements Capacitor. |

### Product specs and performance

| Path | Kind | Description |
|------|------|-------------|
| [domains/workout-log.md](./domains/workout-log.md) | Planning | Workout log + imported session parity. |
| [operations/performance/optimization.md](./operations/performance/optimization.md) | Status | Web/backend performance checklist. |

---

## Outstanding work

**Single list of what is *not* done** (product, engineering, and compliance). Details stay in the linked files.

### Product (roadmap)

- Third-party health: **Google Fit**, **Garmin Connect**, **Withings** — **[integrations/fitness-platforms/README.md](./integrations/fitness-platforms/README.md)**. (**WHOOP** and others remain in [PLAN.md P5](./PLAN.md#p5--third-party-wearable-apis-server-side) until individual docs exist.)
- **Coach** visibility: client step / sleep / **heart-rate** trends (overlaps [development/mobile/capacitor.md](./development/mobile/capacitor.md)).
- **Workout experience**: in-app session timer, rest timer, haptics, auto-advance sets.
- **Push notifications** (FCM, APNs, Capacitor, device tokens, quiet hours) — [development/mobile/capacitor.md](./development/mobile/capacitor.md) and [ROADMAP.md](./ROADMAP.md).
- **AI coach** chat assistant (consent-gated, rate-limited).
- **Data import**: MyFitnessPal / Strong / Hevy style CSV-JSON importers.
- **Community** forums / Q&A (threads, moderation, search).

*Source: [ROADMAP.md](./ROADMAP.md) — [Not done yet](./ROADMAP.md#not-done-yet-backlog).*

### Performance & web ([operations/performance/optimization.md](./operations/performance/optimization.md))

- [ ] Shrink `logo` / `favicon` assets (or WebP/SVG).
- [ ] Optional: marketing images as WebP/AVIF with `<picture>`.
- [ ] Optional: Redis cache for hot **public** GET endpoints (short TTL).

### Health plan leftovers ([PLAN.md](./PLAN.md))

- [ ] Android `health_permissions.xml` (Health Connect types).
- [ ] Weekly report **email** section for steps (template).
- [ ] **Coach** client detail: include step summary (related to coach visibility above).
- **P5** (future): wearable OAuth stacks (Garmin, WHOOP, Fitbit, Oura, Withings) and shared `integrations/health` module.

### Mobile / native

*Details:* [development/mobile/capacitor.md](./development/mobile/capacitor.md).

- [ ] Push notifications (plugin, backend registration, deep links, badge).
- [ ] iOS: APNs, optional App Groups / extension; Android: FCM, channels.
- [ ] `server.url` for dev live reload (optional).
- [ ] Coach: client **step** trends in client detail (duplicate theme with roadmap).

### Security & operations

*Details:* [operations/security/audit.md](./operations/security/audit.md).

- [ ] **Rotate** secrets after externalizing to env (operational).
- [ ] `pnpm audit --audit-level=high` in **CI** (hardening).

### Compliance (GDPR)

*Details:* [compliance/gdpr/overview.md](./compliance/gdpr/overview.md).

- **What is still open:** [What is still remaining](./compliance/gdpr/overview.md#what-is-still-remaining) (breach §7, residency + optional EU hosting §13, ROPA / lawful basis §11–§14, executed DPAs §9).
- **Internal drafts (private repo):** [compliance/](./compliance/README.md) — not a substitute for **published** legal pages.

### Runbooks

- [development/backend/database/pagination.md](./development/backend/database/pagination.md) — slow list endpoints (EXPLAIN, indexes, `Cache-Control`).

---

## Changelog (docs)

- **2026-04-29 (major reorg)** — Complete documentation reorganization into audience-based structure: `development/`, `operations/`, `compliance/`, `integrations/`, `domains/`. Backend docs moved to `development/backend/` with subcategories for database, security, and services. Web docs moved to `development/frontend/`. Mobile docs consolidated in `development/mobile/`. Operations docs moved to `operations/` with performance and security subcategories. Compliance docs reorganized under `compliance/gdpr/` and `compliance/audit/`. Integration docs moved to `integrations/fitness-platforms/`. Domain-specific docs moved to `domains/`. All internal links updated to new structure. Created README.md files for all new directories.
- **2026-04-22 (accuracy pass)** — [WORKOUTLOG.md](./domains/workout-log.md) status aligned with `formatSessionResponse` / import fields. [global-app-search.md](./development/frontend/global-app-search.md) “current state” aligned with `GlobalSearch`. [development/mobile/capacitor.md](./development/mobile/capacitor.md): plugin table (+ health, local notifications, badge), push endpoint clarified, biometric “Why” text fixed. [ROADMAP.md](./ROADMAP.md) wearables list matches integrations. [development/backend/security/compliance.md](./development/backend/security/compliance.md) links ENCRYPTION. Hub: maintenance notes for keeping docs in sync with code.
- **2026-04-22 (reorg)** — Documentation map and folder READMEs (`backend/`, `web/`, `worker/`). Moved [global-app-search](./development/frontend/global-app-search.md) from `integrations/` to `web/`. Removed **QUESTIONS.md** (all items were resolved; pointers merged into this hub). [integrations/README.md](./integrations/README.md) now health-only cross-links.
- **2026-04-22** — Added [integrations/](./integrations/README.md) (Google Fit, Garmin, Withings planning).
- **2026-04-22** — Added this index, consolidated “what’s left,” and trimmed redundant completed checklists in [ROADMAP.md](./ROADMAP.md).
