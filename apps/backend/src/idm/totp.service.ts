import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '@app/database/database.service';
import { EncryptionService } from '@app/security/encryption.service';
import { HashingService } from '@app/security/hashing.service';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

const ISSUER = 'VaraPerformance';
const RECOVERY_CODE_COUNT = 8;

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly hashing: HashingService,
  ) {}

  /**
   * Step 1: Generate a TOTP secret and return the provisioning URI + QR code.
   * The secret is persisted encrypted but TOTP is NOT enabled yet — the user
   * must confirm with a valid token first (step 2).
   */
  async setupTotp(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, totpEnabled: true },
    });

    if (user.totpEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled. Disable it first.',
      );
    }

    const secret = generateSecret();

    // Encrypt the secret before storing
    const encrypted = this.encryption.encrypt(secret);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: encrypted.encryptedContent,
        totpSecretIv: encrypted.contentIv,
        totpSecretAuthTag: encrypted.contentAuthTag,
        totpSecretWrappedKey: encrypted.wrappedKey,
        // Not enabled yet — user must verify first
        totpEnabled: false,
        totpVerifiedAt: null,
      },
    });

    const uri = generateURI({
      secret,
      issuer: ISSUER,
      label: user.email,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(uri);

    return { secret, qrCodeDataUrl, uri };
  }

  /**
   * Step 2: User provides a TOTP token from their authenticator app.
   * If valid, TOTP is permanently enabled and recovery codes are generated.
   */
  async verifyAndEnable(userId: string, token: string) {
    const secret = await this.decryptUserSecret(userId);

    const result = verifySync({ token, secret });
    if (!result.valid) {
      throw new BadRequestException(
        'Invalid verification code. Please try again.',
      );
    }

    // Generate recovery codes
    const recoveryCodes = Array.from(
      { length: RECOVERY_CODE_COUNT },
      () => crypto.randomBytes(4).toString('hex'), // 8-char hex codes
    );

    // Hash each code before encrypting (double protection)
    const hashedCodes = await Promise.all(
      recoveryCodes.map((code) => this.hashing.hash(code)),
    );

    // Encrypt the hashed code array
    const encryptedRecovery = this.encryption.encrypt(
      JSON.stringify(hashedCodes),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabled: true,
        totpVerifiedAt: new Date(),
        totpRecoveryCodes: encryptedRecovery.encryptedContent,
        totpRecoveryIv: encryptedRecovery.contentIv,
        totpRecoveryAuthTag: encryptedRecovery.contentAuthTag,
        totpRecoveryWrappedKey: encryptedRecovery.wrappedKey,
      },
    });

    return { recoveryCodes };
  }

  /**
   * Validate a TOTP token during login.
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const secret = await this.decryptUserSecret(userId);
    const result = verifySync({ token, secret });
    return result.valid;
  }

  /**
   * Validate a recovery code during login (one-time use).
   */
  async verifyRecoveryCode(
    userId: string,
    recoveryCode: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        totpRecoveryCodes: true,
        totpRecoveryIv: true,
        totpRecoveryAuthTag: true,
        totpRecoveryWrappedKey: true,
      },
    });

    if (
      !user.totpRecoveryCodes ||
      !user.totpRecoveryIv ||
      !user.totpRecoveryAuthTag ||
      !user.totpRecoveryWrappedKey
    ) {
      return false;
    }

    const decrypted = this.encryption.decrypt({
      encryptedContent: Buffer.from(user.totpRecoveryCodes),
      contentIv: Buffer.from(user.totpRecoveryIv),
      contentAuthTag: Buffer.from(user.totpRecoveryAuthTag),
      wrappedKey: Buffer.from(user.totpRecoveryWrappedKey),
    });

    const hashedCodes: string[] = JSON.parse(decrypted.toString('utf-8'));

    // Find which code matches
    let matchIndex = -1;
    for (let i = 0; i < hashedCodes.length; i++) {
      const matches = await this.hashing.verify(recoveryCode, hashedCodes[i]);
      if (matches) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex === -1) return false;

    // Remove the used code
    hashedCodes.splice(matchIndex, 1);

    const reEncrypted = this.encryption.encrypt(JSON.stringify(hashedCodes));
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpRecoveryCodes: reEncrypted.encryptedContent,
        totpRecoveryIv: reEncrypted.contentIv,
        totpRecoveryAuthTag: reEncrypted.contentAuthTag,
        totpRecoveryWrappedKey: reEncrypted.wrappedKey,
      },
    });

    this.logger.warn(
      `Recovery code used for user ${userId}. ${hashedCodes.length} codes remaining.`,
    );

    return true;
  }

  /**
   * Disable TOTP (requires password confirmation handled at controller level).
   */
  async disableTotp(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabled: false,
        totpSecret: null,
        totpSecretIv: null,
        totpSecretAuthTag: null,
        totpSecretWrappedKey: null,
        totpVerifiedAt: null,
        totpRecoveryCodes: null,
        totpRecoveryIv: null,
        totpRecoveryAuthTag: null,
        totpRecoveryWrappedKey: null,
      },
    });
  }

  /**
   * Check if a user has TOTP enabled and whether they have a password set.
   */
  async getTotpStatus(
    userId: string,
  ): Promise<{ totpEnabled: boolean; hasPassword: boolean }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { totpEnabled: true, password: true },
    });
    return { totpEnabled: user.totpEnabled, hasPassword: !!user.password };
  }

  /**
   * Check if a user has TOTP enabled.
   */
  async isTotpEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { totpEnabled: true },
    });
    return user.totpEnabled;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────────

  private async decryptUserSecret(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        totpSecret: true,
        totpSecretIv: true,
        totpSecretAuthTag: true,
        totpSecretWrappedKey: true,
      },
    });

    if (
      !user.totpSecret ||
      !user.totpSecretIv ||
      !user.totpSecretAuthTag ||
      !user.totpSecretWrappedKey
    ) {
      throw new ForbiddenException(
        'Two-factor authentication has not been set up.',
      );
    }

    return this.encryption
      .decrypt({
        encryptedContent: Buffer.from(user.totpSecret),
        contentIv: Buffer.from(user.totpSecretIv),
        contentAuthTag: Buffer.from(user.totpSecretAuthTag),
        wrappedKey: Buffer.from(user.totpSecretWrappedKey),
      })
      .toString('utf-8');
  }
}
