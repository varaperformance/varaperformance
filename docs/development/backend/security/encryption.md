# Encryption Service Documentation

## Overview

The encryption system uses **AES-256-GCM envelope encryption** to protect sensitive data at rest. This is the same pattern used by AWS KMS, Google Cloud KMS, and other enterprise key management systems.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Envelope Encryption                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐         ┌──────────────┐                     │
│   │  Plaintext   │────────▶│  Encrypted   │                     │
│   │   (Data)     │         │   Content    │                     │
│   └──────────────┘         └──────────────┘                     │
│          │                        ▲                              │
│          │ encrypted with         │                              │
│          ▼                        │                              │
│   ┌──────────────┐               │                              │
│   │   Data Key   │───────────────┘                              │
│   │  (random)    │                                              │
│   └──────────────┘                                              │
│          │                                                       │
│          │ wrapped with                                          │
│          ▼                                                       │
│   ┌──────────────┐         ┌──────────────┐                     │
│   │  Master KEK  │────────▶│  Wrapped Key │                     │
│   │  (env var)   │         │  (stored)    │                     │
│   └──────────────┘         └──────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Hierarchy

| Key            | Description                                | Storage                                 | Rotation                |
| -------------- | ------------------------------------------ | --------------------------------------- | ----------------------- |
| **Master KEK** | Key Encryption Key - encrypts data keys    | Environment variable (`ENCRYPTION_KEK`) | Manual rotation         |
| **Data Key**   | Unique per-record, encrypts actual content | Wrapped and stored with each record     | Automatic (per-encrypt) |

## Algorithm Details

- **Cipher**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV/Nonce**: 96 bits (12 bytes), randomly generated
- **Auth Tag**: 128 bits (16 bytes)

### Why AES-256-GCM?

1. **Authenticated encryption** - Provides both confidentiality and integrity
2. **NIST approved** - Federal standard for symmetric encryption
3. **Hardware acceleration** - AES-NI instructions on modern CPUs
4. **No padding required** - Stream cipher mode, works with any data size

## Encryption Process

```typescript
encrypt(plaintext: string | Buffer) {
  // 1. Generate random 256-bit data key (unique per record)
  const dataKey = crypto.randomBytes(32);

  // 2. Generate random 96-bit IV for content encryption
  const contentIv = crypto.randomBytes(12);

  // 3. Encrypt plaintext with data key
  const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, contentIv);
  const encryptedContent = cipher.update(plaintext) + cipher.final();
  const contentAuthTag = cipher.getAuthTag();  // integrity check

  // 4. Wrap data key with master KEK (envelope)
  const keyIv = crypto.randomBytes(12);
  const wrappedKey = encrypt(dataKey, masterKey, keyIv);

  // 5. Return all components for storage
  return { encryptedContent, contentIv, contentAuthTag, wrappedKey };
}
```

## Decryption Process

```typescript
decrypt({ encryptedContent, contentIv, contentAuthTag, wrappedKey }) {
  // 1. Unwrap data key using master KEK
  const dataKey = decrypt(wrappedKey, masterKey);

  // 2. Decrypt content with recovered data key
  const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, contentIv);
  decipher.setAuthTag(contentAuthTag);  // verify integrity

  // 3. Return plaintext
  return decipher.update(encryptedContent) + decipher.final();
}
```

## Database Schema

```prisma
model Note {
  id            String   @id @default(uuid())
  userId        String

  // Encrypted payload
  encryptedData Bytes    // AES-256-GCM ciphertext
  dataIv        Bytes    // 12-byte IV for content
  dataAuthTag   Bytes    // 16-byte authentication tag
  wrappedKey    Bytes    // Data key wrapped with KEK (12 + 32 + 16 = 60 bytes)

  createdAt     DateTime
  updatedAt     DateTime
}
```

## KeyStore Usage Policy

The KeyStore model is now used as a secure encrypted envelope store for per-user sensitive integration data in addition to encrypted user notes metadata.

Allowed KeyStore use cases:

- OAuth credentials that must be recoverable at runtime (for example access and refresh tokens)
- Integration connection metadata required for secure sync operations
- Encrypted integration sync snapshots used by integration status endpoints

Disallowed KeyStore use cases:

- Primary product domain records (for example workout sessions, sets, food logs)
- Analytics-only caches that do not require encryption

Design boundary:

- KeyStore stores encrypted integration state.
- Product features such as workout log must still read/write their own domain tables.
- If integration data should appear in product features, add an explicit projection/import into those feature tables.

### Wrapped Key Format

The `wrappedKey` field contains:

```
[keyIv (12 bytes)][encryptedDataKey (32 bytes)][keyAuthTag (16 bytes)]
Total: 60 bytes
```

## Security Properties

### Confidentiality

- Data encrypted with unique keys per record
- Even if one data key is compromised, other records remain secure

### Integrity

- GCM mode provides authentication tags
- Any tampering with ciphertext is detected during decryption

### Key Isolation

- Master KEK never touches plaintext directly
- Data keys are ephemeral and wrapped before storage

### Forward Secrecy

- Each record has a unique data key
- Compromising one record doesn't affect others

## Environment Setup

### Generate Master KEK

```bash
# Generate 32 random bytes, base64 encoded
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Example output: K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=
```

### Configure Environment

```env
# .env
ENCRYPTION_KEK=K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=
```

## Key Rotation

### Rotating the Master KEK

1. Generate new KEK
2. For each encrypted record:
   - Decrypt with old KEK
   - Re-encrypt with new KEK
3. Update environment variable
4. Deploy

```typescript
async rotateKek(oldKek: Buffer, newKek: Buffer) {
  const notes = await db.note.findMany();

  for (const note of notes) {
    // Decrypt with old KEK
    const plaintext = decryptWithKek(note, oldKek);

    // Re-encrypt with new KEK
    const encrypted = encryptWithKek(plaintext, newKek);

    // Update record
    await db.note.update({
      where: { id: note.id },
      data: encrypted,
    });
  }
}
```

## Hashing Service

For non-reversible data (passwords), use `HashingService` instead:

```typescript
@Injectable()
export class HashingService {
  // Argon2id - winner of Password Hashing Competition
  private readonly options = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3, // 3 iterations
    parallelism: 4, // 4 threads
  };

  async hash(value: string): Promise<string>;
  async verify(value: string, hash: string): Promise<boolean>;
}
```

### When to Use Each

| Use Case       | Service                                   |
| -------------- | ----------------------------------------- |
| User passwords | `HashingService` (Argon2id)               |
| Notes content  | `EncryptionService` (AES-256-GCM)         |
| API keys       | `HashingService` (cannot be recovered)    |
| Sensitive PII  | `EncryptionService` (must be recoverable) |

## Compliance

This encryption scheme helps satisfy:

- **SOC 2** - Encryption of data at rest
- **GDPR** - Technical measures for data protection
- **HIPAA** - Encryption of PHI at rest
- **PCI DSS** - Protection of cardholder data

## References

- [NIST SP 800-38D - Galois/Counter Mode](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [AWS KMS Envelope Encryption](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#enveloping)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
