# Service Development Guide

This document explains the standard patterns for creating services in the backend, including return types, response interfaces, and error handling.

## Integration Data Boundary

When implementing third-party integrations (for example Strava), follow this storage split:

- Sensitive integration credentials and connection state: store encrypted in KeyStore.
- Product-facing domain data: persist in the owning domain tables.

Example policy for workouts:

- Integration sync can temporarily store encrypted raw/summarized provider payloads in KeyStore for secure transport and troubleshooting.
- If activities must appear in workout log UX, import/project them into workout session tables.
- Do not treat KeyStore as a replacement for workout domain persistence.

## Response Interfaces

All API responses follow a consistent structure defined in `@varaperformance/core`. Import the types you need:

```typescript
import { SuccessResponse, ErrorResponse } from "@varaperformance/core";
```

### SuccessResponse\<T\>

Used when an operation succeeds. The generic `T` specifies the shape of the `data` field.

```typescript
interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}
```

### ErrorResponse

Used when an operation fails. Always includes an error object with code and message.

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

## Creating Domain Interfaces

Each service domain should have its own interface file in `@varaperformance/core`:

```
packages/core/src/interfaces/
├── index.ts              # Re-exports all interfaces
├── response.interface.ts # Base response types
├── notes.interface.ts    # Notes domain
├── blog.interface.ts     # Blog domain
├── status.interface.ts   # Status domain
└── idm.interface.ts      # Identity management
```

### Example: Notes Interface

```typescript
// packages/core/src/interfaces/notes.interface.ts

/**
 * Note response returned from API
 */
export interface NoteResponse {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated notes list response
 */
export interface NotesListData {
  items: NoteResponse[];
  total: number;
  page: number;
  limit: number;
}
```

### Register in Index

After creating a new interface file, export it from `index.ts`:

```typescript
// packages/core/src/interfaces/index.ts
export * from "./response.interface";
export * from "./notes.interface";
export * from "./blog.interface";
// ... add new exports here
```

Then rebuild the core package:

```bash
pnpm --filter @varaperformance/core build
```

## Service Method Patterns

### Single Resource Operations

For operations returning a single resource (create, read, update):

```typescript
async create(data: CreateDto): Promise<SuccessResponse<ResourceResponse>> {
  const resource = await this.db.resource.create({ data });
  return { success: true, data: resource };
}

async findOne(id: string): Promise<SuccessResponse<ResourceResponse> | ErrorResponse> {
  const resource = await this.db.resource.findUnique({ where: { id } });

  if (!resource) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    };
  }

  return { success: true, data: resource };
}
```

### List Operations

For paginated list operations, create a dedicated list data interface:

```typescript
// In core interfaces
export interface ResourcesListData {
  items: ResourceResponse[];
  total: number;
  page: number; // For page-based pagination
  limit: number;
}

// Or for offset-based pagination
export interface ResourcesListData {
  items: ResourceResponse[];
  total: number;
  offset: number;
  limit: number;
}
```

```typescript
// In service
async findAll(query: QueryDto): Promise<SuccessResponse<ResourcesListData>> {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.db.resource.findMany({ skip, take: limit }),
    this.db.resource.count(),
  ]);

  return {
    success: true,
    data: { items, total, page, limit },
  };
}
```

### Delete Operations

For delete operations, use `MessageData` or a domain-specific message interface:

```typescript
export interface ResourceDeleteData {
  message: string;
}
```

```typescript
async remove(id: string): Promise<SuccessResponse<ResourceDeleteData> | ErrorResponse> {
  const resource = await this.db.resource.findUnique({ where: { id } });

  if (!resource) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    };
  }

  await this.db.resource.delete({ where: { id } });

  return {
    success: true,
    data: { message: 'Resource deleted successfully' },
  };
}
```

## Error Handling

### Return Errors vs Throw Exceptions

**Prefer returning `ErrorResponse`** for expected error conditions:

```typescript
// ✅ Good - Returns error response
if (!resource) {
  return {
    success: false,
    error: { code: "NOT_FOUND", message: "Resource not found" },
  };
}

// ❌ Avoid - Throwing for expected cases
if (!resource) {
  throw new NotFoundException("Resource not found");
}
```

