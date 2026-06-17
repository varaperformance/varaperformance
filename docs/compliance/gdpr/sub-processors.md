# Sub-processor register (Art. 28)

**Audience:** Privacy, security, and procurement. **Status:** Working register; DPA execution and commercial terms remain with your legal team.

This file is **not public**: it sits in the **private** company repo. It lists third parties that typically process personal data on behalf of Vara Performance when operating the product **as implemented in that codebase**. It does **not** replace Art. 13/14 transparency in your **published** Privacy Policy or a future **public** sub-processor page on your site.

**Per-deployment** items (for example SMTP relay) depend on environment variables such as `SMTP_HOST`.

| Sub-processor | Role | Typical personal data | Region / notes | DPA / data protection resource |
|---------------|------|-------------------------|----------------|----------------------------------|
| **Stripe, Inc.** | Payment processor (card vault, Connect, webhooks) | Billing contact, payment metadata, tax identifiers as required | US / global ([Stripe locations](https://stripe.com/legal)) | [Stripe DPA / data processing](https://stripe.com/legal/dpa) |
| **Transactional email (SMTP)** | Outbound email (nodemailer) | Email address, message content | Depends on chosen provider | Obtain processor DPA from your SMTP vendor (e.g. SendGrid, Postmark, Amazon SES) |
| **Strava** | Optional OAuth / activity sync | Profile and activity data **you** connect | See Strava policies | [Strava API Agreement / privacy](https://www.strava.com/legal/api) |
| **Mapbox, Inc.** | Geocoding, maps, place search | Queries (addresses, gym names), IP as per Mapbox | See Mapbox | [Mapbox privacy](https://www.mapbox.com/legal/privacy) |
| **Google Analytics** | Web analytics **after cookie consent** | Pseudonymous usage, device metadata | Google | [Google Ads / Measurement DPA hub](https://business.safety.google/adsprocessorterms/) |
| **Google Fit API** | Optional OAuth 2.0 / server-side activity sync (steps, sleep, HR, workouts) | Activity data, OAuth tokens (encrypted at rest) | US (Google infra) | [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy); obtain Google DPA via Google Workspace / Cloud if applicable |
| **Object storage (S3-compatible)** | User media, exports | Files you upload, signed URL access | Same region as bucket configuration | Use cloud provider DPA (e.g. AWS, GCP, or on-prem equivalent) |
| **PostgreSQL, Redis, RabbitMQ** | Core persistence, cache, queues | All application data in scope for that tier | Same region as deployment | Covered by your hosting / IaaS DPA |

**Not sub-processors of Vara in the same sense:** OAuth sign-in (Google, Apple) for authentication, and health connectors (Apple Health, Google Health on device) where Vara receives data only after **your** explicit consent—those providers act under their own terms until data is transferred into Vara.

**Maintaining this list:** Update this file when adding a new vendor that processes personal data. **Mirror** material changes in the **user-facing** Privacy Policy (`seed-legal-documents.ts` / SQL, or your public legal site) and notify customers where your policy or law requires it. Do not assume readers can see this repo.
