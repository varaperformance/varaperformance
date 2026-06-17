# Security Patterns Reference

## Authentication & Authorization

- **Global guard**: `AccessTokenGuard` is registered as `APP_GUARD` — every endpoint requires a valid JWT by default
- **Public endpoints**: decorate with `@Public()` to bypass auth
- **RBAC**: `@Permissions('resource:action')` — permissions are Redis-cached per user
- **JWT payload**: access via `@ActiveUser()` decorator → `JwtPayload { sub, email }`
- **Client context**: `@ClientIp()`, `@ClientMeta()`, `@UserAgent()` decorators

## Encryption

- **AES-256-GCM envelope encryption** via `EncryptionService` from `@app/security`
- Each encrypted record stores: `ciphertext`, `iv`, `authTag`, `wrappedKey`
- Prisma `Bytes` fields return `Uint8Array` — always wrap: `Buffer.from(field)` before decrypting
- Used for: TOTP secrets, recovery codes, profile PII, message content, audit IP/UA

## Password Security

- **Argon2id** via `HashingService`: memoryCost=65536, timeCost=3, parallelism=4
- Account lockout: 5 failed attempts → 30 minute lock
- Password history: last 12 passwords checked
- Security codes: always `crypto.randomInt()`, never `Math.random()`

## File Uploads

```typescript
// Controller pattern — all uploads follow this:
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
if (!allowedMimeTypes.includes(file.mimetype)) {
  throw new BadRequestException('Invalid file type');
}

const uploaded = await this.storageService.uploadBuffer({
  folder: '{domain}',
  originalName: file.originalname,
  contentType: file.mimetype,
  body: file.buffer,
  allowedMimeTypes,  // ← triggers magic-byte validation in StorageService
});
```

- Always use `memoryStorage()` (no disk writes)
- UUID-based S3 keys via `StorageService.buildObjectKey`
- Pre-signed download URLs: `StorageService.getSignedDownloadUrl(key)`
- Endpoint: `GET /media/signed-url?key=...` (authenticated)

## TOTP / 2FA

- **otplib v13**: `generateSecret()`, `generateURI({ issuer, label, secret })`, `verifySync({ token, secret })`
- TOTP secret is envelope-encrypted (AES-256-GCM)
- 8 recovery codes, each Argon2-hashed, then array encrypted
- Login returns `{ totpRequired: true }` when 2FA enabled but no token provided

## Audit Logging

- Encrypted audit logs via RabbitMQ → worker → DB
- IP addresses and user agents encrypted before storage
- `AuditAction` enum in Prisma for typed audit events
