import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import type { ConfigType } from '@nestjs/config';
import { DatabaseService } from '@app/database/database.service';
import { EncryptionService } from '@app/security/encryption.service';
import { AvatarService } from '@app/common/avatar';
import { IdmService } from './idm.service';
import { ConsentService } from '../consent/consent.service';
import oauthConfig from './config/oauth.config';
import { GoogleLoginDto, AppleLoginDto } from './dto/oauth.dto';
import { AuthProvider, AuditAction } from '@generated/prisma';
import { SuccessResponse, ConsentGrant } from '@varaperformance/core';
import { MINIMUM_REGISTRATION_AGE } from '@varaperformance/core';
import { randomUUID, randomInt } from 'crypto';

const DEFAULT_PRIVATE_MODE_ROW_ID = 'default';
const CODES_PER_REFERRED_REGISTRATION = 5;

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private readonly prismaService: DatabaseService,
    private readonly idmService: IdmService,
    private readonly encryptionService: EncryptionService,
    private readonly avatarService: AvatarService,
    private readonly consentService: ConsentService,
    @Inject(oauthConfig.KEY)
    private readonly oauthConfiguration: ConfigType<typeof oauthConfig>,
  ) {
    this.googleClient = new OAuth2Client();
  }

  async googleLogin(
    dto: GoogleLoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SuccessResponse> {
    const { idToken, platform, consents } = dto;
    const registrationCode = (
      dto as GoogleLoginDto & { registrationCode?: string }
    ).registrationCode;
    const dateOfBirth = (dto as GoogleLoginDto & { dateOfBirth?: string })
      .dateOfBirth;

    // Native providers can return tokens with web client audience and
    // platform client in azp; accept all configured audiences for platform.
    const audiences = this.getGoogleAudiences(platform);

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: audiences,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const {
        sub: googleId,
        email,
        email_verified,
        given_name,
        family_name,
      } = payload;

      if (!email_verified) {
        throw new UnauthorizedException('Email not verified with Google');
      }

      const { user, isNewUser } = await this.findOrCreateOAuthUser({
        email,
        providerId: googleId,
        authProvider: AuthProvider.GOOGLE,
        firstName: given_name,
        lastName: family_name,
        registrationCode,
        dateOfBirth,
        consents,
        ipAddress,
        userAgent,
      });

      // TOTP 2FA check — existing users with TOTP enabled must verify
      if (user.totpEnabled) {
        const oauthSessionToken = await this.idmService.createOAuthSessionToken(
          user.id,
        );
        return {
          success: true,
          data: { totpRequired: true as const, oauthSessionToken },
        };
      }

      // SOC2: Use compliance-aware token creation with audit logging
      const tokens = await this.idmService.createOAuthLoginTokens(
        user,
        ipAddress,
        userAgent,
      );

      // SOC2/HIPAA: If new user was created without consents, include needsConsent flag
      // Tokens are still issued so user can call the reconsent endpoint
      if (isNewUser && !consents?.length) {
        return {
          success: true,
          data: {
            ...tokens,
            needsConsent: true,
          },
        };
      }

      return { success: true, data: tokens };
    } catch (error) {
      this.logger.error(
        { err: error, message: 'Google authentication error' },
        error instanceof Error ? error.message : String(error),
      );
      // SOC2: Log failed OAuth attempt
      await this.createFailedOAuthAuditLog(
        'GOOGLE',
        ipAddress,
        userAgent,
        error instanceof Error ? error.message : 'Unknown error',
      );
      if (error instanceof ConflictException) throw error;
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async appleLogin(
    dto: AppleLoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SuccessResponse> {
    const { identityToken, user: appleUser, consents } = dto;
    const registrationCode = (
      dto as AppleLoginDto & { registrationCode?: string }
    ).registrationCode;
    const dateOfBirth = (dto as AppleLoginDto & { dateOfBirth?: string })
      .dateOfBirth;

    try {
      const payload = await appleSignin.verifyIdToken(identityToken, {
        audience: this.oauthConfiguration.apple.clientId,
        ignoreExpiration: false,
      });

      const { sub: appleId, email: tokenEmail } = payload;

      // Apple only sends user info on first sign-in
      // After that, use the email from the token
      const email = appleUser?.email || tokenEmail;

      if (!email) {
        throw new UnauthorizedException('Email not available from Apple');
      }

      const { user, isNewUser } = await this.findOrCreateOAuthUser({
        email,
        providerId: appleId,
        authProvider: AuthProvider.APPLE,
        firstName: appleUser?.name?.firstName,
        lastName: appleUser?.name?.lastName,
        registrationCode,
        dateOfBirth,
        consents,
        ipAddress,
        userAgent,
      });

      // TOTP 2FA check — existing users with TOTP enabled must verify
      if (user.totpEnabled) {
        const oauthSessionToken = await this.idmService.createOAuthSessionToken(
          user.id,
        );
        return {
          success: true,
          data: { totpRequired: true as const, oauthSessionToken },
        };
      }

      // SOC2: Use compliance-aware token creation with audit logging
      const tokens = await this.idmService.createOAuthLoginTokens(
        user,
        ipAddress,
        userAgent,
      );

      // SOC2/HIPAA: If new user was created without consents, include needsConsent flag
      // Tokens are still issued so user can call the reconsent endpoint
      if (isNewUser && !consents?.length) {
        return {
          success: true,
          data: {
            ...tokens,
            needsConsent: true,
          },
        };
      }

      return { success: true, data: tokens };
    } catch (error) {
      // SOC2: Log failed OAuth attempt
      await this.createFailedOAuthAuditLog(
        'APPLE',
        ipAddress,
        userAgent,
        error instanceof Error ? error.message : 'Unknown error',
      );
      if (error instanceof ConflictException) throw error;
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Apple authentication failed');
    }
  }

  private async findOrCreateOAuthUser(params: {
    email: string;
    providerId: string;
    authProvider: AuthProvider;
    firstName?: string;
    lastName?: string;
    registrationCode?: string;
    dateOfBirth?: string;
    consents?: ConsentGrant[];
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: any; isNewUser: boolean }> {
    const {
      email,
      providerId,
      authProvider,
      firstName,
      lastName,
      registrationCode,
      dateOfBirth,
      consents,
      ipAddress,
      userAgent,
    } = params;

    // Check if user exists with this OAuth provider
    const user = await this.prismaService.user.findFirst({
      where: { authProvider, providerId },
    });

    if (user) {
      return { user, isNewUser: false };
    }

    // Check if email is already registered with different provider
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.authProvider !== authProvider) {
        throw new ConflictException(
          'This email is already associated with another account. Please sign in with your original method.',
        );
      }
      // Link the OAuth provider to existing account
      const updatedUser = await this.prismaService.user.update({
        where: { id: existingUser.id },
        data: { providerId, isVerified: true },
      });
      return { user: updatedUser, isNewUser: false };
    }

    // GDPR Art. 8: Validate minimum age for new registrations
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        age--;
      }
      if (age < MINIMUM_REGISTRATION_AGE) {
        throw new ForbiddenException(
          `You must be at least ${MINIMUM_REGISTRATION_AGE} years old to create an account.`,
        );
      }
    } else {
      throw new ForbiddenException(
        'Date of birth is required for new account registration.',
      );
    }

    // Create new user with profile
    const baseDisplayName =
      [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];
    const displayName = await this.generateUniqueDisplayName(baseDisplayName);
    const userId = randomUUID();
    const avatarUrl = await this.avatarService.generateAvatar(
      displayName,
      userId,
    );

    // Encrypt PII for compliance (SOC2/HIPAA)
    const profilePii = JSON.stringify({
      firstName: firstName ?? '',
      lastName: lastName ?? '',
    });
    const encrypted = this.encryptionService.encrypt(profilePii);

    const normalizedCode = registrationCode?.trim().toUpperCase();
    const newUser = await this.prismaService.$transaction(async (tx) => {
      const privateMode = await (tx as any).siteAccessMode.findUnique({
        where: { id: DEFAULT_PRIVATE_MODE_ROW_ID },
        select: { privateModeEnabled: true },
      });

      if (privateMode?.privateModeEnabled && !normalizedCode) {
        throw new ForbiddenException(
          'Private mode is enabled. Registration code required.',
        );
      }

      const created = await tx.user.create({
        data: {
          id: userId,
          email,
          authProvider,
          providerId,
          isVerified: true, // OAuth users are pre-verified
          profile: {
            create: {
              displayName,
              avatarUrl,
              eProfile: encrypted.encryptedContent,
              profileIv: encrypted.contentIv,
              profileAuthTag: encrypted.contentAuthTag,
              profileWrappedKey: encrypted.wrappedKey,
            },
          },
        },
      });

      if (normalizedCode) {
        const consumed = await (tx as any).registrationCode.updateMany({
          where: {
            code: normalizedCode,
            usedAt: null,
          },
          data: {
            usedAt: new Date(),
            usedByUserId: userId,
          },
        });

        if (consumed.count !== 1) {
          throw new ConflictException(
            'Invalid or already used registration code',
          );
        }

        await this.generateCodes(tx, CODES_PER_REFERRED_REGISTRATION, {
          createdById: userId,
          ownerUserId: userId,
        });
      }

      return created;
    });

    // Assign default User role for OAuth registrations
    await this.idmService.assignDefaultUserRole(userId);

    // SOC2/HIPAA: Record consents if provided
    if (consents?.length) {
      await this.consentService.recordConsents(userId, consents, {
        ipAddress,
        userAgent,
        surface: 'oauth_registration',
      });
    }

    return { user: newUser, isNewUser: true };
  }

  private getGoogleAudiences(platform: 'web' | 'ios' | 'android'): string[] {
    const config = this.oauthConfiguration.google;
    const isString = (value: string | undefined): value is string =>
      typeof value === 'string' && value.length > 0;
    const base = [config.clientId];

    switch (platform) {
      case 'ios':
        return [...new Set([...base, config.clientIdIos].filter(isString))];
      case 'android':
        return [...new Set([...base, config.clientIdAndroid].filter(isString))];
      default:
        return [...new Set(base.filter(isString))];
    }
  }

  private async generateUniqueDisplayName(baseName: string): Promise<string> {
    let displayName = baseName;
    let suffix = 1;

    while (true) {
      const existing = await this.prismaService.profile.findUnique({
        where: { displayName },
        select: { id: true },
      });

      if (!existing) {
        return displayName;
      }

      displayName = `${baseName}${suffix}`;
      suffix++;
    }
  }

  private async generateCodes(
    tx: any,
    count: number,
    params: { createdById?: string; ownerUserId?: string },
  ): Promise<void> {
    let created = 0;

    while (created < count) {
      try {
        await tx.registrationCode.create({
          data: {
            code: this.makeCode(),
            createdById: params.createdById,
            ownerUserId: params.ownerUserId,
          },
        });
        created += 1;
      } catch {
        // Retry on unique collision.
      }
    }
  }

  private makeCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += alphabet[randomInt(alphabet.length)];
    }
    return code;
  }

  // SOC2: Log failed OAuth authentication attempts
  private async createFailedOAuthAuditLog(
    provider: string,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.prismaService.auditLog.create({
        data: {
          action: AuditAction.FAILED_LOGIN,
          resource: 'OAuth',
          ipAddress,
          userAgent,
          ...this.encryptAuditMeta(ipAddress, userAgent),
          metadata: {
            provider,
            error: errorMessage,
          },
        },
      });
    } catch {
      // Don't let audit logging failures break the auth flow
      this.logger.warn('Failed to create OAuth audit log entry');
    }
  }

  private encryptAuditMeta(ipAddress?: string, userAgent?: string) {
    if (!ipAddress && !userAgent) return {};
    const payload = JSON.stringify({ ipAddress, userAgent });
    const enc = this.encryptionService.encrypt(payload);
    return {
      eAuditMeta: enc.encryptedContent,
      auditMetaIv: enc.contentIv,
      auditMetaAuthTag: enc.contentAuthTag,
      auditMetaWrappedKey: enc.wrappedKey,
    };
  }
}
