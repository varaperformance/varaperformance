import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database/database.service';
import {
  LoginUserDto,
  RefreshTokenDto,
  RegisterUserWithConsentsDto,
  VerifyUserDto,
  AdminCreateUserDto,
} from './dto/user.dto';
import { HashingService } from '@app/security/hashing.service';
import { EncryptionService } from '@app/security/encryption.service';
import { AvatarService } from '@app/common/avatar';
import { MailService } from '@app/common/mailer';
import { userPublicSelector } from '@app/common/prisma/selectors';
import jwtConfig from './config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt.interface';
import { User, AuditAction, Prisma } from '@generated/prisma';
import { SuccessResponse } from '@varaperformance/core';
import { MINIMUM_REGISTRATION_AGE } from '@varaperformance/core';
import { randomUUID, randomInt } from 'crypto';
import { AuthorizationService } from './authorization.service';
import { TokenStorageClass } from './token-storage.class';
import { ConsentService } from '../consent/consent.service';
import type { ClientMetadata } from '@app/common/decorators';
import {
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
  PASSWORD_HISTORY_COUNT,
  DEFAULT_USER_ROLE,
  DEFAULT_PRIVATE_MODE_ROW_ID,
  CODES_PER_REFERRED_REGISTRATION,
  normalizeRegistrationCode,
} from './idm.constants';
import {
  computeFailedLoginState,
  isAccountTemporarilyLocked,
} from './idm-login-policy';
import { TotpService } from './totp.service';

@Injectable()
export class IdmService {
  private readonly logger = new Logger(IdmService.name);

