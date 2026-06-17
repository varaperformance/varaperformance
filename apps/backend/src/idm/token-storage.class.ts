import { Injectable } from '@nestjs/common';
import { RedisService } from '@app/database/redis.service';
import { DatabaseService } from '@app/database/database.service';
import { EncryptionService } from '@app/security/encryption.service';
import { AuditService, AuditAction } from '@app/common/audit/audit.service';

export class InvalidatedRefreshTokenError extends Error {
  constructor() {
    super('Refresh token has been invalidated');
  }
}

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

@Injectable()
export class TokenStorageClass {
  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: DatabaseService,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * SOC2: Insert a new session with audit trail
   * Stores encrypted token in both Redis (fast lookup) and Postgres (audit)
   */
  async insert(
    userId: string,
    tokenId: string,
    metadata: SessionMetadata,
  ): Promise<void> {
    const { encryptedContent, contentIv, contentAuthTag, wrappedKey } =
      this.encryptionService.encrypt(tokenId);

    // Store tokenId in Redis for fast validation (encrypted at rest by Redis if configured)
    const ttlSeconds = Math.floor(
      (metadata.expiresAt.getTime() - Date.now()) / 1000,
    );
    await this.redisService.set(this.getKey(userId), tokenId, ttlSeconds);

    // SOC2: Store encrypted session in database for audit trail
    const session = await this.prismaService.session.create({
      data: {
        userId,
        encryptedToken: encryptedContent,
        tokenIv: contentIv,
        tokenAuthTag: contentAuthTag,
        wrappedKey,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        ...this.encryptSessionMeta(metadata.ipAddress, metadata.userAgent),
        expiresAt: metadata.expiresAt,
      },
    });

    // SOC2: Audit session creation
    void this.auditService.log({
      userId,
      action: AuditAction.CREATE,
      resource: 'Session',
      resourceId: session.id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { expiresAt: metadata.expiresAt },
    });
  }

  /**
   * SOC2: Validate token and update last activity
   */
  async validate(userId: string, tokenId: string): Promise<boolean> {
    const storedTokenId = await this.redisService.get(this.getKey(userId));

    if (storedTokenId !== tokenId) {
      throw new InvalidatedRefreshTokenError();
    }

    // SOC2: Update last activity timestamp for active sessions
    await this.prismaService.session.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        lastActivity: new Date(),
      },
    });

    return true;
  }

  /**
   * SOC2: Invalidate session (revoke token)
   */
  async invalidate(userId: string): Promise<void> {
    // Remove from Redis
    await this.redisService.del(this.getKey(userId));

    // SOC2: Mark session as revoked in database (don't delete for audit)
    const result = await this.prismaService.session.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    // SOC2: Audit session revocation
    if (result.count > 0) {
      void this.auditService.log({
        userId,
        action: AuditAction.LOGOUT,
        resource: 'Session',
        metadata: { revokedCount: result.count },
      });
    }
  }

  /**
   * SOC2: Invalidate all sessions for a user (logout all devices)
   */
  async invalidateAllSessions(userId: string): Promise<void> {
    await this.redisService.del(this.getKey(userId));

    const result = await this.prismaService.session.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    // SOC2: Audit bulk session revocation
    if (result.count > 0) {
      void this.auditService.log({
        userId,
        action: AuditAction.LOGOUT,
        resource: 'Session',
        metadata: { logoutAllDevices: true, revokedCount: result.count },
      });
    }
  }

  /**
   * SOC2: Get active sessions for a user
   */
  getActiveSessions(userId: string) {
    return this.prismaService.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastActivity: true,
        createdAt: true,
      },
      orderBy: { lastActivity: 'desc' },
    });
  }

  private getKey(userId: string): string {
    return `session:${userId}`;
  }

  private encryptSessionMeta(ipAddress?: string, userAgent?: string) {
    if (!ipAddress && !userAgent) return {};
    const payload = JSON.stringify({ ipAddress, userAgent });
    const enc = this.encryptionService.encrypt(payload);
    return {
      eSessionMeta: enc.encryptedContent,
      sessionMetaIv: enc.contentIv,
      sessionMetaAuthTag: enc.contentAuthTag,
      sessionMetaWrappedKey: enc.wrappedKey,
    };
  }
}