**Use exceptions** for unexpected errors or when middleware needs to handle it:

```typescript
// Acceptable - Authentication/authorization failures
throw new UnauthorizedException("Invalid credentials");
throw new ForbiddenException("Insufficient permissions");
```

### Standard Error Codes

| Code               | Description                               |
| ------------------ | ----------------------------------------- |
| `NOT_FOUND`        | Resource doesn't exist                    |
| `CONFLICT`         | Resource already exists or state conflict |
| `VALIDATION_ERROR` | Input validation failed                   |
| `UNAUTHORIZED`     | Authentication required                   |
| `FORBIDDEN`        | Insufficient permissions                  |
| `INTERNAL_ERROR`   | Unexpected server error                   |

## Type Safety with Prisma

When Prisma returns data that matches your interface, you may need to cast:

```typescript
async getBlogs(): Promise<SuccessResponse<BlogsListData>> {
  const items = await this.db.blog.findMany({
    select: blogSelector,
  });

  return {
    success: true,
    data: {
      items: items as unknown as BlogResponse[],
      total,
      limit,
      offset,
    },
  };
}
```

This is acceptable when the Prisma select matches your interface shape. The `as unknown as` cast is needed because Prisma generates its own types.

## Complete Service Example

```typescript
import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@app/database";
import type {
  SuccessResponse,
  ErrorResponse,
  NoteResponse,
  NotesListData,
} from "@varaperformance/core";
import type { CreateNote, UpdateNote, NoteQuery } from "@varaperformance/core";

interface NoteDeleteData {
  message: string;
}

@Injectable()
export class NotesService {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    data: CreateNote,
  ): Promise<SuccessResponse<NoteResponse>> {
    const note = await this.db.note.create({
      data: { ...data, userId },
    });
    return { success: true, data: this.formatResponse(note) };
  }

  async findAll(
    userId: string,
    query: NoteQuery,
  ): Promise<SuccessResponse<NotesListData>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      this.db.note.findMany({ where: { userId }, skip, take: limit }),
      this.db.note.count({ where: { userId } }),
    ]);

    return {
      success: true,
      data: {
        items: notes.map((n) => this.formatResponse(n)),
        total,
        page,
        limit,
      },
    };
  }

  async findOne(
    userId: string,
    id: string,
  ): Promise<SuccessResponse<NoteResponse> | ErrorResponse> {
    const note = await this.db.note.findFirst({
      where: { id, userId },
    });

    if (!note) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Note not found" },
      };
    }

    return { success: true, data: this.formatResponse(note) };
  }

  async update(
    userId: string,
    id: string,
    data: UpdateNote,
  ): Promise<SuccessResponse<NoteResponse> | ErrorResponse> {
    const existing = await this.db.note.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Note not found" },
      };
    }

    const note = await this.db.note.update({
      where: { id },
      data,
    });

    return { success: true, data: this.formatResponse(note) };
  }

  async remove(
    userId: string,
    id: string,
  ): Promise<SuccessResponse<NoteDeleteData> | ErrorResponse> {
    const note = await this.db.note.findFirst({
      where: { id, userId },
    });

    if (!note) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Note not found" },
      };
    }

    await this.db.note.delete({ where: { id } });

    return {
      success: true,
      data: { message: "Note deleted successfully" },
    };
  }

  private formatResponse(note: {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }): NoteResponse {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }
}
```

## Checklist for New Services

1. [ ] Create domain interfaces in `packages/core/src/interfaces/{domain}.interface.ts`
2. [ ] Export interfaces from `packages/core/src/interfaces/index.ts`
3. [ ] Rebuild core: `pnpm --filter @varaperformance/core build`
4. [ ] Import interfaces in service: `import { ... } from '@varaperformance/core'`
5. [ ] Use `SuccessResponse<T>` for success returns with specific data type
6. [ ] Use `ErrorResponse` for error returns (not exceptions for expected errors)
7. [ ] Create list data interfaces for paginated endpoints
8. [ ] Add JSDoc comments to interface properties
9. [ ] Run lint to verify types: `pnpm --filter backend lint`
