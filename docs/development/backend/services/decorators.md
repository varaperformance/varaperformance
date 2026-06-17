# Request Context Decorators

Reusable parameter decorators for extracting request metadata such as client IP
address and user agent. These are commonly needed for audit logging, session
tracking, and SOC2 compliance.

## Available Decorators

| Decorator       | Returns               | Description            |
| --------------- | --------------------- | ---------------------- |
| `@ClientIp()`   | `string \| undefined` | Client IP address      |
| `@UserAgent()`  | `string \| undefined` | User-Agent header      |
| `@ClientMeta()` | `ClientMetadata`      | Both IP and user agent |

## Usage

### Individual Decorators

```typescript
import { ClientIp, UserAgent } from '@app/common/decorators';

@Post('login')
async login(
  @Body() dto: LoginDto,
  @ClientIp() ip: string | undefined,
  @UserAgent() userAgent: string | undefined,
) {
  return this.authService.login(dto, ip, userAgent);
}
```

### Combined Context

When you need both values, use `@ClientMeta()` to reduce boilerplate:

```typescript
import { ClientMeta, type ClientMetadata } from '@app/common/decorators';

@Post('login')
async login(
  @Body() dto: LoginDto,
  @ClientMeta() meta: ClientMetadata,
) {
  return this.authService.login(dto, meta.ipAddress, meta.userAgent);
}
```

### ClientMetadata Interface

```typescript
interface ClientMetadata {
  ipAddress?: string;
  userAgent?: string;
}
```

## IP Address Resolution

The `@ClientIp()` and `@ClientMeta()` decorators resolve IP addresses in this
order:

1. `x-forwarded-for` header (first IP in the list) — used by reverse proxies
2. `req.ip` — Express parsed IP
3. `req.socket.remoteAddress` — TCP socket address

This ensures correct IP detection when behind load balancers or proxies.

## Common Use Cases

### Audit Logging

```typescript
@Post('change-password')
async changePassword(
  @ActiveUser() user: JwtPayload,
  @ClientMeta() meta: ClientMetadata,
) {
  await this.auditService.log({
    userId: user.sub,
    action: AuditAction.PASSWORD_CHANGE,
    resource: 'User',
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  // ...
}
```

### Session Management

```typescript
@Post('logout')
async logout(
  @ActiveUser() user: JwtPayload,
  @ClientMeta() meta: ClientMetadata,
) {
  await this.sessionService.invalidate(user.sub, meta);
}
```

### Rate Limiting by IP

```typescript
@Get('resource')
async getResource(@ClientIp() ip: string | undefined) {
  await this.rateLimiter.check(ip);
  // ...
}
```

## Import Path

```typescript
import {
  ClientIp,
  UserAgent,
  ClientMeta,
  type ClientMetadata,
} from "@app/common/decorators";
```
