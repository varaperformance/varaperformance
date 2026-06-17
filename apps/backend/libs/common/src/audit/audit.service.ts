import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';

export const AUDIT_SERVICE = 'AUDIT_SERVICE';
export const AUDIT_QUEUE = 'audit';
export const AUDIT_LOG_PATTERN = 'audit.log';

// Match Prisma's generated AuditAction
export const AuditAction = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  FAILED_LOGIN: 'FAILED_LOGIN',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  EXPORT: 'EXPORT',
  CONSENT_GRANTED: 'CONSENT_GRANTED',
  CONSENT_REVOKED: 'CONSENT_REVOKED',
  DATA_IMPORT: 'DATA_IMPORT',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_SERVICE) private readonly client: ClientProxy,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuditService.name);
  }

  log(entry: AuditLogEntry): void {
    try {
      // Fire-and-forget publish to RabbitMQ (emit returns an Observable)
      void this.client.emit(AUDIT_LOG_PATTERN, {
        ...entry,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        {
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          userId: entry.userId,
        },
        'Audit log queued',
      );
    } catch (err: unknown) {
      // Don't let audit failures break the request
      this.logger.error({ err, entry }, 'Failed to queue audit log');
    }
  }

  logLogin(userId: string, ipAddress?: string, userAgent?: string): void {
    this.log({
      userId,
      action: AuditAction.LOGIN,
      resource: 'Session',
      ipAddress,
      userAgent,
    });
  }

  logLogout(userId: string): void {
    this.log({
      userId,
      action: AuditAction.LOGOUT,
      resource: 'Session',
    });
  }

  logFailedLogin(email: string, ipAddress?: string, reason?: string): void {
    this.log({
      action: AuditAction.FAILED_LOGIN,
      resource: 'User',
      metadata: { email, reason },
      ipAddress,
    });
  }

  logPasswordChange(userId: string): void {
    this.log({
      userId,
      action: AuditAction.PASSWORD_CHANGE,
      resource: 'User',
      resourceId: userId,
    });
  }

  logDataExport(
    userId: string,
    resource: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.log({
      userId,
      action: AuditAction.EXPORT,
      resource,
      metadata,
    });
  }

  logHealthImport(
    userId: string,
    provider: string,
    metadata: {
      trigger: string;
      importedCount: number;
      skippedCount?: number;
      failedCount?: number;
      durationMs?: number;
    },
  ): void {
    this.log({
      userId,
      action: AuditAction.DATA_IMPORT,
      resource: 'HealthDataImport',
      metadata: { provider, ...metadata },
    });
  }
}
