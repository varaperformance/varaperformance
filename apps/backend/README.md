# Vara Performance — Backend

NestJS API backend for Vara Performance, a fitness platform with identity
management, blog system, status page, and compliance-grade security.

## Tech Stack

- **Framework** — [NestJS](https://nestjs.com/) 11
- **Language** — TypeScript 5
- **Database** — PostgreSQL 17 via [Prisma](https://www.prisma.io/) 7
  (multi-file schema)
- **API** — GraphQL
  ([Apollo Server](https://www.apollographql.com/docs/apollo-server/) 5) + REST
- **Auth** — JWT with OAuth (Google, Apple) and Argon2 password hashing
- **Bundler** — Webpack 5

## Features

- **Authentication & Authorization** — JWT-based auth with RBAC and
  fine-grained permissions
- **OAuth** — Google and Apple sign-in
- **Audit Logging** — Comprehensive audit trail for SOC2, HIPAA, and PCI compliance
- **Encryption** — AES-256-GCM envelope encryption for PII/PHI
- **Rate Limiting** — Throttle protection via `@nestjs/throttler`
- **Structured Logging** — Pino for high-performance JSON logging
- **Blog System** — Posts with tags and categories
- **Status Page** — Incident tracking and service status
- **Avatar Generation** — Local SVG avatar generation with initials

## Project Structure

```text
apps/backend/
├── src/
│   ├── blog/           # Blog module (posts, tags, categories)
│   ├── idm/            # Identity management (auth, users, OAuth, RBAC)
│   ├── notes/          # Notes module
│   ├── status/         # Status page module
│   ├── theme/          # Theme module
│   └── generated/      # Prisma generated client
├── libs/
│   ├── common/         # Shared utilities and helpers
│   ├── database/       # Database service (Prisma)
│   └── security/       # Encryption, audit logging
├── prisma/
│   ├── schema/         # Multi-file Prisma schema
│   └── migrations/     # Database migrations
└── docs/               # Compliance documentation
```

## Documentation

- [Permission System (RBAC)](../../docs/backend/PERMISSIONS.md) — Role-based
  access control with fine-grained permissions
- [Audit & Compliance](../../docs/backend/AUDIT.md) — Audit logging for SOC2,
  HIPAA, and PCI compliance
- [Compliance Guidelines](../../docs/backend/COMPLIANCE.md) — Detailed
  compliance requirements and encryption guidelines
- [Migration Workflow](../../docs/backend/MIGRATIONS.md) — Prisma migration rules and recovery steps

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker (for PostgreSQL)

## Setup

All commands are run from the **monorepo root**.

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker compose -f apps/backend/compose.yaml up -d

# Run migrations
pnpm --filter backend exec prisma migrate dev

# Generate Prisma client
pnpm --filter backend prisma:generate
```

### Environment Variables

Create a `.env` file in `apps/backend/`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydatabase
ENCRYPTION_KEK=<base64-encoded-32-byte-key>
LOG_LEVEL=info
NODE_ENV=development
```

Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Development

```bash
# Watch mode
pnpm dev:backend

# Build
pnpm --filter backend build

# Format
pnpm --filter backend format

# Lint
pnpm --filter backend lint
```

## Testing

```bash
# Unit tests
pnpm --filter backend test

# E2E tests
pnpm --filter backend test:e2e

# Coverage
pnpm --filter backend test:cov
```

## License

MIT — see [LICENSE.md](../../LICENSE.md).
