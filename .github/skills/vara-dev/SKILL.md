---
name: vara-dev
description: "Vara Performance monorepo development skill. Use when: adding features, creating modules, building pages, connecting backend to frontend, working with Prisma schemas, creating Zod DTOs, adding upload endpoints, implementing encryption, building DDD feature domains, configuring RBAC permissions, adding TanStack Query hooks."
---

# Vara Performance — Development Skill

Detailed architecture reference for the Vara Performance fitness platform monorepo.

## When to Use

- Adding a new backend module or feature endpoint
- Creating a new frontend feature domain
- Connecting a new Prisma model end-to-end (schema → DTO → service → controller → hook → page)
- Implementing encrypted fields, uploads, or RBAC-gated endpoints
- Debugging cross-package type issues

## Architecture Overview

### Backend Module Pattern

Every feature follows this structure in `apps/backend/src/{domain}/`:

```
{domain}/
├── {domain}.module.ts       # NestJS module (import services, controllers)
├── {domain}.controller.ts   # REST endpoints
├── {domain}.service.ts      # Business logic (injects DatabaseService)
├── dto/
│   └── {domain}.dto.ts      # Zod DTOs via createZodDto
└── selectors/
    └── {domain}.selector.ts # Prisma select objects to control returned fields
```

**New module checklist:**
1. Create Prisma schema file: `prisma/schema/{domain}.prisma`
2. Define Zod schemas in `packages/core/src/schemas/{domain}.schema.ts` and export from `packages/core/src/index.ts`
3. Create DTO: `import { createZodDto } from 'nestjs-zod'; export class CreateXDto extends createZodDto(CreateXSchema) {}`
4. Create service injecting `DatabaseService` (wraps Prisma)
5. Create controller with `@Permissions('{domain}:create')` etc.
6. Register module in `apps/backend/src/app.module.ts`
7. Rebuild core: `pnpm --filter @varaperformance/core build`
8. Run `pnpm --filter @varaperformance/backend build`

### Prisma Multi-File Schema

Each domain has its own `.prisma` file in `prisma/schema/`. Prisma 7 merges them automatically via the `prismaSchemaFolder` preview feature.

- Base config (generator, datasource) lives in `prisma/schema/base.prisma`
- 38 domain schema files coexist
- Migrations: `prisma migrate dev --name {description}` with shadow DB on `mydatabase_shadow`
- After schema changes: `prisma generate` regenerates the client at `src/generated/prisma/client`

### Prisma Client Generation (Backend + Worker)

The Prisma generator outputs to `apps/backend/src/generated/prisma/`. The **worker** does not have its own generated client — instead, `apps/worker/src/generated/prisma` is a **symlink** pointing to `../../../backend/src/generated/prisma`.

**How to regenerate after schema changes or rebase:**
```bash
# From monorepo root — generates backend client, worker symlink picks it up:
pnpm prisma:generate

# Or individually:
pnpm --filter @varaperformance/backend prisma:generate   # generates client
pnpm --filter @varaperformance/worker prisma:generate     # ensures symlink exists
```

**Key rules:**
- **Never run bare `npx prisma generate`** in the worker directory — it outputs to the backend path and the worker won't see it. Always use `pnpm run prisma:generate` which creates/verifies the symlink.
- `pnpm dev:workspace` automatically runs `pnpm prisma:generate` before starting dev servers.
- The worker's `build` script also runs `prisma:generate` first.
- CI (`worker.yml`) calls `pnpm --filter @varaperformance/worker prisma:generate` which handles the symlink.
- If the symlink is missing (e.g. after `git clean`), run `pnpm prisma:generate` from the root.
- Both `apps/backend/src/generated/prisma` and `apps/worker/src/generated/` are gitignored.

### Zod → DTO Pipeline

