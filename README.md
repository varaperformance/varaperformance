# Vara Performance

Monorepo for Vara Performance applications.

## Structure

```text
varaperformance/
├── docs/
│   ├── backend/       # Backend docs (audit, services, permissions, etc.)
│   ├── web/           # Web app docs (feature notes, security)
│   └── worker/        # Worker service docs
├── packages/
│   └── core/          # @varaperformance/core - Shared Zod schemas, types,
│                     # types, and interfaces
└── apps/
    ├── backend/       # NestJS API
    ├── web/           # Vite React frontend
    └── worker/        # NestJS RMQ worker
```

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

## Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Development

```bash
# Start backend dev server
pnpm dev:backend

# Start web dev server
pnpm dev:web

# Start worker dev server
pnpm dev:worker

# Start backend + worker together
pnpm dev:workspace
```

## Package Scripts

| Command              | Description                       |
| :------------------- | :-------------------------------- |
| `pnpm build`         | Build all packages                |
| `pnpm dev:backend`   | Start backend in watch mode       |
| `pnpm dev:web`       | Start web dev server              |
| `pnpm dev:worker`    | Start worker in watch mode        |
| `pnpm dev:workspace` | Start backend and worker together |
| `pnpm lint`          | Lint all packages                 |

## Docs

- Backend: [docs/backend/AUDIT.md](docs/backend/AUDIT.md),
  [docs/backend/COMPLIANCE.md](docs/backend/COMPLIANCE.md),
  [docs/backend/DECORATORS.md](docs/backend/DECORATORS.md),
  [docs/backend/ENCRYPTION.md](docs/backend/ENCRYPTION.md),
  [docs/backend/PERMISSIONS.md](docs/backend/PERMISSIONS.md),
  [docs/backend/SERVICES.md](docs/backend/SERVICES.md)
- Web: [docs/web/FEATURES.md](docs/web/FEATURES.md),
  [docs/web/SECURITY.md](docs/web/SECURITY.md)
- Worker: docs/worker (add docs as the service grows)

## Workspace Packages

### @varaperformance/core

Shared schemas and types used across all applications:

- Zod validation schemas
- TypeScript interfaces
- Common types and enums

Apps import from core using the workspace protocol:

```json
"@varaperformance/core": "workspace:*"
```

Changes to core are immediately available to all apps without publishing.

## License

ISC
