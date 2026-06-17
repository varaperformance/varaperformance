import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { DatabaseService } from '@app/database';
import {
  CreateCoachContract,
  CreateCoachContractVersion,
  CoachContractQuery,
  CoachContractResponse,
  CoachContractListItem,
  CoachContractVersion,
  ContractVersionType,
  PaginatedResponse,
  SuccessResponse,
} from '@varaperformance/core';
import {
  coachingContractSelect,
  coachingContractListSelect,
  coachingContractVersionSelect,
} from './selectors/coaching.selector';

/**
 * Coach Contract Service
 * WORM (Write Once Read Many) compliant contract management
 *
 * Core principles:
 * - Contracts are immutable once created
 * - New versions preserve previous versions for audit trail
 * - Content hashing for tamper detection
 * - Semantic versioning (vX.X.X) for change tracking
 * - Each coach maintains their own contract versions
 */
@Injectable()
export class ContractService {
  constructor(private readonly db: DatabaseService) {}

  // ==========================================================================
  // Public Methods (for clients viewing contracts)
  // ==========================================================================

  /**
   * Get active contract for a coach
   * Used when clients need to sign contracts
   */
  async getActiveContract(
    coachId: string,
  ): Promise<SuccessResponse<CoachContractResponse | null>> {
    const contract = await this.db.coachingContract.findFirst({
      where: { coachId, isActive: true },
      select: coachingContractSelect,
    });

    return {
      success: true,
      data: contract ? this.serializeContract(contract) : null,
    };
  }

  // ==========================================================================
  // Coach Methods (coach managing their own contracts)
  // ==========================================================================

