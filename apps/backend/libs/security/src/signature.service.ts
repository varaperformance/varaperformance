import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { SecretsService } from '@app/common/secrets';

/**
 * Signature algorithm versions for future PQC migration
 * When NIST PQC standards mature (ML-DSA/Dilithium), add new versions here
 */
export enum SignatureAlgorithm {
  /** ECDSA with P-256 curve, SHA-256 hash - current standard */
  ECDSA_P256_V1 = 'ecdsa-p256-v1',
  /** Future: ML-DSA (Dilithium) Level 2 - post-quantum */
  // ML_DSA_44_V1 = 'ml-dsa-44-v1',
  /** Future: Hybrid ECDSA + Dilithium */
  // HYBRID_ECDSA_DILITHIUM_V1 = 'hybrid-ecdsa-dilithium-v1',
}

export interface SignedPayload {
  /** Algorithm version used for signing */
  algorithm: SignatureAlgorithm | string;
  /** Base64-encoded signature */
  signature: string;
  /** SHA-256 fingerprint of the public key used */
  publicKeyFingerprint: string;
  /** ISO timestamp when signed */
  signedAt: string;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  algorithm: SignatureAlgorithm | string;
  message: string;
}

/**
 * Digital signature service for legal non-repudiation
 *
 * Used for contract signing where cryptographic proof is required.
 * Designed with versioning for future post-quantum algorithm migration.
 *
 * Security considerations:
 * - ECDSA P-256 provides ~128-bit security (quantum-vulnerable but industry standard)
 * - When ML-DSA (Dilithium) is standardized in Node.js, add as new version
 * - Old signatures remain verifiable, new contracts use latest algorithm
 *
 * Required environment:
 * - SIGNING_PRIVATE_KEY: PEM-encoded EC private key (P-256)
 * - SIGNING_PUBLIC_KEY: PEM-encoded EC public key (P-256)
 *
 * Generate keys: openssl ecparam -genkey -name prime256v1 -noout | openssl pkcs8 -topk8 -nocrypt
 */
@Injectable()
export class SignatureService implements OnModuleInit {
  private privateKey!: crypto.KeyObject;
  private publicKey!: crypto.KeyObject;
  private publicKeyFingerprint!: string;

  constructor(private readonly secrets: SecretsService) {}

  private normalizePem(value: string): string {
    return value.trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  }

  onModuleInit() {
    const privateKeyPem = this.normalizePem(
      this.secrets.getOrThrow('SIGNING_PRIVATE_KEY'),
    );
    const publicKeyPem = this.normalizePem(
      this.secrets.getOrThrow('SIGNING_PUBLIC_KEY'),
    );

    this.privateKey = crypto.createPrivateKey({
      key: privateKeyPem,
      format: 'pem',
    });

    this.publicKey = crypto.createPublicKey({
      key: publicKeyPem,
      format: 'pem',
    });

    // Verify key type
    if (this.privateKey.asymmetricKeyType !== 'ec') {
      throw new Error('SIGNING_PRIVATE_KEY must be an EC key (P-256)');
    }

    // Generate fingerprint for key identification
    const publicKeyDer = this.publicKey.export({ type: 'spki', format: 'der' });
    this.publicKeyFingerprint = crypto
      .createHash('sha256')
      .update(publicKeyDer)
      .digest('hex')
      .substring(0, 16); // First 16 chars for readability
  }

  /**
   * Sign arbitrary data for contract/document signing
   *
   * @param data - The data to sign (typically contract content hash + metadata)
   * @returns Signed payload with algorithm version and signature
   */
  sign(data: string | Buffer): SignedPayload {
    const dataBuffer =
      typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

    const signature = crypto.sign('sha256', dataBuffer, {
      key: this.privateKey,
      dsaEncoding: 'der', // Standard DER encoding for ECDSA
    });

    return {
      algorithm: SignatureAlgorithm.ECDSA_P256_V1,
      signature: signature.toString('base64'),
      publicKeyFingerprint: this.publicKeyFingerprint,
      signedAt: new Date().toISOString(),
    };
  }

  /**
   * Create a canonical signing payload for contract signatures
   *
   * This creates a deterministic string from contract signing data
   * that can be signed and later verified.
   *
   * @param params Contract signature parameters
   * @returns Canonical string for signing
   */
  createContractSigningPayload(params: {
    contractId: string;
    contractHash: string;
    userId: string;
    bookingId: string;
    userSignatureInput: string; // User's typed signature (e.g., "John Doe")
    timestamp: string; // ISO timestamp
  }): string {
    // Canonical format - order matters for verification
    return JSON.stringify({
      type: 'contract-signature',
      version: 1,
      contractId: params.contractId,
      contractHash: params.contractHash,
      userId: params.userId,
      bookingId: params.bookingId,
      userSignature: params.userSignatureInput,
      timestamp: params.timestamp,
    });
  }

  /**
   * Verify a signature against data
   *
   * @param data - Original data that was signed
   * @param signedPayload - The signature payload to verify
   * @returns Verification result
   */
  verify(
    data: string | Buffer,
    signedPayload: SignedPayload,
  ): SignatureVerificationResult {
    const dataBuffer =
      typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

    // Check algorithm is supported (compare as strings for flexibility)
    const algorithmStr = String(signedPayload.algorithm);
    if (algorithmStr !== (SignatureAlgorithm.ECDSA_P256_V1 as string)) {
      return {
        isValid: false,
        algorithm: signedPayload.algorithm,
        message: `Unsupported signature algorithm: ${signedPayload.algorithm}`,
      };
    }

    // Verify key fingerprint matches our current key
    if (signedPayload.publicKeyFingerprint !== this.publicKeyFingerprint) {
      return {
        isValid: false,
        algorithm: signedPayload.algorithm,
        message: 'Signature was made with a different key',
      };
    }

    try {
      const signatureBuffer = Buffer.from(signedPayload.signature, 'base64');

      const isValid = crypto.verify(
        'sha256',
        dataBuffer,
        {
          key: this.publicKey,
          dsaEncoding: 'der',
        },
        signatureBuffer,
      );

      return {
        isValid,
        algorithm: signedPayload.algorithm,
        message: isValid
          ? 'Signature verified successfully'
          : 'Signature verification failed - data may have been tampered',
      };
    } catch (error) {
      return {
        isValid: false,
        algorithm: signedPayload.algorithm,
        message: `Signature verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get current public key fingerprint
   * Useful for logging/audit purposes
   */
  getPublicKeyFingerprint(): string {
    return this.publicKeyFingerprint;
  }

  /**
   * Export public key in PEM format
   * For external verification or key distribution
   */
  exportPublicKey(): string {
    return this.publicKey.export({ type: 'spki', format: 'pem' }) as string;
  }
}
