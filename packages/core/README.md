# @varaperformance/core

Shared Zod schemas, TypeScript interfaces, and core types used across all Vara Performance applications.

## Tech Stack

- **Validation** — [Zod](https://zod.dev/) 4
- **Language** — TypeScript 5.9
- **Build** — [tsup](https://tsup.egoist.dev/) (CJS + ESM + declarations)

## Exports

### Schemas

Zod validation schemas used for form validation, API request/response typing, and shared business logic:

- `user` — User registration, login, profile
- `blog` — Blog post creation and updates
- `category` — Blog categories
- `tag` — Blog tags
- `status` — Incident and service status
- `oauth` — OAuth provider data
- `common` — Shared utilities (pagination, API responses)

### Interfaces

- `response` — Standardized API response types

## Usage

Apps consume this package via the pnpm workspace protocol:

```json
"@varaperformance/core": "workspace:*"
```

```typescript
import { loginSchema, type LoginInput } from "@varaperformance/core";

const result = loginSchema.safeParse(formData);
```

## Development

All commands are run from the **monorepo root**.

```bash
# Build
pnpm --filter @varaperformance/core build

# Clean build output
pnpm --filter @varaperformance/core clean
```

The package must be built before apps that depend on it (backend, web) can use it. The CI pipelines handle this automatically.

## Output

```
dist/
├── index.js      # CommonJS
├── index.mjs     # ESM
├── index.d.ts    # CJS types
└── index.d.mts   # ESM types
```

## License

ISC
