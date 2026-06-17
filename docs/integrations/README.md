# Third-party health integrations

Plans for connecting **cloud and platform** health providers beyond on-device Apple Health / Health Connect sync. On-device sync is documented in [PLAN.md](../PLAN.md) (P0–P4) and [CAPACITOR.md](../CAPACITOR.md).

**Current implementation note:** Withings is now partially implemented server-side (OAuth + weight/body-composition sync). See [withings.md](./withings.md) status line for exact scope.

## Provider plans

| Provider | Doc | Auth | Primary value |
|----------|-----|------|----------------|
| **Google Fit** | [google-fit.md](./google-fit.md) | Google OAuth 2 + platform APIs | Android continuity, REST backfill, web users |
| **WHOOP** | [whoop.md](./whoop.md) | OAuth 2 (verify current WHOOP app tier) | Recovery-first signals (sleep, strain/workouts, readiness context) |
| **Garmin** | [garmin.md](./garmin.md) | OAuth **1.0a** (partner program) | Workouts, steps, sleep, HR for athletic users |
| **Withings** | [withings.md](./withings.md) | OAuth 2 | Weight, body comp, BP, sleep — scale-first |

## Shared backend work (all providers)

These are prerequisites for any of the four; implement once, then plug in each adapter. (See [PLAN.md § P5](../PLAN.md#p5--third-party-wearable-apis-server-side).)

- **`apps/backend/src/integrations/health/`** — module boundary for OEM APIs.
- **`HealthTokenService`** — store/refresh OAuth tokens ( **EncryptionService** for secrets at rest).
- **`HealthSyncService`** — orchestrate import windows, map provider payloads → `StepLog`, `SleepLog`, `HeartRateLog`, `WeightLog`, `WorkoutSession`.
- **Worker queue** — `health.sync` jobs via RabbitMQ for backfill and webhook processing.
- **Rate limiting** — per-provider budgets (documented in each plan).
- **Deduplication** — match on external IDs + `startedAt` / `loggedAt` so data is not double-counted if the user also uses Apple Health or manual entry.
- **Audit** — `HealthDataImport` or extend existing audit for compliance.

## Suggested implementation order

1. **Shared infrastructure** (tokens, queue, dedup helpers) — blocks everything.
2. **Withings** — narrow surface (weight-body comp), OAuth 2.0, webhook-friendly; good first server-to-server integration.
3. **WHOOP** — recovery-focused value and OAuth 2 style flow; confirm developer tier and API coverage early.
4. **Google Fit** — OAuth 2 familiar to team; depends on whether we prioritize **Health Connect** on device vs **Fit REST** for server; see [google-fit.md](./google-fit.md).
5. **Garmin** — OAuth 1.0a + partner onboarding + webhooks; highest integration cost; schedule after patterns exist from (2)–(4).

## Related (outside health integrations)

- **Global header / command search:** [web/global-app-search.md](../web/global-app-search.md) (web shell; not a health provider).

## Links

- Product roadmap: [ROADMAP.md](../ROADMAP.md) (wearables backlog).
- Encryption: [backend/ENCRYPTION.md](../backend/ENCRYPTION.md).
- Worker patterns: [worker/QUEUES.md](../worker/QUEUES.md).
