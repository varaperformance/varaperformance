# Data Encryption & Compliance Guide

> Encryption requirements and compliance considerations for the Varaperformance backend. Field-level patterns and algorithms live in **[ENCRYPTION.md](./ENCRYPTION.md)**. The **Production checklist** at the bottom has two **open** hardening items (`@encrypted` audit, HSM for KEK); treat as infra work, not product roadmap. See [docs README](../README.md#compliance-gdpr) for how compliance vs. features is organized.

---

## Encryption Strategy

The application uses **envelope encryption** via `EncryptionService`:

```
┌─────────────────────────────────────────────────────────────┐
│  Plaintext Data                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │ encrypt with random Data Key (DEK)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Encrypted Content  │  IV  │  Auth Tag                      │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ wrap DEK with Master Key (KEK)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Wrapped Key (Key IV + Encrypted DEK + Key Auth Tag)        │
└─────────────────────────────────────────────────────────────┘
```

| Component          | Algorithm   | Size                      |
| ------------------ | ----------- | ------------------------- |
| Content Encryption | AES-256-GCM | 256-bit key, 96-bit IV    |
| Key Wrapping       | AES-256-GCM | 256-bit KEK               |
| KEK Storage        | Environment | `ENCRYPTION_KEK` (base64) |

---

## Fields Requiring Protection

### Encrypted Fields (PII/PHI)

| Model            | Field                               | Regulations |
| :--------------- | :---------------------------------- | :---------- |
| **User**         | `email`                             | HIPAA, SOC2 |
| **User**         | `lastLoginIp`                       | SOC2        |
| **Profile**      | `firstName`, `lastName`             | HIPAA       |
| **Profile**      | `dateOfBirth`                       | HIPAA       |
| **KeyStore**     | `privateKey`                        | SOC2, PCI   |
| **AuditLog**     | `ipAddress`, `oldValue`, `newValue` | HIPAA, SOC2 |
| **LoginAttempt** | `email`, `ipAddress`                | SOC2        |

### Hashed Fields (One-Way)

| Model               | Field          | Algorithm |
| :------------------ | :------------- | :-------- |
| **User**            | `password`     | Argon2id  |
| **PasswordHistory** | `passwordHash` | Argon2id  |

### Encrypted Fields (Symmetric)

| Model       | Field            | Algorithm              |
| :---------- | :--------------- | :--------------------- |
| **Session** | `encryptedToken` | AES-256-GCM (envelope) |

---

## Compliance Matrix

### SOC2 Type II

| Requirement            | Implementation                       |
| :--------------------- | :----------------------------------- |
| Audit Logging          | `AuditLog` tracks all CRUD           |
| Access Control         | RBAC via `Role`, `Permission`        |
| Session Management     | `Session` with expiration/revocation |
| Brute Force Protection | `LoginAttempt` + account lockout     |
| Password Policy        | `PasswordHistory` prevents reuse     |
| Key Rotation           | `KeyStore.rotatedAt` tracking        |
| Data Retention         | `DataRetention` with legal holds     |

### HIPAA

| Requirement       | Implementation                  |
| :---------------- | :------------------------------ |
| PHI Encryption    | Envelope encryption on all PHI  |
| Access Audit      | `AuditLog` with `READ` tracking |
| Minimum Necessary | RBAC permission scoping         |
| Breach Logging    | Complete access pattern capture |
| Data Integrity    | `updatedAt` on all records      |

### PCI DSS

| Requirement    | Implementation            |
| :------------- | :------------------------ |
| Card Storage   | None (external processor) |
| Key Management | `KeyStore` with rotation  |
| Access Control | RBAC + audit trail        |
| Audit Trail    | `AuditLog` for all ops    |

---

## Production Checklist

- [ ] All `@encrypted` fields use `EncryptionService`
- [x] Passwords use Argon2id (`memory=65536`, `iterations=3`, `parallelism=4`)
- [ ] `ENCRYPTION_KEK` stored in HSM or secrets manager
- [x] Audit middleware captures all data access
- [x] Session invalidation on logout
- [x] Account lockout after 5 failed attempts
- [x] ToS requires 16+ age (GDPR Art. 8)

---

## Key Rotation Procedure

```
1. Generate new KEK
2. Re-encrypt all wrapped keys
3. Update KeyStore.rotatedAt
4. Verify decryption works
5. Deprecate old KEK
6. Log rotation in AuditLog
```

---

## Data Retention

| Data Type       | Retention             | Legal Hold    |
| :-------------- | :-------------------- | :------------ |
| User accounts   | 7 years post-deletion | If litigation |
| Audit logs      | 7 years               | Always        |
| Login attempts  | 90 days               | No            |
| Sessions        | 30 days post-expiry   | No            |
| Consent records | Indefinite            | Yes           |

---

## Usage Example

```typescript
// Encrypt
const encrypted = encryptionService.encrypt(sensitiveValue);
await prisma.model.create({
  data: {
    fieldEncrypted: encrypted.encryptedContent,
    fieldIv: encrypted.contentIv,
    fieldAuthTag: encrypted.contentAuthTag,
    fieldWrappedKey: encrypted.wrappedKey,
  },
});

// Decrypt
const decrypted = encryptionService.decrypt({
  encryptedContent: record.fieldEncrypted,
  contentIv: record.fieldIv,
  contentAuthTag: record.fieldAuthTag,
  wrappedKey: record.fieldWrappedKey,
});
```