  constructor(
    private readonly prismaService: DatabaseService,
    private readonly hashService: HashingService,
    private readonly jwtService: JwtService,
    private readonly avatarService: AvatarService,
    private readonly mailService: MailService,
    private readonly authorizationService: AuthorizationService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly tokenStorage: TokenStorageClass,
    private readonly consentService: ConsentService,
    private readonly totpService: TotpService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * SOC2/HIPAA: Register user with consent tracking
   * Validates and records consents for Terms of Service and Privacy Policy
   */
  async register(
    registerUserDto: RegisterUserWithConsentsDto,
    ctx?: ClientMetadata,
  ): Promise<SuccessResponse> {
    const { email, password, consents } = registerUserDto;
    const { dateOfBirth } = registerUserDto;
    const registrationCode = (
      registerUserDto as RegisterUserWithConsentsDto & {
        registrationCode?: string;
      }
    ).registrationCode;

    // SOC2: Validate required consents before registration
    this.consentService.validateRequiredConsents(consents);

    // GDPR Art. 8: Validate minimum age
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < MINIMUM_REGISTRATION_AGE) {
      throw new ForbiddenException(
        `You must be at least ${MINIMUM_REGISTRATION_AGE} years old to create an account.`,
      );
    }

    // Check if user already exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Process registration
    const verificationCode = String(randomInt(100000, 1000000)); // 6-digit code
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const baseDisplayName = email.split('@')[0];
    const displayName = await this.generateUniqueDisplayName(baseDisplayName);
    const userId = randomUUID();
    const avatarUrl = await this.avatarService.generateAvatar(
      displayName,
      userId,
    );
    const hashedPassword = await this.hashService.hash(password);
    const normalizedCode = registrationCode
      ? normalizeRegistrationCode(registrationCode)
      : undefined;
    const user = await this.prismaService.$transaction(async (tx) => {
      const privateModeEnabled = await this.getPrivateModeEnabled(tx);

      if (privateModeEnabled && !normalizedCode) {
        throw new ForbiddenException(
          'Private mode is enabled. Registration code required.',
        );
      }

      const createdUser = await tx.user.create({
        data: {
          id: userId,
          email,
          password: hashedPassword,
          verificationCode,
          expiresAt,
          profile: {
            create: {
              displayName,
              avatarUrl,
            },
          },
        },
        select: userPublicSelector,
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

      return createdUser;
    });

    // SOC2: Store initial password in history to prevent reuse
    await this.savePasswordToHistory(userId, hashedPassword);

    // Assign default User role for new registrations
    await this.assignDefaultUserRole(userId);

    // SOC2/HIPAA: Record consents with audit trail
    await this.consentService.recordConsents(userId, consents, ctx ?? {});

    // Send verification email
    await this.mailService.sendVerificationEmail(email, verificationCode);

    return { success: true, data: user };
  }

  async getRegistrationAccessStatus(): Promise<SuccessResponse> {
    const privateModeEnabled = await this.getPrivateModeEnabled(
      this.prismaService,
    );
    return { success: true, data: { privateModeEnabled } };
  }

  async validateRegistrationCode(code: string): Promise<SuccessResponse> {
    const normalizedCode = normalizeRegistrationCode(code);
    const match = await (this.prismaService as any).registrationCode.findFirst({
      where: {
        code: normalizedCode,
        usedAt: null,
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (!match) {
      throw new ConflictException('Invalid or already used registration code');
    }

    return { success: true, data: { valid: true, code: match.code } };
  }

  async getPrivateModeAdmin(): Promise<SuccessResponse> {
    const privateModeEnabled = await this.getPrivateModeEnabled(
      this.prismaService,
    );

    const codes = await (this.prismaService as any).registrationCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        code: true,
        createdById: true,
        ownerUserId: true,
        usedByUserId: true,
        usedAt: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: {
        privateModeEnabled,
        codes,
      },
    };
  }

  async updatePrivateMode(
    enabled: boolean,
    updatedBy?: string,
  ): Promise<SuccessResponse> {
    await (this.prismaService as any).siteAccessMode.upsert({
      where: { id: DEFAULT_PRIVATE_MODE_ROW_ID },
      update: {
        privateModeEnabled: enabled,
        updatedBy,
      },
      create: {
        id: DEFAULT_PRIVATE_MODE_ROW_ID,
        privateModeEnabled: enabled,
        updatedBy,
      },
    });

    return { success: true, data: { privateModeEnabled: enabled } };
  }

  async generateRegistrationCodesAdmin(
    count: number,
    adminId?: string,
  ): Promise<SuccessResponse> {
    const created = await this.prismaService.$transaction((tx) =>
      this.generateCodes(tx, count, { createdById: adminId }),
    );

    return {
      success: true,
      data: {
        codes: created,
      },
    };
  }

  async getMyRegistrationCodes(userId: string): Promise<SuccessResponse> {
    const codes = await (this.prismaService as any).registrationCode.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        code: true,
        usedAt: true,
        usedByUserId: true,
        createdAt: true,
      },
    });

    const used = codes.filter((item: { usedAt: Date | null }) =>
      Boolean(item.usedAt),
    ).length;
    const total = codes.length;

    return {
      success: true,
      data: {
        codes,
        total,
        used,
        remaining: total - used,
      },
    };
  }

  async verifyEmail(verifyUserDto: VerifyUserDto): Promise<SuccessResponse> {
    const { verificationCode } = verifyUserDto;
    const user = await this.prismaService.user.findFirst({
      where: { verificationCode },
    });
    if (!user) {
      throw new ConflictException('Invalid verification code');
    }
    if (user.isVerified) {
      throw new ConflictException('User is already verified');
    }
    if (!user.expiresAt || user.expiresAt < new Date()) {
      // Generate a new verification code and update expiration
      const newVerificationCode = String(randomInt(100000, 1000000));
      const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          verificationCode: newVerificationCode,
          expiresAt: newExpiresAt,
        },
      });
      // Send email with new verification code
      await this.mailService.sendVerificationEmail(
        user.email,
        newVerificationCode,
      );
      throw new ConflictException(
        'Verification code has expired. A new code has been sent to your email.',
      );
    }
    const verifiedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationCode: null,
        expiresAt: null,
      },
      select: userPublicSelector,
    });
    return { success: true, data: verifiedUser };
  }

  async resendVerificationEmail(email: string): Promise<SuccessResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    // Do not reveal whether an account exists.
    if (!user || user.isVerified) {
      return { success: true, data: null };
    }

    const verificationCode = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        expiresAt,
      },
    });

    await this.mailService.sendVerificationEmail(user.email, verificationCode);

    return { success: true, data: null };
  }

  async login(
    loginUserDto: LoginUserDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SuccessResponse> {
    const { email, password } = loginUserDto;
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    // SOC2: Check if account is locked
    if (user && isAccountTemporarilyLocked(user.lockedUntil)) {
      await this.createLoginAttempt(email, ipAddress, false, 'Account locked');
      await this.createAuditLog({
        userId: user.id,
        action: AuditAction.FAILED_LOGIN,
        resource: 'User',
        resourceId: user.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'Account locked' },
      });
      throw new ForbiddenException(
        'Account is temporarily locked. Please try again later.',
      );
    }

    if (!user || !user.password) {
      await this.createLoginAttempt(
        email,
        ipAddress,
        false,
        'Invalid credentials',
      );
      throw new ConflictException('Invalid email or password');
    }

    const isPasswordValid = await this.hashService.verify(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      // SOC2: Track failed login and implement account lockout
      await this.handleFailedLogin(user, email, ipAddress, userAgent);
      throw new ConflictException('Invalid email or password');
    }

    if (!user.isActive || user.deletedAt) {
      await this.createLoginAttempt(
        email,
        ipAddress,
        false,
        'Account deactivated',
      );
      await this.createAuditLog({
        userId: user.id,
        action: AuditAction.FAILED_LOGIN,
        resource: 'User',
        resourceId: user.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'Account deactivated' },
      });
      throw new ForbiddenException(
        'Account has been deactivated. Please contact support.',
      );
    }

    if (!user.isVerified) {
      await this.createLoginAttempt(
        email,
        ipAddress,
        false,
        'User not verified',
      );
      throw new ConflictException('User is not verified');
    }

    // TOTP 2FA check
    if (user.totpEnabled) {
      const { totpToken, recoveryCode } = loginUserDto as LoginUserDto & {
        totpToken?: string;
        recoveryCode?: string;
      };

      if (!totpToken && !recoveryCode) {
        // Tell the client that 2FA is required (no tokens issued yet)
        return {
          success: true,
          data: { totpRequired: true },
        };
      }

      let totpValid = false;
      if (totpToken) {
        totpValid = await this.totpService.verifyToken(user.id, totpToken);
      } else if (recoveryCode) {
        totpValid = await this.totpService.verifyRecoveryCode(
          user.id,
          recoveryCode,
        );
      }

      if (!totpValid) {
        await this.createLoginAttempt(
          email,
          ipAddress,
          false,
          'Invalid TOTP code',
        );
        throw new ConflictException('Invalid two-factor authentication code');
      }
    }

    // SOC2: Successful login - reset failed attempts and update login tracking
    await this.handleSuccessfulLogin(user, ipAddress, userAgent);

    // Fetch permissions and roles for JWT
    const permissionsData = await this.getUserPermissionsForJWT(user.id);
    const tokens = await this.generateTokens(user, permissionsData, {
      ipAddress,
      userAgent,
    });
    return {
      success: true,
      data: tokens,
    };
  }

  async generateTokens(
    user: User,
    permissionsData: { roles: string[]; permissions: string[] },
    metadata?: { ipAddress?: string; userAgent?: string },
  ) {
    const refreshTokenId = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<JwtPayload>>(
        user.id,
        this.jwtConfiguration.accessTokenTtl,
        {
          email: user.email,
          roles: permissionsData.roles,
          permissions: permissionsData.permissions,
          isRestricted: user.isRestricted || undefined,
        },
      ),
      this.signToken(user.id, this.jwtConfiguration.refreshTokenTtl, {
        email: user.email,
        roles: permissionsData.roles,
        permissions: permissionsData.permissions,
        isRestricted: user.isRestricted || undefined,
        refreshTokenId,
      }),
    ]);
    await this.tokenStorage.insert(user.id, refreshTokenId, {
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      expiresAt: new Date(
        Date.now() + this.jwtConfiguration.refreshTokenTtl * 1000,
      ),
    });
    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(
    refreshTokenDto: RefreshTokenDto,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<SuccessResponse> {
    try {
      const { sub, refreshTokenId } = await this.jwtService.verifyAsync<
        Pick<JwtPayload, 'sub'> & { refreshTokenId: string }
      >(refreshTokenDto.refreshToken, {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      });
      const user = await this.prismaService.user.findUnique({
        where: { id: sub },
      });
      if (!user) {
        this.logger.warn({ sub }, 'Refresh failed: user not found');
        throw new UnauthorizedException();
      }
      const isValid = await this.tokenStorage.validate(user.id, refreshTokenId);
      if (isValid) {
        await this.tokenStorage.invalidate(user.id);
      } else {
        this.logger.warn(
          { userId: user.id },
          'Refresh failed: token invalid after validate',
        );
        throw new Error('Refresh token is invalid');
      }
      // Fetch permissions and roles for JWT
      const permissionsData = await this.getUserPermissionsForJWT(user.id);
      const tokens = await this.generateTokens(user, permissionsData, metadata);
      return { success: true, data: tokens };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      const errMsg =
        err instanceof Error ? err.message : 'Unknown refresh error';
      this.logger.warn({ error: errMsg }, 'Refresh token rejected');
      throw new UnauthorizedException();
    }
  }

  /**
   * SOC2: Logout user and invalidate session
   * Revokes refresh token and creates audit log
   */
  async logout(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SuccessResponse> {
    // Invalidate current session
    await this.tokenStorage.invalidate(userId);

    // SOC2: Create audit log for logout
    await this.createAuditLog({
      userId,
      action: AuditAction.LOGOUT,
      resource: 'Session',
      resourceId: userId,
      ipAddress,
      userAgent,
    });

    return { success: true, data: null };
  }

  /**
   * SOC2: Logout from all devices
   * Invalidates all sessions for the user
   */
  async logoutAllDevices(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SuccessResponse> {
    // Invalidate all sessions
    await this.tokenStorage.invalidateAllSessions(userId);

    // SOC2: Create audit log
    await this.createAuditLog({
      userId,
      action: AuditAction.LOGOUT,
      resource: 'Session',
      resourceId: userId,
      ipAddress,
      userAgent,
      metadata: { allDevices: true },
    });

    return { success: true, data: null };
  }

  async forgotPassword(email: string): Promise<SuccessResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (!user) {
      // For security, we don't reveal whether the email exists
      return { success: true, data: null };
    }
    const resetCode = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        passwordResetCode: resetCode,
        passwordResetExpiresAt: expiresAt,
      },
    });
    // Send password reset email
    await this.mailService.sendPasswordResetEmail(user.email, resetCode);
    return { success: true, data: null };
  }

  /**
   * SOC2: Reset password using reset code
   * Validates code, checks password history, updates password
   */
  async resetPassword(
    email: string,
    resetCode: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SuccessResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ConflictException('Invalid reset code');
    }

    if (
      !user.passwordResetCode ||
      user.passwordResetCode !== resetCode ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date()
    ) {
      throw new ConflictException('Invalid or expired reset code');
    }

    // SOC2: Check password history to prevent reuse
    const isReused = await this.isPasswordInHistory(user.id, newPassword);
    if (isReused) {
      throw new ConflictException(
        `Cannot reuse any of your last ${PASSWORD_HISTORY_COUNT} passwords`,
      );
    }

    // Store current password in history before changing
    if (user.password) {
      await this.savePasswordToHistory(user.id, user.password);
    }

    // Update password
    const hashedPassword = await this.hashService.hash(newPassword);
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetCode: null,
        passwordResetExpiresAt: null,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    });

    // SOC2: Audit log password change
    await this.createAuditLog({
      userId: user.id,
      action: AuditAction.PASSWORD_CHANGE,
      resource: 'User',
      resourceId: user.id,
      ipAddress,
      userAgent,
      metadata: { method: 'reset' },
    });

    // Send password changed confirmation email
    await this.mailService.sendPasswordChangedEmail(user.email);

    return { success: true, data: null };
  }

  /**
   * Verify a user's password (used for sensitive actions like disabling TOTP).
   */
  async verifyUserPassword(userId: string, password: string): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user || !user.password) {
      throw new ConflictException('User not found or has no password set');
    }

    const isValid = await this.hashService.verify(password, user.password);
    if (!isValid) {
      throw new ConflictException('Password is incorrect');
    }
  }

  /**
   * SOC2: Change password for authenticated user
   * Validates current password, checks history, updates password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SuccessResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new ConflictException('User not found or has no password set');
    }

    // Verify current password
    const isCurrentValid = await this.hashService.verify(
      currentPassword,
      user.password,
    );
    if (!isCurrentValid) {
      throw new ConflictException('Current password is incorrect');
    }

    // SOC2: Check password history to prevent reuse
    const isReused = await this.isPasswordInHistory(userId, newPassword);
    if (isReused) {
      throw new ConflictException(
        `Cannot reuse any of your last ${PASSWORD_HISTORY_COUNT} passwords`,
      );
    }

    // Store current password in history before changing
    await this.savePasswordToHistory(userId, user.password);

    // Update password
    const hashedPassword = await this.hashService.hash(newPassword);
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    });

    // SOC2: Audit log password change
    await this.createAuditLog({
      userId,
      action: AuditAction.PASSWORD_CHANGE,
      resource: 'User',
      resourceId: userId,
      ipAddress,
      userAgent,
      metadata: { method: 'change' },
    });

    // Send password changed confirmation email
    await this.mailService.sendPasswordChangedEmail(user.email);

    return { success: true, data: null };
  }

  /**
   * Creates tokens for OAuth login flow (used by OAuthService)
   * SOC2: Tracks login and creates audit log
   */
  async createOAuthLoginTokens(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!user.isActive || user.deletedAt) {
      await this.createAuditLog({
        userId: user.id,
        action: AuditAction.FAILED_LOGIN,
        resource: 'User',
        resourceId: user.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'Account deactivated', method: 'oauth' },
      });
      throw new ForbiddenException(
        'Account has been deactivated. Please contact support.',
      );
    }

    // SOC2: Update login tracking
    await this.handleSuccessfulLogin(user, ipAddress, userAgent);

    const permissionsData = await this.getUserPermissionsForJWT(user.id);
    return this.generateTokens(user, permissionsData);
  }

  /**
   * Creates a short-lived session token for OAuth users who need TOTP verification.
   * This token confirms OAuth identity was validated but full auth is pending 2FA.
   */
  async createOAuthSessionToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, purpose: 'oauth-totp' },
      {
        secret: this.jwtConfiguration.secret,
        expiresIn: '5m',
      },
    );
  }

  /**
   * Verifies the TOTP code for an OAuth login that was held pending 2FA,
   * then issues real auth tokens.
   */
  async verifyOAuthTotpAndLogin(
    sessionToken: string,
    totpToken?: string,
    recoveryCode?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SuccessResponse> {
    let payload: { sub: string; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(sessionToken, {
        secret: this.jwtConfiguration.secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (payload.purpose !== 'oauth-totp') {
      throw new UnauthorizedException('Invalid session token');
    }

    if (!totpToken && !recoveryCode) {
      throw new UnauthorizedException('TOTP code or recovery code required');
    }

    let totpValid = false;
    if (totpToken) {
      totpValid = await this.totpService.verifyToken(payload.sub, totpToken);
    } else if (recoveryCode) {
      totpValid = await this.totpService.verifyRecoveryCode(
        payload.sub,
        recoveryCode,
      );
    }

    if (!totpValid) {
      throw new UnauthorizedException('Invalid two-factor authentication code');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.createOAuthLoginTokens(
      user,
      ipAddress,
      userAgent,
    );
    return { success: true, data: tokens };
  }

  // SOC2: Track failed login and implement account lockout
  private async handleFailedLogin(
    user: User,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const { failedAttempts, shouldLock, lockedUntil } = computeFailedLoginState(
      user.failedLoginAttempts,
      MAX_FAILED_ATTEMPTS,
      LOCKOUT_DURATION_MINUTES,
    );

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: failedAttempts,
        lockedUntil,
      },
    });

    await this.createLoginAttempt(
      email,
      ipAddress,
      false,
      'Invalid credentials',
    );
    await this.createAuditLog({
      userId: user.id,
      action: AuditAction.FAILED_LOGIN,
      resource: 'User',
      resourceId: user.id,
      ipAddress,
      userAgent,
      metadata: {
        failedAttempts,
        accountLocked: shouldLock,
      },
    });
  }

  // SOC2: Reset failed attempts and update last login info
  private async handleSuccessfulLogin(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    await this.createLoginAttempt(user.email, ipAddress, true);
    await this.createAuditLog({
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: 'User',
      resourceId: user.id,
      ipAddress,
      userAgent,
    });
  }

  // SOC2: Create login attempt record for brute force tracking
  private async createLoginAttempt(
    email: string,
    ipAddress?: string,
    success: boolean = false,
    reason?: string,
  ): Promise<void> {
    await this.prismaService.loginAttempt.create({
      data: {
        email,
        ipAddress,
        success,
        reason,
      },
    });
  }

  // SOC2/HIPAA: Create audit log entry
  private async createAuditLog(params: {
    userId?: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
  }): Promise<void> {
    await this.prismaService.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        ...this.encryptAuditMeta(params.ipAddress, params.userAgent),
        metadata: params.metadata as Prisma.InputJsonValue,
        oldValue: params.oldValue as Prisma.InputJsonValue,
        newValue: params.newValue as Prisma.InputJsonValue,
      },
    });
  }

  private async getUserPermissionsForJWT(
    userId: string,
  ): Promise<{ roles: string[]; permissions: string[] }> {
    const result = await this.authorizationService.getUserPermissions(userId);
    const { roles, permissions } = result.data as {
      roles: string[];
      permissions: Array<{ resource: string; action: string }>;
    };
    return {
      roles,
      permissions: permissions.map((p) => `${p.resource}:${p.action}`),
    };
  }

  private async signToken<T>(userId: string, expiresIn: number, payload?: T) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.secret,
        expiresIn,
      },
    );
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

  private async getPrivateModeEnabled(db: any): Promise<boolean> {
    const row = await db.siteAccessMode.findUnique({
      where: { id: DEFAULT_PRIVATE_MODE_ROW_ID },
      select: { privateModeEnabled: true },
    });

    return Boolean(row?.privateModeEnabled);
  }

  private async generateCodes(
    tx: any,
    count: number,
    params: { createdById?: string; ownerUserId?: string },
  ): Promise<Array<{ id: string; code: string; createdAt: Date }>> {
    const created: Array<{ id: string; code: string; createdAt: Date }> = [];

    while (created.length < count) {
      try {
        const record = await tx.registrationCode.create({
          data: {
            code: this.makeCode(),
            createdById: params.createdById,
            ownerUserId: params.ownerUserId,
          },
          select: {
            id: true,
            code: true,
            createdAt: true,
          },
        });
        created.push(record);
      } catch {
        // Retry unique collisions.
      }
    }

    return created;
  }

  private makeCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += alphabet[randomInt(alphabet.length)];
    }
    return code;
  }

  /**
   * SOC2: Check if password matches any in history
   * Returns true if password was previously used
   */
  private async isPasswordInHistory(
    userId: string,
    newPassword: string,
  ): Promise<boolean> {
    const history = await this.prismaService.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_HISTORY_COUNT,
      select: { passwordHash: true },
    });

    for (const entry of history) {
      const matches = await this.hashService.verify(
        newPassword,
        entry.passwordHash,
      );
      if (matches) {
        return true;
      }
    }

    return false;
  }

  /**
   * SOC2: Save password hash to history
   * Maintains only the last PASSWORD_HISTORY_COUNT entries
   */
  private async savePasswordToHistory(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    // Add new entry
    await this.prismaService.passwordHistory.create({
      data: {
        userId,
        passwordHash,
      },
    });

    // Clean up old entries beyond the limit
    const oldEntries = await this.prismaService.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: PASSWORD_HISTORY_COUNT,
      select: { id: true },
    });

    if (oldEntries.length > 0) {
      await this.prismaService.passwordHistory.deleteMany({
        where: {
          id: { in: oldEntries.map((e) => e.id) },
        },
      });
    }
  }

  // ==========================================================================
  // Admin User Management
  // ==========================================================================

  /**
   * Get paginated list of users with their roles (admin)
   */
  async getUsers(
    page = 1,
    limit = 20,
    search?: string,
    roleFilter?: string,
  ): Promise<SuccessResponse> {
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { displayName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (roleFilter) {
      where.roles = {
        some: {
          role: { name: roleFilter },
        },
      };
    }

    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          isVerified: true,
          isActive: true,
          authProvider: true,
          createdAt: true,
          lastLoginAt: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
          roles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          permissions: {
            select: {
              permission: {
                select: {
                  id: true,
                  resource: true,
                  action: true,
                },
              },
            },
          },
        },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total,
      },
    };
  }

  /**
   * Create a user manually from admin panel
   */
  async createUserAdmin(dto: AdminCreateUserDto): Promise<SuccessResponse> {
    const {
      email,
      password,
      displayName: requestedDisplayName,
      isActive,
      isVerified,
    } = dto as AdminCreateUserDto & {
      email: string;
      password: string;
      displayName?: string;
      isActive?: boolean;
      isVerified?: boolean;
    };

    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const baseDisplayName = requestedDisplayName?.trim() || email.split('@')[0];
    const displayName = await this.generateUniqueDisplayName(baseDisplayName);
    const userId = randomUUID();
    const avatarUrl = await this.avatarService.generateAvatar(
      displayName,
      userId,
    );
    const hashedPassword = await this.hashService.hash(password);

    const user = await this.prismaService.user.create({
      data: {
        id: userId,
        email,
        password: hashedPassword,
        isActive: isActive ?? true,
        isVerified: isVerified ?? true,
        verificationCode: null,
        expiresAt: null,
        profile: {
          create: {
            displayName,
            avatarUrl,
          },
        },
      },
      select: {
        id: true,
        email: true,
        isVerified: true,
        isActive: true,
        authProvider: true,
        createdAt: true,
      },
    });

    await this.savePasswordToHistory(userId, hashedPassword);
    await this.assignDefaultUserRole(userId);

    return { success: true, data: user };
  }

  /**
   * Get single user details (admin)
   */
  async getUserAdmin(userId: string): Promise<SuccessResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isVerified: true,
        isActive: true,
        authProvider: true,
        createdAt: true,
        lastLoginAt: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                resource: true,
                action: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { success: true, data: user };
  }

  /**
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(
    userId: string,
    isActive: boolean,
    adminId: string,
  ): Promise<SuccessResponse> {
    const user = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        isActive,
        ...(isActive === false && {
          deletedAt: new Date(),
          deletedBy: adminId,
        }),
        ...(isActive === true && {
          deletedAt: null,
          deletedBy: null,
        }),
      },
      select: { id: true, isActive: true },
    });

    return { success: true, data: user };
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string): Promise<SuccessResponse> {
    await this.prismaService.userRole.upsert({
      where: {
        userId_roleId: { userId, roleId },
      },
      create: { userId, roleId },
      update: {},
    });

    await this.authorizationService.invalidatePermissionCache(userId);

    await this.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      resource: 'UserRole',
      resourceId: userId,
      metadata: { roleId, operation: 'assign' },
    });

    return { success: true, data: { userId, roleId } };
  }

  /**
   * Assign the default 'User' role to a newly registered user
   * This is called automatically during local and OAuth registration
   */
  async assignDefaultUserRole(userId: string): Promise<void> {
    const userRole = await this.prismaService.role.findUnique({
      where: { name: DEFAULT_USER_ROLE },
      select: { id: true },
    });

    if (userRole) {
      await this.prismaService.userRole.upsert({
        where: {
          userId_roleId: { userId, roleId: userRole.id },
        },
        create: { userId, roleId: userRole.id },
        update: {},
      });
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string): Promise<SuccessResponse> {
    await this.prismaService.userRole.delete({
      where: {
        userId_roleId: { userId, roleId },
      },
    });

    await this.authorizationService.invalidatePermissionCache(userId);

    await this.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      resource: 'UserRole',
      resourceId: userId,
      metadata: { roleId, operation: 'remove' },
    });

    return { success: true, data: { userId, roleId } };
  }

  /**
   * Assign direct permission to user
   */
  async assignPermissionToUser(
    userId: string,
    permissionId: string,
  ): Promise<SuccessResponse> {
    await this.prismaService.userPermission.upsert({
      where: {
        userId_permissionId: { userId, permissionId },
      },
      create: { userId, permissionId },
      update: {},
    });

    await this.authorizationService.invalidatePermissionCache(userId);

    await this.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      resource: 'UserPermission',
      resourceId: userId,
      metadata: { permissionId, operation: 'assign' },
    });

    return { success: true, data: { userId, permissionId } };
  }

  /**
   * Remove direct permission from user
   */
  async removePermissionFromUser(
    userId: string,
    permissionId: string,
  ): Promise<SuccessResponse> {
    await this.prismaService.userPermission.delete({
      where: {
        userId_permissionId: { userId, permissionId },
      },
    });

    await this.authorizationService.invalidatePermissionCache(userId);

    await this.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      resource: 'UserPermission',
      resourceId: userId,
      metadata: { permissionId, operation: 'remove' },
    });

    return { success: true, data: { userId, permissionId } };
  }

  // ==========================================================================
  // Admin Role Management
  // ==========================================================================

  /**
   * Get all roles with permission counts
   */
  async getRoles(): Promise<SuccessResponse> {
    const roles = await this.prismaService.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                resource: true,
                action: true,
              },
            },
          },
        },
      },
    });

    return { success: true, data: roles };
  }

  /**
   * Get single role with permissions
   */
  async getRole(roleId: string): Promise<SuccessResponse> {
    const role = await this.prismaService.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                resource: true,
                action: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new UnauthorizedException('Role not found');
    }

    return { success: true, data: role };
  }

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<SuccessResponse> {
    await this.prismaService.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      create: { roleId, permissionId },
      update: {},
    });

    // Invalidate cached permissions for all users with this role
    const usersWithRole = await this.prismaService.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });
    await Promise.all(
      usersWithRole.map((ur) =>
        this.authorizationService.invalidatePermissionCache(ur.userId),
      ),
    );

    await this.createAuditLog({
      action: AuditAction.UPDATE,
      resource: 'RolePermission',
      resourceId: roleId,
      metadata: { permissionId, operation: 'assign' },
    });

    return { success: true, data: { roleId, permissionId } };
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<SuccessResponse> {
    await this.prismaService.rolePermission.delete({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });

    // Invalidate cached permissions for all users with this role
    const usersWithRole = await this.prismaService.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });
    await Promise.all(
      usersWithRole.map((ur) =>
        this.authorizationService.invalidatePermissionCache(ur.userId),
      ),
    );

    await this.createAuditLog({
      action: AuditAction.UPDATE,
      resource: 'RolePermission',
      resourceId: roleId,
      metadata: { permissionId, operation: 'remove' },
    });

    return { success: true, data: { roleId, permissionId } };
  }

  // ==========================================================================
  // Admin Permission Management
  // ==========================================================================

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<SuccessResponse> {
    const permissions = await this.prismaService.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      select: {
        id: true,
        resource: true,
        action: true,
        description: true,
      },
    });

    return { success: true, data: permissions };
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
