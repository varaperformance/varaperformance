# Contributing to Vara Performance

Thank you for your interest in contributing! This project welcomes bug reports, feature suggestions, and pull requests from the community.

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker (or Podman) with Compose
- Go >= 1.22 (for hack scripts only)

### Local Setup

```bash
# Clone the repo
git clone https://github.com/varaperformance/varaperformance.git
cd varaperformance

# Install dependencies
pnpm install

# Copy environment files and fill in your values
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env

# Start local services (Postgres, Redis, RabbitMQ, MinIO)
docker compose up -d

# Run database migrations
pnpm db:migrate:dev

# Start dev servers
pnpm dev:backend   # NestJS API on :3000
pnpm dev:web       # Vite frontend on :5173
```

See [hack/README.md](hack/README.md) for seeding exercises, recipes, and food data.

## Project Structure

```text
apps/backend/   — NestJS 11 API (Prisma, PostgreSQL)
apps/web/       — React 19 frontend (Vite, Tailwind, Capacitor)
apps/worker/    — NestJS worker (RabbitMQ consumers)
packages/core/  — Shared Zod schemas, TypeScript types
docs/           — Architecture and domain documentation
hack/           — One-off seed and data pipeline scripts
```

## How to Contribute

### Reporting Bugs

1. Search [existing issues](https://github.com/varaperformance/varaperformance/issues) first
2. Open a new issue using the **Bug Report** template
3. Include: steps to reproduce, expected vs actual behavior, environment details

### Suggesting Features

1. Check the [roadmap](docs/ROADMAP.md) and open issues
2. Open an issue using the **Feature Request** template
3. Describe the use case and why it belongs in the core project

### Submitting a Pull Request

1. Fork the repo and create a branch from `main`
2. Follow the branch naming convention below
3. Make your changes with tests where applicable
4. Ensure all checks pass (`pnpm lint && pnpm test`)
5. Open a PR against `main` — fill out the PR template

## Branch Naming

| Type | Pattern | Example |
| ---- | ------- | ------- |
| Feature | `feature/<description>` | `feature/workout-templates` |
| Bug fix | `fix/<description>` | `fix/token-refresh-loop` |
| Hotfix | `hotfix/<description>` | `hotfix/login-redirect` |
| Docs | `docs/<description>` | `docs/seeding-guide` |

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Scopes** (examples): `auth`, `workouts`, `nutrition`, `social`, `payments`, `integrations`, `database`, `security`

```bash
git commit -m "feat(workouts): add superset support to workout builder"
git commit -m "fix(auth): resolve Apple Sign-In redirect on iOS 17"
git commit -m "docs(hack): add food extraction usage examples"
```

## Code Style

- ESLint and Prettier configs are provided — run `pnpm lint` before pushing
- Backend follows NestJS module conventions — one feature per module
- Frontend components live under `src/features/<domain>/`
- Shared types and Zod schemas go in `packages/core/`
- No comments unless the *why* is non-obvious

## Testing

```bash
# All tests
pnpm test

# Individual packages
pnpm --filter @varaperformance/backend test
pnpm --filter @varaperformance/web test
pnpm --filter @varaperformance/core test

# Backend e2e
pnpm --filter @varaperformance/backend test:e2e
```

## Security Vulnerabilities

Do not open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for the private disclosure process.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE.md).
