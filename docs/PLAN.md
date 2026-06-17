# Health Data Integration Plan

**Status (2026-04-23):** P0–P4 are **largely implemented** in code. **Remaining** items: Android `health_permissions.xml`, a few **weekly report / coach** polish lines, and the **per-provider** items in P5. P5 is now **partially started**: Withings V1 (OAuth + weight/body-comp sync) is complete, and the **Backend Integration Infrastructure** is implemented (shared `HealthProvider` interface, `HealthTokenService`, `HealthSyncService`, `health.sync` RabbitMQ queue, `ProviderRateLimiter`, `HealthDataImport` audit model). Strava and Withings both use the new shared abstractions and are auto-synced hourly. A consolidated **[Outstanding work](./README.md#outstanding-work)** list lives in [`docs/README.md`](./README.md).

This document is kept as a **historical** step-by-step record; do not treat every `[x]` as something you must redo—treat **unchecked** lines as the real backlog (plus P5).

---

Original scope: HealthKit / Health Connect integration (CAPACITOR), daily step tracking, and wearable integrations (ROADMAP).

---

## P0 — Consent & Permissions (ship first, blocks everything)

### Consent Infrastructure

- [x] Add `HEALTH_DATA_CONSENT` to Prisma `ConsentType` enum (`consent.prisma`)
- [x] Add `HEALTH_DATA_CONSENT` to Zod `ConsentTypeSchema` (`packages/core/src/schemas/consent.schema.ts`)
- [x] Create legal document record — "Health Data Sharing Agreement" (version `1.0`)
- [x] Run `prisma migrate dev` for the enum addition
- [x] Rebuild `@varaperformance/core` after schema change

### iOS Permissions

- [x] Add `NSHealthShareUsageDescription` to `Info.plist` ("Vara Performance reads your health data to track steps, workouts, and recovery")
- [x] Add `NSHealthUpdateUsageDescription` to `Info.plist` ("Vara Performance writes workout sessions to Apple Health")
- [x] Enable HealthKit capability in Xcode project (Signing & Capabilities → + HealthKit)
- [x] Add HealthKit entitlement to `App.entitlements`

### Android Permissions

- [x] Declare Health Connect permissions in `AndroidManifest.xml` (`android.permission.health.READ_STEPS`, `READ_HEART_RATE`, `READ_SLEEP`, `WRITE_EXERCISE`)
- [x] Add `intent-filter` for `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`
- [ ] Create `health_permissions.xml` resource listing requested data types (Android Health Connect)

---

## P1 — Plugin Setup & Native Step Reading

### Capacitor Plugin

- [x] Install `@capgo/capacitor-health` in `apps/web` (unified — wraps Apple HealthKit + Health Connect)
- [x] ~~Install `@nicehash/capacitor-health-connect`~~ — covered by `@capgo/capacitor-health`
- [x] `npx cap sync` after install / when native deps change (standard `pnpm run build:cap` or `cap sync` from `apps/web`)
- [x] Create `apps/web/src/lib/health-data.ts` — platform-abstraction layer:
  - [x] `requestHealthPermissions()` — requests read/write for steps, workouts, sleep, weight, heart rate
  - [x] `isHealthAvailable()` — checks if HealthKit / Health Connect is available on device
  - [x] `hasHealthPermissions()` — checks current authorization status
  - [x] `readTodaySteps(): Promise<number>` — reads cumulative step count for today
  - [x] `readSteps(from, to): Promise<{ date: string; steps: number }[]>` — daily step totals for a range
  - [x] `readSleepSessions(from, to)` — sleep session data
  - [x] `readHeartRateSamples(from, to)` — heart rate data points
  - [x] `writeWorkoutSession(session)` — exports a Vara workout to Apple Health / Health Connect
  - [x] Platform-branching via `Capacitor.getPlatform()` — returns no-ops for `'web'`

### Consent-Gated Onboarding

- [x] Add health data consent prompt in integrations page (reuse existing consent dialog pattern from AI features)
- [x] On consent grant → call `requestHealthPermissions()` → store consent in backend
- [x] On consent revoke → stop syncing, show re-consent dialog if user tries to access health features
- [x] Guard all health data reads behind `isHealthAvailable() && hasHealthPermissions()`

---

## P2 — Step Tracking (Backend + Frontend)

### Backend — Prisma Model

- [x] Create `StepLog` model in `apps/backend/prisma/schema/health-data.prisma` (moved from `lifestyle.prisma` — co-located with `SleepLog`, `HeartRateLog`, `HealthSyncLog`):
  - `@@unique([userId, date, source])` — tracks per-source (Apple Health vs manual) instead of per-date
  - Added `SleepLog`, `HeartRateLog`, `HealthSyncLog` models in the same file (P4 sleep/HR backend done early)
- [x] Add `stepLogs`, `sleepLogs`, `heartRateLogs`, `healthSyncLogs` relations to `User` model
- [x] Health data Prisma models + migrations (e.g. `add_health_data_tables`, follow-ups like HealthKit id uniqueness—see `apps/backend/prisma/migrations/`)

### Backend — Zod Schemas (`packages/core`)

- [x] `LogStepsSchema` — `{ date, steps (0–200k), source? }`
- [x] `StepLogResponseSchema` — `{ id, date, steps, source, createdAt }`
- [x] `StepTrendQuerySchema` — `{ from, to }`
- [x] `LogSleepSchema`, `SleepLogResponseSchema`, `SleepTrendQuerySchema` (P4 sleep schemas done early)
- [x] `LogHeartRateSchema`, `LogHeartRateBatchSchema`, `HeartRateLogResponseSchema`, `HeartRateQuerySchema` (P4 HR schemas done early)
- [x] `SyncHealthDataSchema` — bulk sync payload (steps + sleep + HR + source)
- [x] `HealthSyncStatusResponseSchema`, `StepsTodayResponseSchema`, `HealthLogParamsSchema`
- [x] Export all types from `packages/core` (`health-data.schema.ts`)

### Backend — Endpoints (HealthDataController)

> Endpoints landed at `/v1/health-data/*` in a dedicated `HealthDataModule` instead of extending `LifestyleController`. This keeps health-sync concerns separate from lifestyle goals.

- [x] `POST /health-data/steps` — upsert daily step count (idempotent on `userId + date + source`)
- [x] `GET /health-data/steps?from=&to=` — return daily step totals in range (aggregated across sources)
- [x] `GET /health-data/steps/today` — shorthand for today's count (returns `{ steps, goal, percent }`)
- [x] `DELETE /health-data/steps/:id` — delete a step entry
- [x] `POST /health-data/sleep` — upsert sleep session (P4 done early)
- [x] `GET /health-data/sleep?from=&to=` — sleep trend (P4 done early)
- [x] `POST /health-data/heart-rate` — batch insert HR samples (P4 done early)
- [x] `GET /health-data/heart-rate?from=&to=` — query HR samples (P4 done early)
- [x] `POST /health-data/sync` — bulk sync from mobile (steps + sleep + HR in one call)
- [x] `GET /health-data/sync/status` — last sync timestamps per data type
- [x] DTOs via `createZodDto` from the Zod schemas above
- [x] Permission: `health:read` for GET, `health:update` for POST, `health:delete` for DELETE
- [x] Input validation via global `ZodValidationPipe`

### Frontend — Auto-Sync on App Open/Resume

- [x] Created `apps/web/src/lib/health-sync.ts` with `syncHealthToBackend()`:
  - Reads last 7 days of steps, sleep, and heart rate from HealthKit / Health Connect
  - POSTs to `POST /health-data/sync` with `source: 'APPLE_HEALTH'` or `'GOOGLE_FIT'`
  - Broader than original plan — syncs all health data, not just today's steps
- [x] Call `syncHealthToBackend()` in `main.tsx` app launch block (after biometric check)
- [x] Call `syncHealthToBackend()` in `appStateChange` handler on resume (after `clearBadge()`)
- [x] Guard behind `isNativeApp() && hasHealthPermissions() && source !== 'MANUAL'`

### Frontend — Manual Step Entry (Dedicated Page)

- [x] Created dedicated `/steps` page (`features/health/pages/health/steps/steps.tsx`) following weight/water page pattern
- [x] Progress ring card with daily step count vs goal
- [x] Quick-add buttons (1,000 / 2,500 / 5,000 / 10,000) + custom amount dialog
- [x] 7-day trend view with color-coded progress bars per day
- [x] Weekly summary stats: daily average, goal days, streak
- [x] Step goal settings dialog (presets: 5k–15k) updating `LifestyleGoal.dailySteps`
- [x] Date navigation (prev/next day) with timezone-aware formatting
- [x] Calls `POST /health-data/steps` with `source: 'MANUAL'`
- [x] Lazy import + route at `/steps`

### Frontend — TanStack Query Hooks

- [x] `useStepsToday()` — `GET /health-data/steps/today`, 60s stale time
- [x] `useStepsTrend(from, to)` — `GET /health-data/steps?from=&to=`, 5min stale time
- [x] `useLogSteps()` — mutation for `POST /health-data/steps`, invalidates steps queries
- [x] `useDeleteStepLog()` — mutation for `DELETE /health-data/steps/:id`
- [x] `useSleepTrend()`, `useLogSleep()` — sleep hooks (P4 done early)
- [x] `useHeartRate()`, `useLogHeartRate()` — heart rate hooks (P4 done early)
- [x] `useSyncHealthData()` — bulk sync mutation
- [x] `useSyncStatus()` — sync status query
- [x] Export all from `@/features/health` barrel (`use-health-data.ts`)

---

## P3 — Dashboard & Weekly Report

### Dashboard — Steps Goal Card

- [x] Add `'goal-steps'` to `DASHBOARD_CARD_IDS` in `packages/core/src/schemas/dashboard.schema.ts`
- [x] Add `'goal-steps': 'Steps Goal'` to `CARD_DISPLAY_NAMES` in `card-registry.ts`
- [x] Create `GoalStepsCard` component — circular progress ring showing `steps / dailySteps` goal
- [x] Show numeric step count and percent via `GoalWidget` pattern
- [x] Insert in Row 2 alongside other goal cards

### Dashboard — Step Trend Chart

- [x] Weekly bar chart — 7 daily bars with a horizontal goal line at `dailySteps`
- [x] Bars color-coded: green (≥ goal), amber (≥ 70%), red (< 70%)
- [x] `StepTrendCard` using Recharts `BarChart` with `ReferenceLine` for goal
- [x] Added as standalone `step-trend` card in dashboard

### Weekly Report

- [x] Add `avgDailySteps: number | null` and `stepGoalDaysHit: number` to `WeeklyReportData` interface (`packages/core`)
- [x] Backend: compute avg steps and goal-met days in weekly report generation (`getStepStats` in both backend and worker)
- [ ] Email template: add steps section (avg steps, goal days, trend sparkline if feasible)
- [x] In-app report card: add steps rows (Avg Daily Steps + Step Goal Days with `Footprints` icon)
- [ ] Coach client detail: include step data in client weekly summary

### Lifestyle Insights Integration

- [x] Add `stepsDays: number` and `stepsTarget: number` (goal days per week) to `LifestyleInsightsWeekSummary`
- [x] Add `stepCount: number` and `sleepHours: number` to `LifestyleTrendPoint`
- [x] Backend: factor step logging into `adherenceScore` calculation (steps met = +20 adherence points)
- [x] Backend: factor sleep hours into `recoveryScore` calculation (up to 20 points from sleep)
- [x] Updated `createWeekSummary` to track stepsDays

---

## P4 — Bidirectional Sync (Workouts, Weight, Sleep, Water)

### Write Vara Workouts → HealthKit / Health Connect

- [x] After workout session completion, call `writeWorkoutSession()` via `useEndSession` hook
- [x] Writes active calories via `Health.saveSample({ dataType: 'calories' })`
- [x] Include duration (estimated 6 cal/min), start/end timestamps
- [x] Guard behind health permissions check in `writeWorkoutSession()`
- [x] Deduplicate: store `healthKitId` on `WorkoutSession` to avoid re-exporting

### Read HealthKit / Health Connect Workouts → Vara

- [x] Import on sync: `readWorkouts()` reads workouts since last sync (7-day window)
- [x] Backend deduplicates by source + startedAt before creating `WorkoutSession`
- [x] Extended `SyncHealthDataSchema` with `workouts` array
- [x] Extended `health-sync.ts` to read and post workouts
- [x] Map HealthKit workout types → Vara exercise categories (currently uses workout name)
- [x] Show imported workouts in workout history with source badge

### Weight Sync

- [x] Read weight samples from HealthKit / Health Connect via `readWeightSamples()`
- [x] Backend upserts into `WeightLog` (dedup by userId + loggedAt at noon)
- [x] Extended `SyncHealthDataSchema` with `weight` array and `weightUpserted` response
- [x] Write Vara weight entries to HealthKit / Health Connect (opt-in toggle)
- [x] Encrypted storage: weight logs use AES-256-GCM — imported data follows same pattern

### Water Intake Sync

- [x] Read hydration data from HealthKit / Health Connect via `readWaterSamples()`
- [x] Backend creates `WaterLog` entries from synced data
- [x] Extended `SyncHealthDataSchema` with `water` array and `waterUpserted` response
- [x] Write Vara water logs back (opt-in toggle)

### Sleep Data

- [x] Read sleep analysis sessions from HealthKit / Health Connect (via `readSleepSessions()` in `health-data.ts`)
- [x] Store in `SleepLog` model (userId, date, startTime, endTime, duration, source) — in `health-data.prisma`
- [x] Backend endpoints: `POST /health-data/sleep`, `GET /health-data/sleep?from=&to=`
- [x] Frontend hooks: `useSleepTrend()`, `useLogSleep()`
- [x] Auto-sync from device via `syncHealthToBackend()` (last 7 days)
- [x] Display in Sleep & Recovery dashboard card (shows adherence + recovery trend with sleep in score)
- [x] Add to `LifestyleTrendPoint` as `sleepHours`
- [x] Feed into recovery score calculation (up to 20 points from sleep)

### Heart Rate

- [x] Read heart rate samples from HealthKit / Health Connect (via `readHeartRateSamples()` in `health-data.ts`)
- [x] Store in `HeartRateLog` model (userId, timestamp, bpm, source) — in `health-data.prisma`
- [x] Backend endpoints: `POST /health-data/heart-rate` (batch), `GET /health-data/heart-rate?from=&to=`
- [x] Frontend hooks: `useHeartRate()`, `useLogHeartRate()`
- [x] Auto-sync from device via `syncHealthToBackend()` (last 7 days)
- [x] Display in Heart Rate dashboard card (daily resting + avg BPM bar chart with 7-day data)
- [x] Use for recovery score calculation (factored via sleep + workout intensity)

### Sync Settings

- [x] Sync Now button in Studio → Health Sync card (native only, guarded behind health consent)
- [x] Last sync timestamps displayed per source
- [x] Per-metric toggle UI in integrations page: steps, workouts, weight, water, sleep, heart rate
- [x] Per-direction toggle: read from device, write to device
- [x] Store preferences in backend (new `HealthSyncPreferences` model or JSON column)
- [x] Default: read-only for all metrics, write off

### Background Sync

- [x] iOS: `UIBackgroundModes: fetch, processing` in Info.plist enables Background App Refresh
- [x] Android: `@capacitor/background-runner` configured with 15-min interval in capacitor.config.ts
- [x] Background runner script (`public/background-runner.js`) pings sync-status endpoint
- [x] Foreground sync on app open + resume via `appStateChange` handler in main.tsx
- [x] `syncHealthToBackend()` returns result for sync settings UI feedback

---

## P5 — Third-Party Wearable APIs (Server-Side)

**Deeper plans** for **Google Fit**, **WHOOP**, **Garmin**, and **Withings** live in **[integrations/](./integrations/README.md)** (per-provider docs, phases, and shared backend checklist).

### Garmin Connect

- [ ] OAuth 1.0a integration (Garmin uses OAuth 1.0a, not 2.0)
- [ ] Register webhook for daily summary push (steps, sleep, activities)
- [ ] Map Garmin activity types → Vara exercise categories
- [ ] Import: daily steps, sleep, heart rate, workouts
- [ ] Store `garminUserId` + OAuth tokens (encrypted via `EncryptionService`)

### WHOOP

- [ ] OAuth 2.0 integration
- [ ] Read: strain, recovery, sleep performance
- [ ] Map WHOOP strain → Vara recovery score component
- [ ] Webhook registration for real-time data push
- [ ] Store encrypted tokens

### Fitbit

- [ ] Already in integrations page as "coming soon"
- [ ] OAuth 2.0 integration
- [ ] Read: steps, sleep stages, heart rate, workouts
- [ ] Daily summary webhook
- [ ] Store encrypted tokens

### Oura Ring

- [ ] OAuth 2.0 integration
- [ ] Read: sleep quality, readiness, activity
- [ ] Map Oura readiness → recovery score
- [ ] Webhook for daily summary
- [ ] Store encrypted tokens

### Withings (V1 complete)

- [x] OAuth 2.0 integration (`POST /v1/integrations/withings/connect`, `GET /v1/integrations/withings/callback`)
- [x] Core lifecycle endpoints: status / sync / disconnect (`GET /status`, `POST /sync`, `DELETE /v1/integrations/withings`)
- [x] Read: weight + body composition (body fat, muscle mass) and map to existing `WeightLog` flow (`source: WITHINGS`)
- [x] Encrypted token storage + refresh through `KeyStore` + `EncryptionService` (now via shared `HealthTokenService`)
- [x] Initial backfill-style sync path (`WITHINGS_HISTORY_DAYS`) and dedup via seen measure group IDs
- [x] Hourly auto-sync via worker `HealthSyncSchedulerService` (alongside Strava)

**Withings V2+ (optional expansion, not blocking P5 foundation):**
- [ ] Expand ingestion beyond current scope: sleep / blood pressure / HR (if enabled in product scope)
- [ ] Webhook notification subscription (Withings Notify API)

### Backend Integration Infrastructure (complete)

- [x] Create `apps/backend/src/integrations/health/` module with shared `HealthProvider` interface (`health-provider.interface.ts`)
- [x] `HealthTokenService` — unified encrypted `KeyStore` read/write, OAuth state (nonce) management, and token refresh with immediate persistence (`health-token.service.ts`)
- [x] `HealthSyncService` — provider registry, `syncUser()` / `syncAllUsers()` orchestration with `HealthDataImport` recording and audit logging (`health-sync.service.ts`)
- [x] Worker queue: `health.sync` + `health.sync.dlq` RabbitMQ queues, `HealthSyncConsumer` in worker, `HealthSyncQueueService` dispatcher in backend
- [x] `HealthSyncSchedulerService` — hourly cron in worker syncs all providers (Strava + Withings), replaces old Strava-only cron
- [x] `ProviderRateLimiter` — in-memory sliding-window rate limiter with per-provider quotas (Strava, Withings, WHOOP, Garmin) + `withBackoff()` exponential retry helper
- [x] `HealthDataImport` Prisma model — records every sync (imported/skipped/failed counts, duration, errors); `DATA_IMPORT` added to `AuditAction` enum
- [x] Strava and Withings refactored to implement `HealthProvider` interface and use shared `HealthTokenService` (removed ~90 lines of duplicated keystore/OAuth code per service)
- [x] Internal endpoint `POST /v1/integrations/health/internal/sync-all` for worker-to-backend sync dispatch
- [x] `HealthSyncMessageSchema` Zod schema in `@varaperformance/core` for queue message validation
- [x] Prisma migration `add_health_data_import_and_audit_action` applied

**Key files:**
- `apps/backend/src/integrations/health/` — `health-provider.interface.ts`, `health-token.service.ts`, `health-sync.service.ts`, `health-sync-queue.service.ts`, `health-sync-queue.module.ts`, `health-internal.controller.ts`, `provider-rate-limiter.ts`, `health.module.ts`
- `apps/worker/src/health-sync/` — `health-sync.consumer.ts`, `health-sync-scheduler.service.ts`, `health-sync.module.ts`
- `packages/core/src/schemas/health-sync-message.schema.ts`
- `apps/backend/prisma/schema/health-import.prisma`

---

## Dependencies & Ordering

```
P0 (Consent & Permissions)
 └─► P1 (Plugin + Native Step Reading)
      └─► P2 (Step Backend + Frontend + Auto-Sync)
           └─► P3 (Dashboard Cards + Weekly Report)
                └─► P4 (Bidirectional Sync — all metrics)
                     └─► P5 (Third-Party APIs — server-side)
```

**P0–P2 can ship as a single milestone** — gives users step tracking on iOS/Android.
**P3 ships immediately after** — dashboard visibility for the data collected in P2.
**P4 is independent per metric** — weight sync, workout export, sleep, etc. can ship incrementally.
**P5 items are independent of each other** — each wearable API can ship separately.

## Existing Infrastructure to Leverage

| What | Where | Reuse |
|------|-------|-------|
| `WorkoutSessionSource` enum | `workouts.prisma` / `workout.schema.ts` | Already has `APPLE_HEALTH`, `GOOGLE_FIT`, etc. — use as `StepLog.source` |
| `LifestyleGoal.dailySteps` | `lifestyle.prisma` / `lifestyle.schema.ts` | Step goal target already exists |
| `LifestyleInsights` | `lifestyle.service.ts` | Adherence scoring to extend with step data |
| Consent system | `consent.prisma` / `consent.schema.ts` | Add `HEALTH_DATA_CONSENT` type |
| AI consent UI pattern | `studio.tsx` / auth hooks | Reuse for health data consent dialog |
| `EncryptionService` | `@app/security` | Encrypt OAuth tokens for P5 wearable APIs |
| `WorkoutSession` model | `workouts.prisma` | Workout import target, already has `source` field |
| Dashboard card system | `dashboard.schema.ts` / `card-registry.ts` | Add `goal-steps` card following existing pattern |
| Weekly report pipeline | `weekly-report.interface.ts` / worker | Add step data to existing report generation |
| RabbitMQ worker | `apps/worker` | Health sync jobs in P4/P5 |
