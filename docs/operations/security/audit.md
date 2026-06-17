# Security audit

> **Status:** All **code** findings in this file are addressed unless noted “operational” or “CI.” Remaining: secret **rotation** (ops), optional **`pnpm audit` in CI**. Also listed in [docs/README.md — Security & operations](./README.md#security--operations).

Prioritized security findings and remediation tracking for the Vara Performance platform.
Audit date: April 9, 2026.

## Critical

### 1. Subscription IDOR

- [x] Add `userId` parameter to `pauseSubscription`, `resumeSubscription`, `cancelSubscription`
- [x] Verify subscription belongs to requesting user via booking `userId` before acting
- [x] Add integration test covering cross-user subscription access denial

### 2. Docker Containers Run as Root

- [x] Add `RUN addgroup -S app && adduser -S app -G app` and `USER app` to `apps/backend/Dockerfile`
- [x] Add non-root user to `apps/web/Dockerfile`
- [x] Add non-root user to `apps/worker/Dockerfile`

### 3. Hardcoded Credentials in compose.yaml

- [x] Replace PostgreSQL `postgres/postgres` with env var references
- [x] Replace RabbitMQ `guest/guest` with env var references
- [x] Replace SeaweedFS `vara_access_key` / `vara_secret_key_change_me` with env var references
- [x] Add `.env.example` with placeholder values for all compose secrets

### 4. Hardcoded Secrets in garage.toml

- [x] Externalize `rpc_secret` via environment variable or secrets manager
- [x] Externalize `admin_token` and `metrics_token`
- [ ] Rotate compromised secrets after moving to env vars

> **Operational**: Requires manual secret rotation in deployment environment. Not a code change.

### 5. Redis Exposed Without Authentication

- [x] Add `--requirepass` to Redis command in `compose.yaml`
- [x] Update backend `RedisService` to pass password in connection config
- [x] Bind Redis to `127.0.0.1` or Docker-internal network only

## High

### 6. JWT Secret Not Validated at Startup

- [x] Add startup assertion that `JWT_SECRET` is defined and meets minimum length
- [x] Fail fast with descriptive error if missing

### 7. File Uploads Lack Magic-Byte Validation

- [x] Install `file-type` package
- [x] Add buffer-level MIME verification to `StorageService.uploadBuffer`
- [x] Reject files where detected type does not match allowed types
- [x] Cover avatar, cover, post, blog, story, coach certification, and commerce uploads

### 8. No Content Security Policy

- [x] Enable CSP in backend Helmet configuration (`main.ts`)
- [x] Add CSP `<meta>` tag or header for frontend (Vite config / reverse proxy)
- [x] Allow required origins (Google Sign-In, Mapbox, Stripe, API domain)

### 9. `--no-frozen-lockfile` in All Dockerfiles

- [x] Switch to `--frozen-lockfile` in `apps/backend/Dockerfile`
- [x] Switch to `--frozen-lockfile` in `apps/web/Dockerfile`
- [x] Switch to `--frozen-lockfile` in `apps/worker/Dockerfile`

### 10. No Multi-Stage Docker Builds

- [x] Refactor `apps/backend/Dockerfile` to multi-stage (build + production)
- [x] Refactor `apps/web/Dockerfile` to multi-stage (build + nginx/static)
- [x] Refactor `apps/worker/Dockerfile` to multi-stage (build + production)
- [x] Exclude devDependencies from production images

### 11. No Runtime Validation on Worker Queue Payloads

- [x] Add Zod schemas for `AuditLogMessage` and all other consumer payloads
- [x] Apply validation pipe or manual parse in each `@RabbitSubscribe` handler
- [x] Route invalid payloads to dead-letter queue with error logging

## Medium

### 12. `Math.random()` Used for Security Codes

- [x] Replace with `crypto.randomInt()` for verification codes
- [x] Replace with `crypto.randomInt()` for password reset codes
- [x] Replace with `crypto.randomInt()` for registration codes

### 13. Swagger Exposed in Production

- [x] Guard Swagger setup behind `NODE_ENV !== 'production'` check in `main.ts`

### 14. Static Uploads Served Without ACL

- [x] Remove `/uploads/` static file serving or gate behind authentication
- [x] Serve user uploads via signed S3 URLs instead of direct file access

Resolved: uploads now store S3 keys (not full URLs). `MediaUrlInterceptor` resolves keys and legacy URLs to signed URLs in all API responses.

### 15. Registration Endpoint Lacks Specific Rate Limiting

- [x] Apply auth-tier throttle decorator (`5 req/60s`) to registration endpoint

### 16. Anonymous S3 Read on Upload Bucket

- [x] Remove `Read:varaperformance-uploads` anonymous access in compose S3 config
- [x] Serve uploads via pre-signed URLs or authenticated proxy

Resolved: `Read:varaperformance-uploads` is scoped to the authenticated `vara-app` identity — no anonymous read access exists. All media is now served through pre-signed URLs via `MediaUrlInterceptor`.

### 17. No Frontend CSRF Token

- [x] Verify backend sets `SameSite=Lax` (minimum) on auth cookies
- [x] If `SameSite` is not enforced, implement double-submit CSRF token pattern

Resolved: `SameSite=Lax` + `HttpOnly` + `Secure` are set on all auth cookies in `idm.controller.ts`. No additional CSRF token needed.

### 18. `marked.parse()` Without DOMPurify

- [x] Install `dompurify` and `@types/dompurify`
- [x] Wrap `marked.parse()` output with `DOMPurify.sanitize()` in blog admin

### 19. Auth Tokens in localStorage on Capacitor

- [x] Migrate native token storage to `@capacitor/preferences` or `capacitor-secure-storage-plugin`

### 20. `.env.ios` Committed to Git

- [x] Add `.env.ios` to `.gitignore`
- [x] Remove from git tracking (`git rm --cached`)
- [ ] Rotate any credentials present in the file

> **Operational**: Requires manual credential rotation. Not a code change.

### 21. Worker Env Vars Read Without Validation

- [x] Add `ConfigModule` with Zod/Joi schema to worker app
- [x] Validate `BACKEND_URL`, `INTERNAL_API_KEY`, `NOTIFICATION_DIGEST_*` at startup

### 22. Wildcard Dependency Version

- [x] Pin `@nestjs/mapped-types` to a caret range in `apps/backend/package.json`

### 23. Internal Push Notification Endpoint Uses Static API Key

- [x] Replace static `===` key comparison with HMAC-signed payloads
- [x] Or restrict endpoint to internal network only (not publicly routable)

Resolved: Created `InternalApiGuard` with HMAC-SHA256 signature verification (primary) and constant-time `timingSafeEqual` key comparison (fallback). Applied to notification push and strava sync endpoints via `@InternalEndpoint()` + `@UseGuards(InternalApiGuard)`.

### 24. No Response Serialization Layer

- [x] Align payment/subscription responses to explicit Prisma selectors
- [x] Establish convention: every response uses explicit Prisma `select` or a serializer
- [x] Consider adding `ClassSerializerInterceptor` with `@Exclude()` on sensitive model fields

Resolved: `MediaUrlInterceptor` registered globally resolves all media URL fields (avatarUrl, coverUrl, imageUrl, etc.) to pre-signed URLs. Combined with existing `ZodSerializerInterceptor` and explicit Prisma selectors for sensitive data protection.

## Low

### 25. Unvalidated DTOs

- [x] Create Zod DTO for `createProductReview` body in commerce controller
- [x] Create Zod DTO for `updateBookingStatus` body in coaching controller

### 26. Node 25 Base Image (Not LTS)

- [x] Switch Dockerfiles to Node 22 LTS (`node:22-alpine`)
- [x] Pin to patch version + digest for reproducible builds

### 27. Unvalidated Redirect Query Param

- [x] Add allowlist guard (`startsWith("/") && !startsWith("//")`) in register and verification pages

### 28. Unmaintained Toast UI Dependencies

- [x] Audit usage of `@toast-ui/editor` and `@toast-ui/react-editor`
- [x] Remove if only Tiptap is used for blog editing

### 29. Compose Services Bound to 0.0.0.0

- [x] Bind internal-only services (PostgreSQL, Redis, RabbitMQ) to `127.0.0.1`
- [x] Define separate Docker networks (`frontend`, `backend`, `data`)

### 30. No `pnpm audit` in CI

- [ ] Add `pnpm audit --audit-level=high` step to CI pipeline
