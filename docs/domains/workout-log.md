# Workout Log & Session Refactor Plan

**Status (2026-04-22):** The **Implementation Order** checklists at the bottom of this file are marked **complete** for Phases 1–5. Backend `formatSessionResponse()` in `workout-sessions.service.ts` **returns** `startedAt`, `endedAt`, `gymId`, `externalProvider`, `externalActivityId`, `externalActivityType`, `externalSummary`, `importedAt` alongside `workouts[]` and notes. Health sync persists richer `externalSummary` for imports. **Sections below** mix **current schema reference**, **historical design**, and **optional follow-ups**—if code and UI drift, trust the repo.

## Quick verification (when editing this doc)

- API: `apps/backend/src/health/workouts/workout-sessions.service.ts` → `formatSessionResponse`, `formatFeedResponse`.
- Selector: `apps/backend/src/health/workouts/selectors/workout.selector.ts`.
- Web detail: imported-session branch + `ActivitySummary`, maps, HR zones under `apps/web` workout features.

## Current architecture (reference)

### DB Schema (WorkoutSession)

| Field | Manual | Strava | Apple Health / Google Health |
|-------|--------|--------|------------------------------|
| `title` | User-set or exercise names | Activity name (e.g. "Morning Run") | Workout name |
| `source` | `MANUAL` | `STRAVA` | `APPLE_HEALTH` / `GOOGLE_FIT` |
| `externalProvider` | null | `"strava"` | Set when synced from health pipeline |
| `externalActivityId` | null | Strava activity ID | Health external id / dedup fields as implemented |
| `externalActivityType` | null | `"Run"`, `"Ride"`, etc. | Activity type when available |
| `externalSummary` (JSON) | null | Rich: distance, time, speed, elevation, calories, kudos, polyline | Calories, duration, distance, HR, etc. when sync writes them |
| `importedAt` | null | Set | Set when imported |
| `startedAt` / `endedAt` | Session timing | Activity start/end | Start/end from health store |
| `workouts[]` | Full exercise/set tree | **Often empty** for pure imports | **Often empty** for pure imports |

### API response (today)

`WorkoutSessionResponse` includes the import fields above; **feed** responses include a subset (`externalActivityType`, `externalSummary`, aggregate stats). See `WorkoutSessionResponseSchema` in `@varaperformance/core` for the canonical contract.

---

## Refactor Plan

### Phase 1: Backend — Surface Import Data

**P1.1 — Update `workoutSessionSelect` to include import fields**

Add to the selector:
```ts
externalProvider: true,
externalActivityId: true,
externalActivityType: true,
externalSummary: true,
importedAt: true,
```

**P1.2 — Update `formatSessionResponse()` to return all fields**

Add to the response mapping:
```ts
startedAt: session.startedAt.toISOString(),
endedAt: session.endedAt?.toISOString() ?? null,
gymId: session.gymId,
externalProvider: session.externalProvider,
externalActivityId: session.externalActivityId,
externalActivityType: session.externalActivityType,
externalSummary: session.externalSummary,
importedAt: session.importedAt?.toISOString() ?? null,
```

**P1.3 — Update Zod response schema in `@varaperformance/core`**

Extend `WorkoutSessionResponseSchema`:
```ts
startedAt: z.string().datetime(),
endedAt: z.string().datetime().nullable(),
gymId: z.string().uuid().nullable(),
externalProvider: z.string().nullable(),
externalActivityId: z.string().nullable(),
externalActivityType: z.string().nullable(),
externalSummary: ExternalSummarySchema.nullable(),
importedAt: z.string().datetime().nullable(),
```

Define `ExternalSummarySchema` (loose — different providers send different shapes):
```ts
export const ExternalSummarySchema = z.object({
  distanceMeters: z.number().optional(),
  movingTimeSeconds: z.number().optional(),   // active time (Strava)
  elapsedTimeSeconds: z.number().optional(),  // wall clock time (Strava)
  elevationGainMeters: z.number().optional(),
  averageSpeedMps: z.number().optional(),
  maxSpeedMps: z.number().optional(),
  averagePaceSecPerKm: z.number().optional(), // pre-computed at import for fast loading
  calories: z.number().optional(),
  kudosCount: z.number().optional(),
  averageHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
  polyline: z.string().optional(),            // Strava encoded polyline for route map
}).passthrough();
```

