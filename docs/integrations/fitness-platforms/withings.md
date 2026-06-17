# Withings integration (planning)

**Status (2026-04-23):** Backend integration is **partially implemented**: OAuth connect/callback/disconnect, token refresh, status, manual sync, and import of weight/body-composition into `WeightLog` are live in `apps/backend/src/integrations/withings-integration.*`. Remaining items below are the broader roadmap (Notify API, sleep/BP/HR expansion, provider-agnostic sync infrastructure).

## Goals

- Import **weight**, **body composition** (fat %, muscle mass where available), **blood pressure** (if product roadmap includes vitals), and **sleep** from Withings devices into Vara.
- Natural fit: **`WeightLog`** (existing encrypted pattern), **sleep** can map to `SleepLog`, HR if exposed as samples to `HeartRateLog`.

Withings is a strong **first server-side OAuth2** candidate: narrower domain than full activity platforms; clear **Notify API** for low-latency updates.

## Setup checklist: Client ID and Client Secret

Use the official developer portal. Exact UI labels can change; follow the in-portal help if a step no longer matches.

- [ ] **Open the developer area** — Go to [https://developer.withings.com](https://developer.withings.com) and sign in, or [create a developer / Partner Hub account](https://developer.withings.com/dashboard/) if you do not have one. Withings recommends a **dedicated org email** (not a personal consumer-only account) for team access and continuity.
- [ ] **Create an application (OAuth client)** — In the dashboard, create a new **application** / **app** (wording may be “Create application” or similar). This registers your Vara instance as an OAuth2 client and is what yields **`client_id`** and **`client_secret`**.
- [ ] **Choose API / plan** — For personal-scale data import in Vara, use the **Public / standard** developer path that exposes the **Health / measures** API (not RPM-only or contract-only products unless you have a signed agreement). The default public API base for most integrations is `https://wbsapi.withings.net` (EU/global public cloud). *US medical cloud* uses a different base URL and requires a separate Withings process—only switch if you are explicitly on that product.
- [ ] **Set the callback (redirect) URI** to match the backend **exactly** (scheme, host, path, no trailing slash unless your env uses one). Vara’s default local dev value is:  
  `http://localhost:3000/v1/integrations/withings/callback`  
  Production: use your public API host, e.g. `https://<api-domain>/v1/integrations/withings/callback`. This must be identical to `WITHINGS_REDIRECT_URI` in [apps/backend/.env.example](../../apps/backend/.env.example).
- [ ] **Enable scopes** — Withings’ [authorization URL](https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/get-access/oauth-authorization-url) expects **`scope` as comma-separated** values (e.g. `user.metrics,user.activity`). Vara accepts commas or spaces in `WITHINGS_SCOPES` and sends commas. Start with **`user.metrics`** for measures (Getmeas / weight). If the consent screen says a scope is not allowed, remove optional scopes (some app types disallow **`user.info`**) or enable them in the partner dashboard.
- [ ] **After saving the app, copy credentials** — Copy **`client_id`** → `WITHINGS_CLIENT_ID` and **`client_secret`** → `WITHINGS_CLIENT_SECRET`. Store the secret in your secrets manager / `.env` (never commit it).
- [ ] **Set the post-login redirect for your web app** — `WITHINGS_WEB_REDIRECT_URL` should be the page users return to (e.g. `http://localhost:5173/integrations` in dev), where the UI reads `?withings=connected` or error query params.
- [ ] **Smoke-test** — Start the backend, open Integrations, connect Withings, complete login on Withings, confirm redirect back to your web URL and a successful first sync (or a clear error in logs if the callback URL or scopes do not match the portal).

If token exchange fails with a Withings or HTTP error, re-check: callback URL **character-for-character** match, correct client, scopes approved, and that you are using the same Withings **environment** (public vs US medical) the app was created for.

## API surface (Withings public API)

Naming varies by year; use the current developer portal. Typical building blocks:

- **OAuth 2.0** — authorization code; refresh tokens for long-lived access.
- **Measure / body** — weight, fat mass, diastolic/systolic BP, SpO2 (device-dependent).
- **Sleep** — nights summary and possibly timeline depending on **Sleep Analyzer** / mat.
- **Notify / subscription** — register webhooks (callback URL) for new measurements instead of constant polling.

**Action item:** In spike, list exact **endpoints and scopes** from Withings’ latest JSON API docs and note **regional base URLs** if any.

## Data mapping (target Vara)

| Withings | Vara target | Notes |
|----------|-------------|--------|
| Weight / mass | `WeightLog` | Reuse encryption path; `loggedAt` from measurement timestamp. |
| Body composition | `WeightLog` or extended fields if schema supports | Align with existing body comp fields if present. |
| Blood pressure | New model or `HealthMetric`-style if introduced | May be out of v1; flag as **phase 2** if scope creep. |
| Sleep summary | `SleepLog` | Map night boundaries to **user timezone** (same as HR plan). |
| Intraday HR | `HeartRateLog` | If API exposes time series with sufficient resolution. |

## OAuth 2.0 flow

- Standard **authorize** → **callback** with `code` → exchange for **access + refresh** tokens.
- Store refresh token in **`HealthTokenService`** (encrypted); refresh before expiry.
- **Disconnect:** revoke or delete subscription + delete tokens in our DB.

## Phases (recommended for Withings as “first” cloud integration)

1. **Spike (1–2 days):** OAuth + fetch **most recent weight**; write to `WeightLog` with `source` discriminant for Withings.
2. **Notify API:** Public HTTPS **callback** route; verify challenge/secret per Withings docs; enqueue worker for ingestion.
3. **Backfill:** On first connect, pull N days of history (max allowed).
4. **UI:** Integrations page card; last sync; manage connection.

## Rate limits and reliability

- Respect Withings’ documented **per-app** and **per-user** limits; use **queue + backoff**.
- **Idempotency:** use Withings’ **measurement or transaction ids** if provided to avoid duplicate rows on webhook retries.

## Risks

- **Account types** — some metrics only for certain device tiers; communicate in UI.
- **Webhooks in dev** — need **ngrok** or **staging URL**; production domain must be stable.

## Open decisions

- [ ] v1 **weight only** vs weight + sleep in first release.
- [ ] How to display **source** in UI (Withings vs manual vs HealthKit) without confusing users.
- [ ] DPA / subprocessors: add Withings to [GDPR.md](../GDPR.md) sub-processor list when live.

## References

- [Withings API](https://developer.withings.com) — current OAuth2 and Notify docs.
- Internal: [integrations/README.md](./README.md), [PLAN.md P5 – Withings](../PLAN.md#withings)
