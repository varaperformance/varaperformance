# Google Fit integration (planning)

## Goals

- Let users who **do not** rely on Apple Health (or who use **Android** heavily) sync steps, sleep, heart rate, and workouts into the same Vara models as HealthKit/Health Connect (`StepLog`, `SleepLog`, `HeartRateLog`, `WorkoutSession`, etc.).
- Avoid duplicating data already ingested via **on-device** `@capgo/capacitor-health` / Health Connect when the same Google account is used.

## Two technical paths (choose explicitly)

| Path | Where it runs | When to use |
|------|----------------|-------------|
| **A. Device (already partial)** | Capacitor app, Health Connect / Fit on Android | Same as today — `source: GOOGLE_FIT` on sync payloads. Expand permissions and field coverage if gaps exist. |
| **B. Server — Google Fit REST / Fitness API** | NestJS backend + user's Google OAuth tokens | Backfill history, web app without native, periodic server jobs independent of app open |

This plan focuses on **Path B** where product needs **server-side** Fit data. Path A stays in the mobile `health-sync` layer; document cross-checks so we do not double-insert the same calendar day from A and B.

**APIs to evaluate (Google Cloud / Fit)**

- **Fitness API** (legacy “Google Fit” REST) — datasets, sessions, aggregation; being superseded by **Health Connect** on Android for *new* platform work.
- **Google Health Connect** — not a REST API for arbitrary servers; it is an on-device store. Server path implies **Fitness API** or future Google offerings as they document migration.

**Action item:** Confirm current Google documentation for **third-party server access** to fitness data (scopes, `fitness.activity.read`, `fitness.body.read`, etc.) and any **deprecation timeline** for the Fitness API.

## OAuth 2.0 (Path B)

- **Client type:** Web / server — use **authorization code** with **refresh tokens**; store refresh token encrypted per user.
- **Scopes** (illustrative — verify against latest Google Cloud Console):
  - `https://www.googleapis.com/auth/fitness.activity.read`
  - `https://www.googleapis.com/auth/fitness.body.read`
  - `https://www.googleapis.com/auth/fitness.location.read` (if route/workout polylines)
- **UX:** “Connect Google Fit” on Integrations; redirect to Google consent; callback route on backend stores tokens and triggers initial backfill.
- **Token refresh:** Job or on-demand refresh before each sync window; revoke handling if user disconnects in Google account settings.

## Data mapping (target Vara models)

| Fit concept | Vara target | Notes |
|-------------|-------------|--------|
| Daily steps aggregate | `StepLog` + `source: GOOGLE_FIT` | Align calendar day to user **profile timezone** (same as HR fix). |
| Sleep segments | `SleepLog` | Map segment types to our duration model; split sessions if needed. |
| Heart rate samples | `HeartRateLog` | Batched insert; respect existing 2k/50k server caps. |
| Activities / sessions | `WorkoutSession` | Map activity types → Vara categories; store external IDs for **dedup** with Strava/Apple imports. |

## Phases

1. **Spike (1–2 days):** OAuth flow in a branch; one read endpoint (e.g. steps for 7d); prove token storage and **no duplicate** with Android sync for same user.
2. **Backfill service:** Paginated time windows; worker job `health.sync` provider `GOOGLE_FIT`.
3. **Ongoing sync:** Scheduled job (e.g. every 6–12h) + manual “Sync now” that hits the same code path as Apple-style sync status UI.
4. **UI:** Integrations card status, last sync time, disconnect.

## Rate limits & reliability

- Google APIs use **per-project** quotas. Register expected QPS in Cloud Console; exponential backoff on `429` / `5xx`.
- Log **request id** from error bodies for support.

## Risks

- **API deprecation** — track Google’s migration story from classic Fitness API to Health Connect–centric flows; may affect long-term **server** viability.
- **Duplicate users** — same person with iPhone (Apple) and Pixel (Google): dedup keys and “preferred source” in user preferences if needed.

## Open decisions

- [ ] Ship Path B at all, or only strengthen Path A (Health Connect) for Android.
- [ ] Minimum Android/web market share threshold to prioritize vs Garmin/Withings.
- [ ] Whether Fit imports require a new **consent** string beyond `HEALTH_DATA_CONSENT` (link third-party DPA in [GDPR.md](../GDPR.md) when live).

## References

- [Google Fit API (legacy documentation)](https://developers.google.com/fit) — verify current product name and endpoints.
- [Google OAuth 2.0 for server apps](https://developers.google.com/identity/protocols/oauth2)
- Internal: [integrations/README.md](./README.md), [PLAN.md P5](../PLAN.md#p5--third-party-wearable-apis-server-side)
