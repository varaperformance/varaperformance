import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@app/database/database.service';
import { EncryptionService } from '@app/security';
import {
  legalDocumentListSelect,
  legalDocumentVersionSelect,
} from './selectors/consent.selector';
import {
  ConsentType,
  ConsentGrant,
  REQUIRED_REGISTRATION_CONSENTS,
} from '@varaperformance/core';
import {
  ConsentType as PrismaConsentType,
  ConsentStatus,
  AuditAction,
  Prisma,
  Consent,
} from '@generated/prisma';
import type { SuccessResponse } from '@varaperformance/core';
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from './unsubscribe-token';

const AI_OPT_IN_CONSENTS: ConsentType[] = ['AI_FEATURES_CONSENT'];
const HEALTH_OPT_IN_CONSENTS: ConsentType[] = ['HEALTH_DATA_CONSENT'];

@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Get active legal documents by type
   * SOC2: Returns versioned legal documents for consent tracking
   */
  async getActiveLegalDocuments(
    types?: ConsentType[],
  ): Promise<SuccessResponse> {
    const whereClause: Prisma.LegalDocumentWhereInput = {
      isActive: true,
      effectiveAt: { lte: new Date() },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };

    if (types && types.length > 0) {
      whereClause.type = { in: types as PrismaConsentType[] };
    }

    const documents = await this.prisma.legalDocument.findMany({
      where: whereClause,
      select: legalDocumentListSelect,
      orderBy: { effectiveAt: 'desc' },
    });

    return { success: true, data: documents };
  }

  /**
   * Get a single legal document with full content
   */
  async getLegalDocument(
    type: ConsentType,
    version?: string,
  ): Promise<SuccessResponse> {
    const whereClause: Prisma.LegalDocumentWhereInput = {
      type: type as PrismaConsentType,
    };

    if (version) {
      // When requesting a specific version, don't filter by isActive
      whereClause.version = version;
    } else {
      // When requesting the current version, only return active documents
      whereClause.isActive = true;
    }

    const document = await this.prisma.legalDocument.findFirst({
      where: whereClause,
      orderBy: { effectiveAt: 'desc' },
    });

    if (!document) {
      throw new NotFoundException(`Legal document not found for type: ${type}`);
    }

    return { success: true, data: document };
  }

  /**
   * Get all versions of a legal document type
   * SOC2/HIPAA: Provides version history for compliance audit
   */
  async getLegalDocumentVersions(type: ConsentType): Promise<SuccessResponse> {
    const versions = await this.prisma.legalDocument.findMany({
      where: {
        type: type as PrismaConsentType,
      },
      select: legalDocumentVersionSelect,
      orderBy: { effectiveAt: 'desc' },
    });

    return { success: true, data: versions };
  }

  /**
   * Validate consents against active legal documents
   * SOC2: Ensures consent versions match current active documents
   */
  async validateConsents(consents: ConsentGrant[]): Promise<void> {
    const now = new Date();
    const activeDocs = await this.prisma.legalDocument.findMany({
      where: {
        isActive: true,
        effectiveAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [
          {
            OR: consents.map((c) => ({
              type: c.type as PrismaConsentType,
              version: c.version,
            })),
          },
        ],
      },
      select: { type: true, version: true },
    });

    const matchSet = new Set(activeDocs.map((d) => `${d.type}:${d.version}`));

    for (const consent of consents) {
      if (!matchSet.has(`${consent.type}:${consent.version}`)) {
        throw new BadRequestException(
          `Invalid or outdated consent version for ${consent.type}. Please refresh and try again.`,
        );
      }
    }
  }

  /**
   * Validate that all required consents are present
   * SOC2: Enforces mandatory consent collection
   */
  validateRequiredConsents(consents: ConsentGrant[]): void {
    const providedTypes = consents.map((c) => c.type);

    for (const required of REQUIRED_REGISTRATION_CONSENTS) {
      if (!providedTypes.includes(required)) {
        throw new BadRequestException(`Missing required consent: ${required}`);
      }
    }
  }

  /**
   * Record consents for a user
   * SOC2/HIPAA: Creates auditable consent records with metadata
   */
  async recordConsents(
    userId: string,
    consents: ConsentGrant[],
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      surface?: string;
    },
  ): Promise<SuccessResponse> {
    const now = new Date();
    const createdConsents: Consent[] = [];

    const existingConsents = await this.prisma.consent.findMany({
      where: {
        userId,
        OR: consents.map((c) => ({
          type: c.type as PrismaConsentType,
          version: c.version,
        })),
      },
    });

    const existingMap = new Map(
      existingConsents.map((c) => [`${c.type}:${c.version}`, c]),
    );

    const encMeta = this.encryptMeta(metadata.ipAddress, metadata.userAgent);

    for (const consent of consents) {
      const key = `${consent.type}:${consent.version}`;
      const existing = existingMap.get(key);

      if (existing && existing.status === ConsentStatus.GRANTED) {
        createdConsents.push(existing);
        continue;
      }

      const consentRecord = await this.prisma.consent.upsert({
        where: {
          userId_type_version: {
            userId,
            type: consent.type as PrismaConsentType,
            version: consent.version,
          },
        },
        update: {
          status: ConsentStatus.GRANTED,
          grantedAt: now,
          revokedAt: null,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          ...encMeta,
          metadata: {
            surface: metadata.surface || 'unknown',
          } as Prisma.InputJsonValue,
        },
        create: {
          userId,
          type: consent.type as PrismaConsentType,
          version: consent.version,
          status: ConsentStatus.GRANTED,
          grantedAt: now,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          ...encMeta,
          metadata: {
            surface: metadata.surface || 'unknown',
          } as Prisma.InputJsonValue,
        },
      });

      createdConsents.push(consentRecord);

      await this.createAuditLog({
        userId,
        action: AuditAction.CONSENT_GRANTED,
        resource: 'Consent',
        resourceId: consentRecord.id,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: {
          type: consent.type,
          version: consent.version,
          surface: metadata.surface,
        },
      });
    }

    return { success: true, data: createdConsents };
  }

  /**
   * Revoke a consent
   * SOC2/HIPAA: Tracks consent revocation with audit trail
   */
  async revokeConsent(
    userId: string,
    type: ConsentType,
    version: string,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<SuccessResponse> {
    const consent = await this.prisma.consent.findUnique({
      where: {
        userId_type_version: {
          userId,
          type: type as PrismaConsentType,
          version,
        },
      },
    });

    if (!consent) {
      throw new NotFoundException('Consent record not found');
    }

    const updated = await this.prisma.consent.update({
      where: { id: consent.id },
      data: {
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    // SOC2/HIPAA: Audit log for consent revocation
    await this.createAuditLog({
      userId,
      action: AuditAction.CONSENT_REVOKED,
      resource: 'Consent',
      resourceId: consent.id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { type, version },
    });

    return { success: true, data: updated };
  }

  /**
   * Get user's consent history
   */
  async getUserConsents(userId: string): Promise<SuccessResponse> {
    const consents = await this.prisma.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: consents };
  }

  /**
   * Check if user needs to re-consent to updated documents
   * SOC2: Ensures users consent to latest versions
   */
  async checkReconsentNeeded(userId: string): Promise<SuccessResponse> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { allowedAI: true },
    });

    // Check if user has ever granted health data consent (opt-in feature)
    const hasHealthConsent = await this.prisma.consent.findFirst({
      where: {
        userId,
        type: PrismaConsentType.HEALTH_DATA_CONSENT,
        status: ConsentStatus.GRANTED,
      },
    });

    const requiredConsentTypes: ConsentType[] = [
      ...REQUIRED_REGISTRATION_CONSENTS,
      ...(profile?.allowedAI ? AI_OPT_IN_CONSENTS : []),
      ...(hasHealthConsent ? HEALTH_OPT_IN_CONSENTS : []),
    ];

    // Get active documents for required consent types
    const activeDocuments = await this.prisma.legalDocument.findMany({
      where: {
        type: { in: requiredConsentTypes as PrismaConsentType[] },
        isActive: true,
        effectiveAt: { lte: new Date() },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { effectiveAt: 'desc' },
      distinct: ['type'],
    });

    // Get user's granted consents
    const userConsents = await this.prisma.consent.findMany({
      where: {
        userId,
        type: { in: requiredConsentTypes as PrismaConsentType[] },
        status: ConsentStatus.GRANTED,
      },
      orderBy: { grantedAt: 'desc' },
    });

    const outdatedConsents: Array<{
      type: string;
      currentVersion: string;
      userVersion: string;
    }> = [];
    const missingConsents: string[] = [];

    for (const doc of activeDocuments) {
      const userConsent = userConsents.find((c) => c.type === doc.type);

      if (!userConsent) {
        missingConsents.push(doc.type);
      } else if (userConsent.version !== doc.version) {
        outdatedConsents.push({
          type: doc.type,
          currentVersion: doc.version,
          userVersion: userConsent.version,
        });
      }
    }

    const needsReconsent =
      outdatedConsents.length > 0 || missingConsents.length > 0;

    return {
      success: true,
      data: {
        needsReconsent,
        outdatedConsents,
        missingConsents,
      },
    };
  }

  // ─── Email Preferences (GDPR Art. 21) ───────────────────────

  async getEmailPreferences(userId: string): Promise<SuccessResponse> {
    const consent = await this.prisma.consent.findFirst({
      where: {
        userId,
        type: PrismaConsentType.MARKETING,
        status: ConsentStatus.GRANTED,
      },
      orderBy: { grantedAt: 'desc' },
    });
    return { success: true, data: { marketingOptIn: !!consent } };
  }

  async updateEmailPreferences(
    userId: string,
    marketingOptIn: boolean,
    metadata: { ipAddress?: string; userAgent?: string },
  ): Promise<SuccessResponse> {
    if (marketingOptIn) {
      // Find active MARKETING legal doc to get current version
      const doc = await this.prisma.legalDocument.findFirst({
        where: {
          type: PrismaConsentType.MARKETING,
          isActive: true,
          effectiveAt: { lte: new Date() },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { version: true },
        orderBy: { effectiveAt: 'desc' },
      });
      if (!doc) {
        throw new BadRequestException(
          'No active MARKETING policy found. Cannot opt in.',
        );
      }
      await this.recordConsents(
        userId,
        [{ type: 'MARKETING', version: doc.version }],
        { ...metadata, surface: 'email-preferences' },
      );
    } else {
      // Revoke all granted MARKETING consents
      const granted = await this.prisma.consent.findMany({
        where: {
          userId,
          type: PrismaConsentType.MARKETING,
          status: ConsentStatus.GRANTED,
        },
      });
      for (const c of granted) {
        await this.revokeConsent(userId, 'MARKETING', c.version, metadata);
      }
    }
    return { success: true, data: { marketingOptIn } };
  }

  /**
   * Generate a signed unsubscribe URL for placing in email footers.
   */
  buildUnsubscribeUrl(userId: string): string {
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    const token = generateUnsubscribeToken(userId, secret);
    const baseUrl =
      this.config.get<string>('FRONTEND_URL') || 'https://varaperformance.com';
    return `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
  }

  /**
   * Process a one-click unsubscribe from an email link (RFC 8058).
   * Validates the token and revokes all MARKETING consents.
   */
  async processUnsubscribe(token: string): Promise<SuccessResponse> {
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    const userId = verifyUnsubscribeToken(token, secret);
    if (!userId) {
      throw new BadRequestException(
        'Invalid or expired unsubscribe link. Please manage your preferences from account settings.',
      );
    }

    const granted = await this.prisma.consent.findMany({
      where: {
        userId,
        type: PrismaConsentType.MARKETING,
        status: ConsentStatus.GRANTED,
      },
    });

    for (const c of granted) {
      await this.prisma.consent.update({
        where: { id: c.id },
        data: { status: ConsentStatus.REVOKED, revokedAt: new Date() },
      });
      await this.createAuditLog({
        userId,
        action: AuditAction.CONSENT_REVOKED,
        resource: 'Consent',
        resourceId: c.id,
        metadata: {
          type: 'MARKETING',
          version: c.version,
          surface: 'email-unsubscribe',
        },
      });
    }

    return { success: true, data: { unsubscribed: true } };
  }

  /**
   * SOC2/HIPAA: Create audit log entry
   */
  private async createAuditLog(params: {
    userId?: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        ...this.encryptAuditMeta(params.ipAddress, params.userAgent),
        metadata: params.metadata as Prisma.InputJsonValue,
      },
    });
  }

  private encryptMeta(ipAddress?: string, userAgent?: string) {
    if (!ipAddress && !userAgent) return {};
    const payload = JSON.stringify({ ipAddress, userAgent });
    const enc = this.encryption.encrypt(payload);
    return {
      eConsentMeta: enc.encryptedContent,
      consentMetaIv: enc.contentIv,
      consentMetaAuthTag: enc.contentAuthTag,
      consentMetaWrappedKey: enc.wrappedKey,
    };
  }

  private encryptAuditMeta(ipAddress?: string, userAgent?: string) {
    if (!ipAddress && !userAgent) return {};
    const payload = JSON.stringify({ ipAddress, userAgent });
    const enc = this.encryption.encrypt(payload);
    return {
      eAuditMeta: enc.encryptedContent,
      auditMetaIv: enc.contentIv,
      auditMetaAuthTag: enc.contentAuthTag,
      auditMetaWrappedKey: enc.wrappedKey,
    };
  }
}