```
packages/core/src/schemas/{domain}.schema.ts   ← Zod schemas (shared)
    ↓ import
apps/backend/src/{domain}/dto/{domain}.dto.ts  ← createZodDto wrappers
    ↓ applied by
Global ZodValidationPipe (auto-strips unknown fields, validates types)
Global ZodSerializerInterceptor (serializes responses)
```

### Frontend Feature Domain Pattern

Every domain lives under `apps/web/src/features/{domain}/`:

```
features/{domain}/
├── index.ts                 # Barrel export (hooks + page lazy refs)
├── hooks/
│   └── use-{domain}.ts      # TanStack Query hooks (useQuery, useMutation)
└── pages/
    └── {domain}/
        └── index.tsx         # Page component
```

**New feature checklist:**
1. Create directory structure under `src/features/{domain}/`
2. Create TanStack Query hook calling `api.get/post/put/delete` from `@/lib/api`
3. Create page component
4. Add lazy import to `src/routes/lazy-pages.ts`
5. Add route to `src/routes/route-sections.tsx`
6. Export from barrel `index.ts`

### Security Patterns

See [security reference](./references/security.md) for encryption, upload, and auth patterns.

### Cross-Package Types

When `@varaperformance/core` schemas change:
1. Rebuild core: `pnpm --filter @varaperformance/core build`
2. Then rebuild consumers: backend, web, or worker
3. Stale types from core cause false compile errors — always rebuild core first

### Shared Libraries (`libs/`)

| Alias | Path | Contents |
|-------|------|----------|
| `@app/common` | `libs/common/src/` | StorageService, MailService, AuditService, decorators, filters, logger, avatar generation |
| `@app/database` | `libs/database/src/` | DatabaseService (Prisma), RedisService |
| `@app/security` | `libs/security/src/` | EncryptionService, HashingService, SignatureService |

### Capacitor (Mobile)

The web app is wrapped as a native iOS app using Capacitor 8.

- **iOS dependency manager**: CocoaPods (not SPM). Created with `npx cap add ios --packagemanager CocoaPods`
- **Why CocoaPods**: `@capacitor-mlkit/barcode-scanning` depends on `GoogleMLKit/BarcodeScanning`, which only distributes via CocoaPods (no SPM support)
- Podfile at `apps/web/ios/App/Podfile`, deployment target iOS 16.0
- Plugins are auto-registered in the Podfile by `cap sync`
- `npx cap sync ios` copies web assets + runs `pod install`
- `npx cap open ios` opens the `.xcworkspace` in Xcode
- Custom iOS files to preserve across `cap add` recreations:
  - `Info.plist`: Google reversed client ID URL scheme, `NSCameraUsageDescription`, `CAPACITOR_DEBUG`
  - `App.entitlements`: Sign in with Apple
- Platform detection: `isNativeApp()` from `@/lib/capacitor`
- Capacitor config: `server.hostname: "varaperformance.com"` → WebView origin `capacitor://varaperformance.com`

### RBAC Permission Conventions

Permissions follow strict `resource:action` format where `resource` matches the domain/controller being protected.

**Naming rules:**
- Resource name = the domain noun, not a generic bucket (e.g. `challenge:read`, not `health:read` on ChallengeController)
- Standard actions: `create`, `read`, `update`, `delete`
- Special actions when needed: `cancel` (booking), `refund` (payment), `moderate` (elevate), `add-note` (incident)
- Compound resources use hyphens: `release-note:create`, `shop:catalog-read`
- Never use `admin:write` — split into `admin:create`, `admin:update`, `admin:delete`

**Resource → controller mapping:**
| Resource | Controller(s) |
|----------|---------------|
| `admin` | AdminController, IdmController (admin routes) |
| `challenge` | ChallengeController, AdminChallengeController |
| `marketing` | MarketingController |
| `team` | TeamController |
| `contract` | ContractController (admin endpoints) |
| `nutrition` | NutritionController (admin food endpoints) |
| `recipe` | RecipesController (admin), RecipeCategoriesController |
| `release-note` | ReleaseNotesController |
| `spotlight` | SpotlightController |
| `climb` | ClimbController |
| `integration` | StravaIntegrationController |
| `achievement` | AchievementsController |
| `booking` | CoachingPaymentController (booking endpoints) |
| `coaching` | CoachingController, AvailabilityController |

