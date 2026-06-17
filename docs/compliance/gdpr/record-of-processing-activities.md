# Record of processing activities (Art. 30) — DRAFT

**Legal review required.** This is an engineering-maintained skeleton to speed Art. 30 work; it is **not** a final legal ROPA until your privacy counsel signs off.

Last updated: May 2026

| Processing activity | Purpose | Categories of data | Data subjects | Recipients / processors | Retention (indicative) | Lawful basis (EU) — draft |
| --- | --- | --- | --- | --- | --- | --- |
| Account registration & login | Provide access, identity verification, security | Identity (name, email), credentials, IP, device | Users | Hosting, email provider (verification codes) | Account lifetime + 30 days post-deletion | Contract (Art. 6(1)(b)); legitimate interest for security logs (Art. 6(1)(f)) |
| Profile & preferences | Personalise experience, onboarding | Profile data, goals, settings, timezone | Users | Hosting | Account lifetime | Contract (Art. 6(1)(b)) |
| Workout & health logging | Core fitness product, progress tracking | Workout sessions, sets, PRs, steps, sleep, HR, weight, nutrition, body measurements | Users | Hosting, object storage (media) | Per retention policy; 7 years for export/legal hold | Contract (Art. 6(1)(b)); **explicit consent** for special-category health data (Art. 9(2)(a)) |
| Supplement & injection tracking | Health management feature | Stack schedules, injection logs, dosage | Users | Hosting | Account lifetime | Contract (Art. 6(1)(b)); explicit consent for health data (Art. 9(2)(a)) |
| Elevate / social features | Community interaction, content sharing | Posts, comments, reactions, profile visibility, messages metadata | Users | Hosting, realtime infra (Socket.IO) | Per post/account deletion rules | Contract (Art. 6(1)(b)); consent for optional public visibility |
| Coaching & client workflows | Coach–client relationship management | Intake forms (health history, injuries), session notes, scheduling, contracts, messages | Users, coaches | Hosting, Stripe (subscription billing) | Contract term + legal retention (financial records 7 years) | Contract (Art. 6(1)(b)); explicit consent for health intake data (Art. 9(2)(a)) |
| Payments & subscriptions | Process transactions, subscriptions, marketplace payouts | Payment metadata, billing address, tax identifiers; card data vaulted by Stripe | Users, coaches | Stripe | Per finance / legal rules (minimum 7 years) | Contract (Art. 6(1)(b)); legal obligation for tax records (Art. 6(1)(c)) |
| Email & notifications | Service communications, marketing (where opted in), weekly reports | Email address, name, notification content, unsubscribe tokens | Users | SMTP provider | Campaign logs per provider defaults; preferences indefinitely | Contract for transactional (Art. 6(1)(b)); consent for marketing (Art. 6(1)(a)) |
| Analytics (web) | Understand usage patterns, improve product | Pseudonymous usage events, page views, device metadata | Visitors / users | Google Analytics (consent-gated, cookie banner) | Vendor default (26 months max) | Consent (Art. 6(1)(a)) |
| Audit & security logs | Detect abuse, incident response, meet legal obligations | IP address, user agent, action type, resource ID (encrypted at rest) | Users, system | Hosting (internal only) | 12 months rolling; 7 years for compliance-relevant events | Legal obligation (Art. 6(1)(c)); legitimate interest (Art. 6(1)(f)) |
| Strava integration (optional) | Import workout activities | Strava profile, activity data, OAuth tokens (encrypted) | Users who connect | Strava (OAuth 2.0) | Until user disconnects or deletes account | Consent (Art. 6(1)(a)) |
| Withings integration (optional) | Import weight & body composition | Withings measurements, OAuth tokens (encrypted) | Users who connect | Withings (OAuth 2.0) | Until user disconnects or deletes account | Consent (Art. 6(1)(a)) |
| Data breach notifications | GDPR Art. 33/34 incident management | Affected data categories, admin notes, DPA correspondence | Admin users, DPA | Hosting, email provider | 3 years post-resolution | Legal obligation (Art. 6(1)(c)) |
| Consent records | Document user consent for audit trail | Consent type, version, timestamp, IP (encrypted) | Users | Hosting | Lifetime of account + 3 years post-deletion | Legal obligation (Art. 6(1)(c)); legitimate interest (Art. 6(1)(f)) |

## Lawful basis mapping (Art. 6 / 9) — draft

- **Contract (Art. 6(1)(b)):** Operating the core service the user signed up for — account, workouts, coaching, payments, messaging.
- **Explicit consent (Art. 9(2)(a)):** All special-category health data (workout logs, nutrition, sleep, HR, weight, body measurements, supplement/injection tracking). Consent is collected at onboarding and can be withdrawn via account deletion.
- **Consent (Art. 6(1)(a)):** Cookie-gated analytics, optional third-party integrations (Strava, Withings), marketing emails.
- **Legitimate interests (Art. 6(1)(f)):** Security monitoring, fraud prevention, product analytics — subject to balancing tests documented outside this file.
- **Legal obligation (Art. 6(1)(c)):** Tax and financial record retention, breach notification, mandatory data requests.

## Special category data (Art. 9)

The product processes **health and biometric data** as a core feature. Legal basis relied upon: explicit consent at onboarding (Art. 9(2)(a)). Users may withdraw consent at any time by deleting their account. Counsel must confirm whether any additional safeguards (e.g. HIPAA BAA for US users, separate consent flows per jurisdiction) are required before production launch in each market.

## Next steps for legal sign-off

1. Counsel review of lawful basis per activity — especially health data and coaching notes.
2. Confirm retention periods align with applicable law per jurisdiction.
3. Confirm "legitimate interests" balancing tests are documented (separate legal artefact).
4. Extend table when Google Fit, Garmin, or WHOOP integrations ship.
5. Sign off and date this document; version-control subsequent changes.
