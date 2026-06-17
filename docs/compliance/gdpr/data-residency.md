# Data residency and cross-border processing (Art. 44–49)

**Status:** Current as of May 2026. Update this file whenever infrastructure or providers change.

**Not public:** This file lives in the private company repo. Align any **published** statements (Privacy Policy, DPAs) with what is recorded here.

## Primary application and database

All production services run on a **self-hosted single-node k3s cluster** (Ubuntu 22.04 LTS). The physical server is located in the **United States**.

| Component | Region | Notes |
| --- | --- | --- |
| Application (API, web, worker) | United States | k3s cluster, single-node |
| PostgreSQL | United States | Co-located on k3s node, persistent volume |
| Redis | United States | Co-located on k3s node |
| RabbitMQ | United States | Co-located on k3s node (StatefulSet) |
| Object storage (MinIO) | United States | Self-hosted MinIO on k3s node, 50 Gi PV; bucket region `us-east-1` |

## Third-party processing (summary)

Third-party sub-processors follow their own global infrastructure. See [sub-processors.md](./sub-processors.md) for the full register and DPA links.

| Sub-processor | Service | Typical region |
| --- | --- | --- |
| Stripe | Payments | US / global |
| SMTP provider (env: `SMTP_HOST`) | Transactional email | Provider-dependent |
| Strava | Optional OAuth / activity sync | US (Strava infra) |
| Mapbox | Geocoding / place search | US (Mapbox CDN) |
| Google Analytics | Web analytics (consent-gated) | US (Google infra) |

EU/UK transfers to the US rely on Standard Contractual Clauses (SCCs) where required. Transfer impact assessments (TIAs) are legal-held artefacts outside this repo.

## Customer-facing statement

The Privacy Policy states that data is processed in the **United States** and describes sub-processor safeguards. Keep the Privacy Policy aligned with the table above when infrastructure changes.

## Cross-border transfer mechanism

| Transfer | Mechanism | Notes |
| --- | --- | --- |
| EU/UK → US (Stripe) | Stripe DPA + SCCs | See stripe.com/legal/dpa |
| EU/UK → US (SMTP) | Obtain DPA from chosen SMTP vendor | Required before launch |
| EU/UK → US (Mapbox) | Mapbox DPA | See mapbox.com/legal/privacy |
| EU/UK → US (Google Analytics) | Google Ads Measurement DPA | Consent-gated; see business.safety.google |

## Dedicated EU residency

Not currently offered. All data is hosted in the US. If a dedicated EU-only stack is required (for enterprise customers or regulatory reasons), this would require a separate k3s cluster and database in an EU region — track as a future product/infrastructure decision.

## Not in scope for this document

- Signed TIAs — legal-held artefacts outside this repo.
- SOC 2 or ISO 27001 certification scope — separate compliance programme.
