# Garmin Connect integration (planning)

## Goals

- Sync **activities, steps, sleep, and heart rate** for users on Garmin devices into Vara (`WorkoutSession`, `StepLog`, `SleepLog`, `HeartRateLog`) with **stable dedup** against Strava, Apple Health, and manual entries.
- Use **server-side** ingestion (Garmin is not exposed through our Capacitor health plugin the same way as platform health stores).

## Access model

Garmin exposes partner APIs under **Garmin Connect Developer Program** (naming and enrollment steps change; verify on [developer.garmin.com](https://developer.garmin.com)).

- **Authentication:** **OAuth 1.0a** (three-legged) — not OAuth 2. Different signing and token storage; our `HealthTokenService` must support a **1.0a** profile (consumer key/secret + access token + token secret) in addition to OAuth2 providers.
- **User linking:** User authorizes Vara in Garmin’s OAuth flow; we store **Garmin user id** + tokens (encrypted).
- **Webhooks / push (preferred):** Register for **summary or activity** notifications so we do not poll constantly — matches historical PLAN notes: “Register webhook for daily summary push.”
- **Fallback polling:** If webhook delay or scope gaps, bounded polling with strict **rate limits** (e.g. on the order of **240 requests / 15 minutes** per program — **confirm in current Garmin API docs** before implementation).

## Data mapping (illustrative)

| Garmin concept | Vara target | Notes |
|----------------|-------------|--------|
| Daily steps | `StepLog` `source` enum or string compatible with `GOOGLE_FIT` / `APPLE_HEALTH` pattern | Use **profile timezone** for calendar day. |
| Sleep | `SleepLog` | Map Garmin sleep windows to our schema. |
| HR samples (if exposed to partner API) | `HeartRateLog` | Watch batch size vs DB limits. |
| Activities (run, ride, etc.) | `WorkoutSession` | Map Garmin sport types → Vara `WorkoutSessionSource` / category; store **Garmin activity id** on session or `externalActivityId` for **dedup**. |

## Phases

1. **Program enrollment** — business/legal approval for Garmin developer access; production keys; callback URLs.
2. **OAuth 1.0a spike** — obtain tokens for a test user; one successful **activity** or **dailies** fetch.
3. **Webhook endpoint** — `POST` handler (verify signature if Garmin provides one); idempotent processing; queue to worker.
4. **Backfill** — on connect, request historical window (as allowed by API); map to Vara models.
5. **Integrations UI** — Connect / Disconnect, last sync, error states.

## Rate limits and ops

- Implement **token bucket** or **scheduler** per user to stay under program limits; **log rate-limit headers** if Garmin provides them.
- **Retry policy:** exponential backoff; dead-letter queue for poison payloads.

## Risks

- **Partner approval** — timeline not controlled by eng alone.
- **OAuth 1.0a** — fewer off-the-shelf libraries than OAuth2; test thoroughly; unit-test signing.
- **Webhook reliability** — reconcile with **occasional full sync** (e.g. weekly) to fix missed events.

## Open decisions

- [ ] Which **Garmin product** (Health API vs Activity API vs summary APIs) is the first milestone — spike determines.
- [ ] **Premium vs free** user feature flag if Garmin fees apply.
- [ ] Deduplication rule when **same activity** exists in **Strava** and **Garmin** (user connects both).

## References

- [Garmin Connect Developer](https://developer.garmin.com) — current API list and terms.
- Internal: [integrations/README.md](./README.md), [PLAN.md P5 – Garmin](../PLAN.md#garmin-connect)