> **Units**: All distances stored in metric (meters, km). Frontend converts to user's preferred unit (mi, lbs, etc.).
> **Duration**: Both `movingTimeSeconds` and `elapsedTimeSeconds` are stored; frontend shows both.
> **Pace**: Pre-computed as `averagePaceSecPerKm` at import time and stored in `externalSummary`.

### Phase 2: Fix Apple Health / Google Health Sync

**P2.1 — Save `calories`, `duration`, and metadata during health sync**

In `health-data.service.ts` `syncHealthData()` → workout import loop:
```ts
const durationSec = entry.duration ?? undefined;
const distanceM = entry.distanceMeters ?? undefined;

await this.db.workoutSession.create({
  data: {
    userId,
    source: data.source,
    title: entry.name,
    startedAt,
    endedAt,
    performed: startedAt,
    externalProvider: data.source.toLowerCase().replaceAll('_', '-'),
    externalActivityType: entry.activityType ?? entry.name,
    externalSummary: {
      calories: entry.calories ?? undefined,
      elapsedTimeSeconds: durationSec,
      distanceMeters: distanceM,
      averageHeartRate: entry.averageHeartRate ?? undefined,
      maxHeartRate: entry.maxHeartRate ?? undefined,
      // Pre-compute pace (sec/km) at import time
      averagePaceSecPerKm:
        distanceM && durationSec && distanceM > 0
          ? Math.round((durationSec / (distanceM / 1000)) * 100) / 100
          : undefined,
    },
    importedAt: new Date(),
  },
});
```

**P2.2 — Improve dedup for health imports**

Currently dedup is `(userId, source, startedAt)` — fragile if timestamps differ slightly. Consider:
- Use `healthKitId` field (already on the model) when the client provides one
- Add `healthKitId` to `SyncWorkoutEntrySchema` as optional
- Dedup by `(userId, healthKitId)` when available, fall back to `(userId, source, startedAt)`

**P2.3 — Expand `SyncWorkoutEntrySchema`**

All numeric values stored in metric. Frontend converts using user profile unit prefs.

```ts
export const SyncWorkoutEntrySchema = z.object({
  name: z.string().max(200),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  calories: z.number().min(0).max(100000).optional(),
  duration: z.number().min(0).max(86400).optional(),
  // New fields
  healthKitId: z.string().max(255).optional(),
  activityType: z.string().max(100).optional(),
  distanceMeters: z.number().min(0).optional(),
  averageHeartRate: z.number().int().min(0).max(300).optional(),
  maxHeartRate: z.number().int().min(0).max(300).optional(),
});
```

### Phase 3: Frontend — Workout Detail Refactor

**P3.1 — Detect session type and render accordingly**

```
isManualSession  → Current exercise/set detail view
isImportedSession → New "Activity Summary" view
```

**P3.2 — Activity Summary component for imported workouts**

New `<ActivitySummary>` component that renders import-specific data:

