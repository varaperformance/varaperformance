# Audit & Compliance

This application includes built-in audit logging for SOC2, HIPAA, and PCI compliance.

## Audit Logging

All HTTP requests are automatically logged to the `AuditLog` table. The interceptor captures:

- User ID (from JWT)
- Action (CREATE, READ, UPDATE, DELETE, LOGIN, etc.)
- Resource and Resource ID
- IP Address and User Agent
- Request metadata and duration

## Usage

```typescript
// Auto-logs all routes (action inferred from HTTP method)

// Explicit audit metadata:
import { Audit, AuditAction } from '@app/common/audit';

// resourceIdField extracts 'id' from the RESPONSE body (after handler runs)
@Audit({ action: AuditAction.CREATE, resource: 'User', resourceIdField: 'id' })
@Post()
createUser() { return { id: 'abc-123', ... }; }  // id extracted from this response

// resourceIdParam extracts from request params (for GET/PUT/DELETE)
@Audit({ action: AuditAction.UPDATE, resource: 'User', resourceIdParam: 'id' })
@Put(':id')
updateUser(@Param('id') id: string) {}

// Skip audit for specific routes:
import { SkipAudit } from '@app/common/audit';

@SkipAudit()
@Get('health')
healthCheck() {}
```

## Manual Audit Logging

```typescript
import { AuditService } from '@app/common/audit';

// In your service:
constructor(private readonly auditService: AuditService) {}

// Log specific events:
await this.auditService.logLogin(userId, ipAddress, userAgent);
await this.auditService.logLogout(userId);
await this.auditService.logPasswordChange(userId);
await this.auditService.logFailedLogin(email, ipAddress, reason);
await this.auditService.logDataExport(userId, 'UserData', { format: 'csv' });
```

## Audit Actions

| Action            | Description          |
| ----------------- | -------------------- |
| `CREATE`          | Resource created     |
| `READ`            | Resource accessed    |
| `UPDATE`          | Resource modified    |
| `DELETE`          | Resource deleted     |
| `LOGIN`           | User login           |
| `LOGOUT`          | User logout          |
| `FAILED_LOGIN`    | Failed login attempt |
| `PASSWORD_CHANGE` | Password changed     |
| `EXPORT`          | Data exported        |
| `CONSENT_GRANTED` | User consent given   |
| `CONSENT_REVOKED` | User consent revoked |

## Compliance Documentation

See [COMPLIANCE.md](COMPLIANCE.md) for detailed compliance requirements and encryption guidelines.
