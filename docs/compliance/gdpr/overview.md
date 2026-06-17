# GDPR compliance (gap analysis)

> **How to read this file:** Checkboxes mix shipped work, **internal** documentation, and **legal** follow-through. For **what is still open**, read **[What is still remaining](#what-is-still-remaining)** first. For a repo-wide backlog index, see [docs/README.md — Compliance](./README.md#compliance-gdpr).

Prioritized GDPR compliance findings and remediation tracking for the Vara Performance platform.
Audit date: April 7, 2026.

## What is still remaining

Use this section as the **source of truth** for open work. Section checkboxes below mix **shipped product**, **internal docs**, and **legal follow-through**; not every `[x]` means “closed for legal.”

### Engineering / product (not done)

| Area | Open items |
|------|------------|
| **§7 Breach notification (Art. 33–34)** | All **five** checklist lines below: model, admin workflow, 72h process, authority contacts, user notification template. |
| **§13 EU hosting (optional)** | **One** line: decide and, if required, implement **regional deployment for EU users**. |

### Documentation / operations (partially done)

| Area | Status |
|------|--------|
| **§13 Residency** | Internal template exists ([data-residency.md](./compliance/data-residency.md)). **Still do:** fill **real** regions per environment and confirm **Privacy Policy §7** matches. |
| **§9 Sub-processors** | Internal register + public Privacy summary shipped. **Still do:** keep register and policy **in sync** when vendors change; obtain **executed** DPAs where your program requires them (legal-held, not only URLs in repo). |

### Legal / counsel (draft vs final)

| Area | Status |
|------|--------|
| **§11 ROPA (Art. 30)** | **Draft** markdown exists. **Still do:** final Art. 30 record and **sign-off** as your counsel defines it. |
| **§14 Lawful basis (Art. 6 / 9)** | **Draft** table and sketch in same file. **Still do:** counsel review and **complete** mapping for every processing activity. |

---

## Critical — P0

### 1. Cookie Consent Banner (Art. 6, ePrivacy)

- [x] Remove `gtag.js` loading from `apps/web/index.html`
- [x] Add `CookieBanner` component gating GA loading behind `COOKIES` consent status
- [x] Add `analytics.ts` utility to manage GA lifecycle (load/remove)
- [x] Check consent against server records for authenticated users; localStorage for unauthenticated

### 2. Data Export — Right of Access / Portability (Art. 15, 20)

- [x] Implement `GET /v1/privacy/export` endpoint in `privacy.service.ts`
- [x] Aggregate user, profile (decrypted PII), addresses, consents, sessions, health data, workouts, notes, stacks, social, messaging metadata, calendar, notifications, commerce, coaching
- [x] Audit export via `AuditAction.EXPORT`
- [x] Add "Download My Data" button to Settings page

### 3. Self-Service Account Deletion — Right to Erasure (Art. 17)

- [x] Implement `DELETE /v1/privacy/account` endpoint in `privacy.service.ts`
- [x] Cascade: revoke sessions/consents, hard-delete health/social/notes/notifications, anonymize audit logs, create `DataRetention` record, soft-delete user with email redaction
- [x] Require `{ confirmation: "DELETE MY ACCOUNT" }` body for safety
- [x] Add "Delete My Account" button with confirmation dialog to Settings page
- [x] Audit deletion via `AuditAction.DELETE`

## High — P1

### 4. Data Retention Purge Scheduler (Art. 5(1)(e), 17)

- [x] Add daily CRON at 2 AM UTC with `pg_try_advisory_lock` for distributed safety
- [x] Batch process expired `DataRetention` records (batch size 100)
- [x] Handle user hard-delete + audit logs, `AuditLog` deletion, `Payment` anonymization, `ShopOrder` anonymization
- [x] Skip records under `legalHold`

### 5. Encryption Gaps in PII/PHI Fields (Art. 32)

- [x] Add AES-256-GCM envelope encryption to `Conversation.eLastMessage`
- [x] Add encryption to `ShopOrder.eEmail`
- [x] Add encryption to `ContractSignature.eSignatureMeta` (ipAddress + userAgent)
- [x] Add encryption to `FoodLog.eFoodDetails` (quickAddName + note)
- [x] Add encryption to `StackItem.eStackItem` (name + dosage + notes)
- [x] Add encryption to `ClimbEntry.eClimbContent` (imageUrl + note)
- [x] Add encryption to `Notification.eNotification` (body + data)
- [x] Add encryption to `AuditLog.eAuditMeta` (ipAddress + userAgent)
- [x] Add encryption to `Session.eSessionMeta` (ipAddress + userAgent)
- [x] Add encryption to `Consent.eConsentMeta` (ipAddress + userAgent)

### 6. Email Unsubscribe Links + Preferences (Art. 21)

- [x] Implement `GET/PUT /v1/consent/email-preferences` (authenticated)
- [x] Implement `POST /v1/consent/unsubscribe?token=` (public, HMAC-signed token)
- [x] Add `List-Unsubscribe` + `List-Unsubscribe-Post` headers (RFC 8058) to all user-facing emails
- [x] Update 5 email templates with conditional `{{#if unsubscribeUrl}}` footer block
- [x] Add Email Preferences card to settings page and `/unsubscribe` public page

## Medium — P2

### 7. Breach Notification Pipeline (Art. 33, 34)

- [ ] Add `BreachNotification` model to Prisma schema
- [ ] Build admin workflow for recording and managing breach incidents
- [ ] Implement 72-hour supervisory authority notification mechanism
- [ ] Configure supervisory authority contact details
- [ ] Build affected-user notification email template

### 8. Age Verification at Registration (Art. 8)

- [x] Fix 13/16 age inconsistency between ToS and `COMPLIANCE.md`
- [x] Add date-of-birth field at registration
- [x] Validate minimum age server-side
- [x] Block or require parental consent for under-16 users

### 9. DPA Documentation for Sub-Processors (Art. 28)

- [x] Document DPAs with Stripe (Stripe’s own DPA URL linked from **internal** register [sub-processors.md](./compliance/sub-processors.md) in the **private** repo)
- [x] Document DPAs with Strava (Strava legal/API hub linked in same **internal** register)
- [x] Document DPAs with SMTP provider (per-environment; obtain from chosen relay; noted in internal register)
- [x] Document DPAs with Google Analytics (Google measurement terms hub linked in internal register)
- [x] Maintain a sub-processor list and reference in Privacy Policy (**user-facing** summary table + **privacy@varaperformance.com** in `seed-legal-documents.ts` / SQL; **internal** full table in compliance doc, not a public URL by default)
- [ ] **Remaining (legal / program):** executed or countersigned **processor DPAs** where required, vendor risk assessments, and ongoing **sync** of internal register + public policy when subprocessors change

## Low — P3

### 10. Right to Restrict Processing (Art. 18)

- [x] Add `RESTRICTED` status to the user model
- [x] Pause processing while maintaining the account in restricted state

### 11. Formal ROPA (Art. 30)

- [x] Create **draft** Record of Processing Activities ([record-of-processing-activities.md](./compliance/record-of-processing-activities.md)) as engineering starting point
- [ ] **Final** Art. 30 ROPA: completeness review, corrections, and **privacy / legal sign-off** (draft alone is not sufficient)

### 12. Inline Privacy Notices at Data Collection Points (Art. 13, 14)

- [x] Add contextual privacy notices near health data input forms
- [x] Add contextual privacy notices near payment info forms
- [x] Add contextual privacy notices near profile update forms

### 13. Cross-Border Transfer Controls (Art. 44-49)

- [x] Add **internal** residency template ([data-residency.md](./compliance/data-residency.md)) in private repo
- [ ] **Complete** residency documentation: record **actual** regions per environment (app, DB, cache, queues, object storage, material vendors) and verify **Privacy Policy §7** (and any SCC / transfer statements) matches reality
- [ ] Consider **regional deployment for EU users** if product and legal conclude it is required

### 14. Per-Activity Lawful Basis Mapping (Art. 6, 30)

- [x] Add **draft** per-activity lawful basis table and Art. 6 / 9 sketch in [record-of-processing-activities.md](./compliance/record-of-processing-activities.md)
- [ ] **Counsel review** and **complete** lawful-basis mapping for every processing activity (draft is not sufficient)