```
┌─────────────────────────────────────────────────┐
│  Morning Run                    Strava  Imported │
│  Thu, Apr 17 · 6:32 AM – 7:15 AM                │
│  Run · 43 min (38 min moving)                    │
├─────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │ 5.2  │  │ 43:22│  │ 8:20 │  │ 312  │        │
│  │  km  │  │ time │  │/km   │  │ kcal │        │
│  └──────┘  └──────┘  └──────┘  └──────┘        │
│                                                  │
│  Elevation  +82m  │  Avg Speed  7.2 km/h        │
│  Max Speed  12.1 km/h  │  Kudos  3              │
│                                                  │
│  ┌─ Route Map (if polyline exists) ───────────┐ │
│  │         [Decoded polyline on map]           │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ Heart Rate Zones (if HR data) ────────────┐ │
│  │  Zone 1 ████░░░░░░  12%                     │ │
│  │  Zone 2 ██████░░░░  28%                     │ │
│  │  Zone 3 █████████░  42%                     │ │
│  │  Zone 4 ████░░░░░░  14%                     │ │
│  │  Zone 5 █░░░░░░░░░   4%                     │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

Stat tiles adapt based on what `externalSummary` contains (only show fields that exist).

- **Duration**: Show both elapsed time and moving time (Strava) when available
- **Distance/Pace**: Displayed in user's preferred unit (km↔mi); pace from pre-computed `averagePaceSecPerKm`
- **Route map**: Render decoded polyline on a map component when `externalSummary.polyline` exists
- **HR zones**: Show zone distribution chart when `averageHeartRate` / `maxHeartRate` data exists

**P3.3 — Session list card improvements**

For imported sessions, show summary stats inline on the list card:
- Distance + duration for runs/rides
- Duration + calories for other activity types
- Replace "0 exercises · 0 sets" with actual metrics

**P3.4 — Unified detail sheet**

The workout detail sheet/page should render:
1. **Header**: title, date, time range (`startedAt` → `endedAt`) with both elapsed & moving time, source badge, activity type badge
2. **Route Map** (if `externalSummary.polyline` exists): decoded polyline on map
3. **Activity Summary** (if `externalSummary` exists): stat tiles with user-preferred units
4. **HR Zone Chart** (if HR data exists): zone distribution visualization
5. **Exercise List** (if `workouts.length > 0`): current exercise/set UI
6. **Notes** (if encrypted notes exist)
7. **Import metadata** (small footer): imported at, external ID, provider

> **No manual exercise overlay** — users log separate sessions for strength work done during an imported activity.

### Phase 4: Stats Integration

**P4.1 — Include imported workout metrics in stats**

Update `getStats()` to account for imported sessions:
- Total calories (from `externalSummary.calories`)
- Total distance (from `externalSummary.distanceMeters`)
- Total duration (from `startedAt`/`endedAt` or `externalSummary.movingTimeSeconds`)

**P4.2 — Activity heatmap data**

Update `getActivityData()` to include imported session contributions:
- Currently only counts sets/volume from `Workout[]` records
- Add separate tracking for "imported activity minutes" per day

### Phase 5: Strava Page Consolidation (Optional)

Consider merging the Strava Activities page into the workout log:
- Remove the separate `GET /integrations/strava/activities` view
- All Strava sessions appear in the unified workout log with full detail
- The Integrations page becomes connection management only (connect/disconnect/sync)

---

## Implementation Order

### Phase 1: Backend — Surface Import Data
- [x] P1.1 — Add import fields to `workoutSessionSelect` (`workout.selector.ts`)
- [x] P1.2 — Update `formatSessionResponse()` to return all fields (`workout-sessions.service.ts`)
- [x] P1.3 — Add `ExternalSummarySchema` (incl. `polyline`, `averagePaceSecPerKm`, both duration fields) + extend `WorkoutSessionResponseSchema` (`workout.schema.ts`)
- [x] P1.4 — Store `polyline` + pre-compute `averagePaceSecPerKm` during Strava sync (`strava.service.ts`)

### Phase 2: Fix Apple Health / Google Health Sync
- [x] P2.1 — Save `calories`, `duration`, `distanceMeters`, HR data, and metadata during health sync; pre-compute pace (`health-data.service.ts`)
- [x] P2.2 — Improve dedup with `healthKitId` (`health-data.service.ts`, schema, Capacitor plugin)
- [x] P2.3 — Expand `SyncWorkoutEntrySchema` with new optional fields — all values in metric (`health-data.schema.ts`)

### Phase 3: Frontend — Workout Detail Refactor
- [x] P3.1 — Detect session type and branch rendering (manual vs imported)
- [x] P3.2 — Create `<ActivitySummary>` component: stat tiles with unit conversion, both elapsed & moving time
- [x] P3.3 — Update session list cards with import stats — distance/duration/calories in user units (`workouts.tsx`)
- [x] P3.4 — Unified detail sheet: header → route map → stats → HR zones → exercises → notes → metadata
- [x] P3.5 — Route map component: decode `externalSummary.polyline` and render on map
- [x] P3.6 — HR zone distribution chart component (when `averageHeartRate` / `maxHeartRate` exist)

### Phase 4: Stats Integration
- [x] P4.1 — Include imported workout metrics in `getStats()` — calories, distance, duration (`workout-sessions.service.ts`)
- [x] P4.2 — Add imported activity minutes to heatmap data (`workout-sessions.service.ts`)

### Phase 5: Strava Page Consolidation (Optional)
- [x] P5 — Merge Strava Activities into unified workout log, reduce Integrations page to connection management

## Decisions

- [x] **Duration display**: Show both `movingTimeSeconds` (active) and `elapsedTimeSeconds` (wall clock) for Strava
- [x] **Unit preferences**: Store in metric (km, kg) in DB; convert to user's preferred unit on the frontend
- [x] **Pace calculation**: Store pace in `externalSummary` at import time for faster loading
- [x] **Map/route**: Yes — store Strava polyline data and display route map on the detail page (requested feature)
- [x] **Heart rate zones**: Yes — show zone distribution chart when HR data exists in summary
- [x] **Manual exercise overlay**: No — users log separate sessions through the Workout Log
