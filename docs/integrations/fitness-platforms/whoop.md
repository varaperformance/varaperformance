# WHOOP integration (planning)

## Goals

- Sync WHOOP recovery and training signals into Vara: **sleep**, **strain/workouts**, and **daily recovery context** where API access allows.
- Reuse existing Vara targets (`WorkoutSession`, `SleepLog`, `HeartRateLog`, optional derived metrics) with strict dedup against Apple Health, Google Fit, and manual logs.

WHOOP is a strong fit for recovery-focused users, but API scope and access model can vary by partner tier. Treat this as a server-side integration plan that requires a short discovery spike.

## Access model

- WHOOP developer access and API products can change over time. Start from [WHOOP Developer](https://developer.whoop.com/) and confirm current terms.
- **Authentication:** OAuth 2.0 authorization code flow (expected), with refresh tokens stored encrypted in Vara.
- **User linking:** connect flow from Integrations page; callback stores tokens and starts an initial sync.
- **Sync mode:** scheduled pull + optional webhook/event subscriptions if WHOOP provides them for your app tier.

## Data mapping (initial)

| WHOOP concept | Vara target | Notes |
|---------------|-------------|-------|
| Sleep episodes / totals | `SleepLog` | Normalize to user timezone; keep source = WHOOP. |
| Workouts / activity sessions | `WorkoutSession` | Map sport/activity type; store external id for dedup. |
| Heart rate samples / summary | `HeartRateLog` or `externalSummary` on sessions | Prefer samples if available and volume is manageable. |
| Recovery score / readiness | Derived insight field (phase 2) | Keep raw values in import audit first; expose after product design. |

## Phases

1. **Discovery spike (1–2 days)**  
   Validate OAuth + one endpoint (for example, recent sleep). Confirm scopes, pagination, and rate limits for your WHOOP app.
2. **Token + sync foundation**  
   Add WHOOP provider to `HealthTokenService` / `HealthSyncService`, enqueue `health.sync` jobs.
3. **Backfill + dedup**  
   Import bounded history window and dedup by `(provider, externalId)` with startedAt fallbacks.
4. **UI integration card**  
   Connect/disconnect, last sync timestamp, and error state in Integrations.
5. **Recovery UX (optional)**  
   Add WHOOP-derived recovery/readiness surfaces where product wants them.

## Rate limits and reliability

- Apply provider-specific throttling and exponential backoff on `429` / `5xx`.
- Use idempotent upserts keyed by external IDs.
- Keep an import audit trail for support and compliance debugging.

## Risks

- API access level may depend on WHOOP partnership status.
- Recovery metrics can conflict with other providers; decide precedence rules in product design.
- Data model drift across provider versions requires contract tests in integration layer.

## Open decisions

- [ ] v1 scope: **sleep + workouts only** or include recovery score surfaces immediately.
- [ ] Source precedence when user connects WHOOP + Apple Health + another wearable.
- [ ] GDPR/vendor documentation updates in `docs/GDPR.md` and `docs/compliance/sub-processors.md` when WHOOP goes live.

## References

- [WHOOP Developer](https://developer.whoop.com/) — current API, OAuth, and app setup.
- Internal: [integrations/README.md](./README.md), [PLAN.md P5](../PLAN.md#p5--third-party-wearable-apis-server-side)