  /**
   * Get all contracts for a coach with pagination
   */
  async findAllForCoach(
    coachId: string,
    query: CoachContractQuery,
  ): Promise<PaginatedResponse<CoachContractListItem>> {
    const { page, limit, activeOnly } = query;
    const skip = (page - 1) * limit;

    const where: NonNullable<
      Parameters<typeof this.db.coachingContract.findMany>[0]
    >['where'] = { coachId };

    if (activeOnly) {
      where.isActive = true;
    }

    const [contracts, total] = await Promise.all([
      this.db.coachingContract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: coachingContractListSelect,
      }),
      this.db.coachingContract.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: contracts.map((c) => this.serializeContractListItem(c)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + contracts.length < total,
      },
    };
  }

  /**
   * Get a single contract with full content
   */
  async findOne(
    id: string,
    coachId?: string,
  ): Promise<SuccessResponse<CoachContractResponse>> {
    const where: { id: string; coachId?: string } = { id };
    if (coachId) {
      where.coachId = coachId;
    }

    const contract = await this.db.coachingContract.findFirst({
      where,
      select: coachingContractSelect,
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return { success: true, data: this.serializeContract(contract) };
  }

  /**
   * Get version history for a coach's contracts
   * WORM: Provides complete audit trail
   */
  async getVersionHistory(
    coachId: string,
  ): Promise<SuccessResponse<CoachContractVersion[]>> {
    const versions = await this.db.coachingContract.findMany({
      where: { coachId },
      orderBy: { createdAt: 'desc' },
      select: coachingContractVersionSelect,
    });

    return {
      success: true,
      data: versions.map((v) => this.serializeContractVersion(v)),
    };
  }

  /**
   * Create a new contract for a coach
   * WORM: Creates immutable record with content hash
   */
  async create(
    coachId: string,
    data: CreateCoachContract,
  ): Promise<SuccessResponse<CoachContractResponse>> {
    // Verify coach exists
    const coach = await this.db.coach.findUnique({
      where: { id: coachId },
      select: { id: true },
    });

    if (!coach) {
      throw new NotFoundException('Coach not found');
    }

    const version = await this.getNextVersion(coachId);
    const hashValue = this.generateContentHash(data.content);

    // Deactivate any existing active contracts for this coach
    await this.db.coachingContract.updateMany({
      where: { coachId, isActive: true },
      data: { isActive: false },
    });

    const contract = await this.db.coachingContract.create({
      data: {
        coachId,
        version,
        title: data.title,
        content: data.content,
        hashValue,
        cancellationPolicy: data.cancellationPolicy,
        refundPolicy: data.refundPolicy,
        effectiveAt: data.effectiveAt ? new Date(data.effectiveAt) : new Date(),
        isActive: true,
      },
      select: coachingContractSelect,
    });

    return { success: true, data: this.serializeContract(contract) };
  }

  /**
   * Create a new version of an existing contract (WORM compliant)
   * Never modifies existing records - creates new version
   * The old version is deactivated but preserved for audit trail
   */
  async createVersion(
    sourceId: string,
    coachId: string,
    data: CreateCoachContractVersion,
  ): Promise<
    SuccessResponse<{
      contract: CoachContractResponse;
      previousVersion: string;
      message: string;
    }>
  > {
    // Get the source contract and verify ownership
    const source = await this.db.coachingContract.findUnique({
      where: { id: sourceId },
      select: {
        coachId: true,
        title: true,
        version: true,
        cancellationPolicy: true,
        refundPolicy: true,
      },
    });

    if (!source) {
      throw new NotFoundException('Source contract not found');
    }

    if (source.coachId !== coachId) {
      throw new ForbiddenException('You can only version your own contracts');
    }

    const version = await this.getNextVersion(coachId, data.versionType);
    const hashValue = this.generateContentHash(data.content);

    // Deactivate all existing active contracts for this coach
    await this.db.coachingContract.updateMany({
      where: { coachId, isActive: true },
      data: { isActive: false },
    });

    // Create new version (immutable - never modifies old records)
    const contract = await this.db.coachingContract.create({
      data: {
        coachId,
        version,
        title: data.title ?? source.title,
        content: data.content,
        hashValue,
        cancellationPolicy:
          data.cancellationPolicy ?? source.cancellationPolicy,
        refundPolicy: data.refundPolicy ?? source.refundPolicy,
        effectiveAt: data.effectiveAt ? new Date(data.effectiveAt) : new Date(),
        isActive: true,
      },
      select: coachingContractSelect,
    });

    return {
      success: true,
      data: {
        contract: this.serializeContract(contract),
        previousVersion: source.version,
        message: `New version ${version} created. Previous version ${source.version} preserved for audit trail.`,
      },
    };
  }

  /**
   * Verify contract integrity by comparing hash
   * WORM: Tamper detection for compliance
   */
  async verifyIntegrity(
    id: string,
  ): Promise<SuccessResponse<{ isValid: boolean; message: string }>> {
    const contract = await this.db.coachingContract.findUnique({
      where: { id },
      select: { content: true, hashValue: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const computedHash = this.generateContentHash(contract.content);
    const isValid = computedHash === contract.hashValue;

    return {
      success: true,
      data: {
        isValid,
        message: isValid
          ? 'Contract integrity verified - content matches stored hash'
          : 'INTEGRITY VIOLATION - Contract content has been tampered with',
      },
    };
  }

  // ==========================================================================
  // Admin Methods (for platform admins)
  // ==========================================================================

  /**
   * Get all contracts across all coaches (admin only)
   */
  async findAll(
    query: CoachContractQuery,
  ): Promise<PaginatedResponse<CoachContractListItem>> {
    const { page, limit, coachId, activeOnly } = query;
    const skip = (page - 1) * limit;

    const where: NonNullable<
      Parameters<typeof this.db.coachingContract.findMany>[0]
    >['where'] = {};

    if (coachId) {
      where.coachId = coachId;
    }

    if (activeOnly) {
      where.isActive = true;
    }

    const [contracts, total] = await Promise.all([
      this.db.coachingContract.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ coachId: 'asc' }, { createdAt: 'desc' }],
        select: coachingContractListSelect,
      }),
      this.db.coachingContract.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: contracts.map((c) => this.serializeContractListItem(c)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + contracts.length < total,
      },
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private serializeContract(c: {
    effectiveAt: Date;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    [key: string]: unknown;
  }): CoachContractResponse {
    return {
      ...c,
      effectiveAt: c.effectiveAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    } as CoachContractResponse;
  }

  private serializeContractListItem(c: {
    effectiveAt: Date;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    [key: string]: unknown;
  }): CoachContractListItem {
    return {
      ...c,
      effectiveAt: c.effectiveAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    } as CoachContractListItem;
  }

  private serializeContractVersion(c: {
    effectiveAt: Date;
    expiresAt: Date | null;
    createdAt: Date;
    [key: string]: unknown;
  }): CoachContractVersion {
    return {
      ...c,
      effectiveAt: c.effectiveAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    } as CoachContractVersion;
  }

  /**
   * Generate SHA256 hash of content for tamper detection
   */
  private generateContentHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Generate next version number based on existing versions for a coach
   * Uses semantic versioning format: vMAJOR.MINOR.PATCH
   * - MAJOR: Breaking changes to contract structure
   * - MINOR: New sections/content additions
   * - PATCH: Corrections, typos, clarifications (default increment)
   */
  private async getNextVersion(
    coachId: string,
    incrementType: ContractVersionType = 'patch',
  ): Promise<string> {
    const latestContract = await this.db.coachingContract.findFirst({
      where: { coachId },
      orderBy: { createdAt: 'desc' },
      select: { version: true },
    });

    if (!latestContract) {
      return 'v1.0.0';
    }

    // Parse version (e.g., "v1.2.3" -> [1, 2, 3])
    const versionStr = latestContract.version.replace(/^v/, '');
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
