import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { DatabaseService } from '@app/database';
import {
  CreateLegalDocument,
  CreateLegalDocumentVersion,
  LegalDocumentQuery,
  VersionType,
  PaginatedResponse,
  SuccessResponse,
} from '@varaperformance/core';
import { ConsentType } from '@generated/prisma';
import {
  legalDocumentSelector,
  legalDocumentListSelector,
  legalDocumentVersionSelector,
  LegalDocumentFull,
  LegalDocumentListItem,
  LegalDocumentVersionItem,
} from './selectors/legal.selector';

/**
 * Legal Document Service
 * SOC2/HIPAA: WORM (Write Once Read Many) compliant legal document management
 *
 * Core principles:
 * - Documents are immutable once created
 * - New versions preserve previous versions for audit trail
 * - Content hashing for tamper detection
 * - Semantic versioning for change tracking
 */
@Injectable()
export class LegalService {
  constructor(private readonly db: DatabaseService) {}

  // ==========================================================================
  // Public Methods (for consent module)
  // ==========================================================================

  /**
   * Get all active legal documents
   * Used for user consent flows
   */
  async getActiveLegalDocuments(
    types?: ConsentType[],
  ): Promise<SuccessResponse<LegalDocumentFull[]>> {
    const where: NonNullable<
      Parameters<typeof this.db.legalDocument.findMany>[0]
    >['where'] = {
      isActive: true,
    };

    if (types && types.length > 0) {
      where.type = { in: types };
    }

    const documents = await this.db.legalDocument.findMany({
      where,
      select: legalDocumentSelector,
      orderBy: { type: 'asc' },
    });

    return { success: true, data: documents };
  }

  // ==========================================================================
  // Admin Methods (require permissions)
  // ==========================================================================

  /**
   * Get all legal documents with pagination
   * Admin view showing all versions (active and inactive)
   */
  async findAll(
    query: LegalDocumentQuery,
  ): Promise<PaginatedResponse<LegalDocumentListItem>> {
    const { page, limit, type, activeOnly } = query;
    const skip = (page - 1) * limit;

    const where: NonNullable<
      Parameters<typeof this.db.legalDocument.findMany>[0]
    >['where'] = {};

    if (type) {
      where.type = type as ConsentType;
    }

    if (activeOnly) {
      where.isActive = true;
    }

    const [documents, total] = await Promise.all([
      this.db.legalDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
        select: legalDocumentListSelector,
      }),
      this.db.legalDocument.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: documents,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + documents.length < total,
      },
    };
  }

  /**
   * Get a single legal document with full content
   */
  async findOne(id: string): Promise<SuccessResponse<LegalDocumentFull>> {
    const document = await this.db.legalDocument.findUnique({
      where: { id },
      select: legalDocumentSelector,
    });

    if (!document) {
      throw new NotFoundException('Legal document not found');
    }

    return { success: true, data: document };
  }

  /**
   * Get version history for a document type
   * SOC2/HIPAA: Provides complete audit trail
   */
  async getVersionHistory(
    type: ConsentType,
  ): Promise<SuccessResponse<LegalDocumentVersionItem[]>> {
    const versions = await this.db.legalDocument.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
      select: legalDocumentVersionSelector,
    });

    return { success: true, data: versions };
  }

  /**
   * Create a new legal document
   * SOC2/HIPAA: Creates immutable record with content hash
   */
  async create(
    data: CreateLegalDocument,
  ): Promise<SuccessResponse<LegalDocumentFull>> {
    const type = data.type as ConsentType;
    const version = await this.getNextVersion(type);
    const hashValue = this.generateContentHash(data.content);

    // Deactivate any existing active documents of this type
    await this.db.legalDocument.updateMany({
      where: { type, isActive: true },
      data: { isActive: false },
    });

    const document = await this.db.legalDocument.create({
      data: {
        type,
        version,
        title: data.title,
        content: data.content,
        hashValue,
        effectiveAt: data.effectiveAt ?? new Date(),
        isActive: true,
      },
      select: legalDocumentSelector,
    });

    return { success: true, data: document };
  }

  /**
   * Create a new version of an existing legal document (WORM compliant)
   * SOC2/HIPAA: Never modifies existing records - creates new version
   * The old version is deactivated but preserved for audit trail
   */
  async createVersion(
    sourceId: string,
    data: CreateLegalDocumentVersion,
  ): Promise<
    SuccessResponse<{
      document: LegalDocumentFull;
      previousVersion: string;
      message: string;
    }>
  > {
    // Get the source document
    const source = await this.db.legalDocument.findUnique({
      where: { id: sourceId },
      select: { type: true, title: true, version: true },
    });

    if (!source) {
      throw new NotFoundException('Source legal document not found');
    }

    const version = await this.getNextVersion(source.type, data.versionType);
    const hashValue = this.generateContentHash(data.content);

    // Deactivate all existing active documents of this type
    await this.db.legalDocument.updateMany({
      where: { type: source.type, isActive: true },
      data: { isActive: false },
    });

    // Create new version (immutable - never modifies old records)
    const document = await this.db.legalDocument.create({
      data: {
        type: source.type,
        version,
        title: data.title ?? source.title,
        content: data.content,
        hashValue,
        effectiveAt: data.effectiveAt ?? new Date(),
        isActive: true,
      },
      select: legalDocumentSelector,
    });

    return {
      success: true,
      data: {
        document,
        previousVersion: source.version,
        message: `New version ${version} created. Previous version ${source.version} preserved for audit trail.`,
      },
    };
  }

  /**
   * Verify document integrity by comparing hash
   * SOC2/HIPAA: Tamper detection for compliance
   */
  async verifyIntegrity(
    id: string,
  ): Promise<SuccessResponse<{ isValid: boolean; message: string }>> {
    const document = await this.db.legalDocument.findUnique({
      where: { id },
      select: { content: true, hashValue: true },
    });

    if (!document) {
      throw new NotFoundException('Legal document not found');
    }

    const computedHash = this.generateContentHash(document.content);
    const isValid = computedHash === document.hashValue;

    return {
      success: true,
      data: {
        isValid,
        message: isValid
          ? 'Document integrity verified - content matches stored hash'
          : 'INTEGRITY VIOLATION - Document content has been tampered with',
      },
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Generate SHA256 hash of content for tamper detection
   */
  private generateContentHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Generate next version number based on existing versions
   * Uses semantic versioning format: vMAJOR.MINOR.PATCH
   * - MAJOR: Breaking changes to document structure
   * - MINOR: New sections/content additions
   * - PATCH: Corrections, typos, clarifications (default increment)
   */
  private async getNextVersion(
    type: ConsentType,
    incrementType: VersionType = 'patch',
  ): Promise<string> {
    const latestDoc = await this.db.legalDocument.findFirst({
      where: { type },
      orderBy: { createdAt: 'desc' },
      select: { version: true },
    });

    if (!latestDoc) {
      return 'v1.0.0';
    }

    // Parse version (e.g., "v1.2.3" -> [1, 2, 3])
    const versionStr = latestDoc.version.replace(/^v/, '');
    const parts = versionStr.split('.').map((p) => parseInt(p, 10) || 0);

    // Ensure we have 3 parts [major, minor, patch]
    while (parts.length < 3) parts.push(0);

    // Increment based on type
    switch (incrementType) {
      case 'major':
        parts[0] += 1;
        parts[1] = 0;
        parts[2] = 0;
        break;
      case 'minor':
        parts[1] += 1;
        parts[2] = 0;
        break;
      case 'patch':
      default:
        parts[2] += 1;
        break;
    }

    return `v${parts.join('.')}`;
  }
}
