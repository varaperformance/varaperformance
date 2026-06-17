# Vara Performance — Copilot Instructions

## Monorepo Layout

| Package | Path | Framework |
|---------|------|-----------|
| `@varaperformance/backend` | `apps/backend/` | NestJS 11, Prisma 7, TypeScript |
| `@varaperformance/web` | `apps/web/` | React 19, Vite 7, TypeScript |
| `@varaperformance/worker` | `apps/worker/` | NestJS 11 (RabbitMQ consumers) |
| `@varaperformance/core` | `packages/core/` | Shared types, Zod schemas, utils |

Package manager: **pnpm** (workspace). Containers: **Podman** (not Docker).

## Path Aliases

- Backend: `@app/common`, `@app/database`, `@app/security` → `libs/*/src`; `@generated/prisma` → `src/generated/prisma/client`
- Web: `@/` → `./src/*`
- Shared types: import from `@varaperformance/core`

## Backend Conventions

- **Prisma multi-file schema**: one `.prisma` file per domain in `prisma/schema/`
- **Validation**: Zod schemas in `@varaperformance/core`, converted to DTOs via `createZodDto` from `nestjs-zod`. Global `ZodValidationPipe` + `ZodSerializerInterceptor`
- **Auth**: global `AccessTokenGuard` (auth by default). Use `@Public()` to opt out. Use `@Permissions('resource:action')` for RBAC
- **Custom decorators**: `@ActiveUser()` for JWT payload, `@ClientIp()`, `@ClientMeta()`, `@UserAgent()`
- **Shared libs**: `@app/common` (storage, mailer, audit, filters, logger), `@app/security` (encryption, hashing, signatures), `@app/database` (Prisma, Redis)
- **Encryption**: AES-256-GCM envelope encryption via `EncryptionService`. Prisma `Bytes` fields return `Uint8Array` — wrap with `Buffer.from()` before decrypting
- **File uploads**: `memoryStorage()` + `allowedMimeTypes` passed to `StorageService.uploadBuffer()` for magic-byte validation. UUID-based S3 keys. Pre-signed URLs via `GET /media/signed-url`
- **Security codes**: use `crypto.randomInt()`, never `Math.random()`

## Frontend Conventions

- **DDD features**: 22 domains under `src/features/{domain}/` with barrel `index.ts`. Import from `@/features/{domain}`
- **Routing**: lazy imports in `routes/lazy-pages.ts` → `@/features/{domain}/pages/...`
- **Data fetching**: TanStack Query hooks per feature
- **UI**: shadcn/ui components in `src/components/ui/`
- **Lint rule**: do not call `setState` in `useEffect` for derived state — compute during render or in explicit user actions
- **Admin dialogs**: use app Dialog components, not browser `prompt()`/`confirm()`

## Capacitor (Mobile)

- **iOS dependency manager**: CocoaPods (not SPM). The `@capacitor-mlkit/barcode-scanning` plugin requires `GoogleMLKit`, which only distributes via CocoaPods
- iOS project created with `npx cap add ios --packagemanager CocoaPods`
- Podfile deployment target: iOS 16.0 (required by GoogleMLKit ~> 8.0.0)
- Build for iOS: `pnpm run build:cap` (vite build → cap sync) then open via `npx cap open ios`
- Custom `Info.plist` additions: Google reversed client ID URL scheme, `NSCameraUsageDescription`
- `App.entitlements`: Sign in with Apple capability
- Platform detection: `isNativeApp()` from `@/lib/capacitor` using `Capacitor.isNativePlatform()`
- Capacitor config: `server.hostname: "varaperformance.com"` → iOS WebView origin is `capacitor://varaperformance.com`

## Build & Test

- Rebuild `@varaperformance/core` before backend/web typecheck when shared schemas change
- Backend build: `pnpm --filter @varaperformance/backend build` (runs `prisma generate` + `nest build`)
- **Prisma generation**: run `pnpm prisma:generate` from the monorepo root after schema changes or rebase. Worker uses a symlink to the backend's generated client — never run bare `npx prisma generate` in the worker
- Worker tests need Prisma moduleNameMapper entries (see `apps/worker/package.json` jest config)
- Prisma shadow DB: use separate `mydatabase_shadow` database, not same-DB schema trick