**Frontend guards:**
- Admin sidebar: each nav item has `requiredPermission` matching the `resource:read` needed
- Route guards: `<ProtectedRoute requiredPermission="resource:read" />` wraps admin routes
- Permission checks: `useAuth().hasPermission('resource:action')`

**Seed files:** `prisma/seeds/seed-rbac.ts` (Prisma) and `seed-rbac.sql` (raw SQL) — both must stay in sync.

**Docs:** `docs/backend/ROLES.md` (role permission tables) and `docs/backend/PERMISSIONS.md` (controller permission matrix) — update after any permission changes.

## Capacitor iOS Builds

**CRITICAL:** When building for iOS (or Android), always use the Capacitor build script — never the default `build`:

```bash
cd apps/web && pnpm run build:cap
```

This runs `vite build --mode ios && cap sync`, which loads `.env.ios` with production URLs (`https://varaperformance.com`).

Using `pnpm --filter @varaperformance/web build` (default mode) loads `.env` which points to `http://localhost:3000` — this is unreachable on a real device and causes silent network failures (e.g., `/me` request hangs → `isLoading` stuck → UI appears broken).

## Timezone-Aware Date Handling

**CRITICAL:** Never use `new Date().toISOString().split('T')[0]` or `toISOString().slice(0, 10)` to get "today's date". At 9pm CDT (UTC-5), `new Date()` in UTC is already the next day. This caused a production bug where "Daily Progress" on the Steps page transitioned to the next day at 9pm CDT.

### Core Helpers (`@varaperformance/core`)

| Function | Purpose |
|----------|---------|
| `getEffectiveTimezone(profileTz?)` | Returns user's IANA timezone from profile or browser fallback |
| `getTodayInTimezone(tz)` | Returns `YYYY-MM-DD` string for today in the given timezone |
| `getDaysAgoInTimezone(days, tz)` | Returns `YYYY-MM-DD` string for N days ago in the given timezone |
| `formatDateInTimezone(date, tz)` | Formats a `Date` object as `YYYY-MM-DD` in the given timezone |
| `getRelativeDateInTimezone(date, tz)` | Returns "Today", "Yesterday", or formatted date string |
| `formatDisplayDateInTimezone(date, tz, opts)` | Locale-aware display formatting |

### Backend Pattern

```typescript
import { getEffectiveTimezone, getTodayInTimezone } from '@varaperformance/core';

// Look up user's configured timezone
const profile = await this.db.profile.findUnique({
  where: { userId },
  select: { timezone: true },
});
const tz = getEffectiveTimezone(profile?.timezone);
const today = getTodayInTimezone(tz); // "2026-04-20"
```

### Frontend Pattern

```typescript
import { useTimezone } from '@/features/profile';
import { getTodayInTimezone, formatDateInTimezone } from '@varaperformance/core';

const timezone = useTimezone(); // from profile or browser fallback
const todayKey = getTodayInTimezone(timezone);
const dateKey = formatDateInTimezone(someDate, timezone);
```

### Safe: Formatting Stored Dates

Using `toISOString().split('T')[0]` on **stored** dates (e.g., `log.date`, `session.performed`) that are already UTC midnight is safe. The bug only occurs when converting `new Date()` (current time) to a date string.

### Unsafe Patterns to Avoid

```typescript
// ❌ BAD — UTC conversion shifts date near midnight in user's timezone
new Date().toISOString().split('T')[0]
new Date().toISOString().slice(0, 10)
startOfDay(date).toISOString().slice(0, 10)

// ✅ GOOD — timezone-aware
getTodayInTimezone(tz)
formatDateInTimezone(date, tz)

// ✅ GOOD — local date formatting without UTC conversion
const d = new Date(date);
`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
```
