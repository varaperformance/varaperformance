import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService, SignatureService } from '@app/security';
import { MailService } from '@app/common/mailer';
import { SubscriptionService } from '../payment/services/subscription.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import type {
  ApplyCoachApplication,
  CoachDesignation,
  CreateCoachReview,
  CreateCoachPackage,
  CoachListData,
  CoachListItem,
  CoachResponse,
  CoachQuery,
  CoachReviewsData,
  CoachReviewResponse,
  CoachingContractResponse,
  ContractSignatureResponse,
  SuccessResponse,
  ErrorResponse,
  UpdateCoachPackage,
} from '@varaperformance/core';
import {
  coachListSelect,
  coachDetailSelect,
  coachPackageSelect,
  coachReviewSelect,
  coachingContractSelect,
} from './selectors/coaching.selector';
import {
  Prisma,
  BookingStatus,
  SubscriptionStatus,
  VolumeUnit,
} from '../generated/prisma/client';

@Injectable()
export class CoachingService {
  private readonly logger = new Logger(CoachingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly signatureService: SignatureService,
    private readonly mailService: MailService,
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  private getCoachDesignationMeta(
    _certifications: string[],
    certificationEvidence: unknown,
  ): { designation: CoachDesignation; influencerSocialLinks: string[] } {
    if (
      certificationEvidence &&
      typeof certificationEvidence === 'object' &&
      !Array.isArray(certificationEvidence)
    ) {
      const evidenceRecord = certificationEvidence as Record<string, unknown>;
      const designation = evidenceRecord.applicationType;
      const rawLinks = evidenceRecord.influencerSocialLinks;
      const influencerSocialLinks = Array.isArray(rawLinks)
        ? rawLinks.filter((item): item is string => typeof item === 'string')
        : [];

      if (designation === 'INFLUENCER') {
        return { designation: 'INFLUENCER', influencerSocialLinks };
      }
    }

    return {
      designation: 'CERTIFIED',
      influencerSocialLinks: [],
    };
  }

  /**
   * Get paginated list of coaches with optional filters
   */
  async findAll(
    query: CoachQuery,
  ): Promise<SuccessResponse<CoachListData> | ErrorResponse> {
    const {
      specialty,
      available,
      featured,
      designation,
      search,
      page = 1,
      limit = 12,
      sortBy = 'rating',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: Prisma.CoachWhereInput = {
      isVerified: true,
    };

    if (specialty) {
      where.specialties = { has: specialty };
    }

    if (available !== undefined) {
      where.isAvailable = available;
    }

    if (featured !== undefined) {
      where.isFeatured = featured;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        {
          user: {
            profile: { displayName: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    // Build order by
    const orderBy: Prisma.CoachOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries
    const [coaches, total] = await Promise.all([
      this.db.coach.findMany({
        where,
        select: coachListSelect,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.coach.count({ where }),
    ]);

    // Transform to response
    let items: CoachListItem[] = coaches.map((coach) => {
      const meta = this.getCoachDesignationMeta(
        coach.certifications,
        coach.certificationEvidence,
      );
      return {
        id: coach.id,
        slug: coach.user.profile?.displayName ?? coach.id, // Use displayName as slug, fallback to id
        userId: coach.userId,
        title: coach.title,
        bio: coach.bio,
        location: coach.location,
        experienceYears: coach.experienceYears,
        certifications: coach.certifications,
        designation: meta.designation,
        influencerSocialLinks: meta.influencerSocialLinks,
        specialties: coach.specialties,
        isAvailable: coach.isAvailable,
        isFeatured: coach.isFeatured,
        isVerified: coach.isVerified,
        rating: Number(coach.rating),
        reviewCount: coach.reviewCount,
        clientCount: coach.clientCount,
        profile: coach.user.profile
          ? {
              displayName: coach.user.profile.displayName,
              avatarUrl: coach.user.profile.avatarUrl,
            }
          : null,
        startingPrice: coach.packages[0]?.priceInCents ?? null,
      };
    });

    if (designation) {
      items = items.filter((coach) => coach.designation === designation);
    }

    return {
      success: true as const,
      data: { items, total, page, limit },
    };
  }

  /**
   * Get full coach details by slug (profile displayName)
   */
  async findOne(
    slug: string,
  ): Promise<SuccessResponse<CoachResponse> | ErrorResponse> {
    const coach = await this.db.coach.findFirst({
      where: {
        isVerified: true,
        user: {
          profile: {
            displayName: slug,
          },
        },
      },
      select: coachDetailSelect,
    });

    if (!coach) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Coach not found' },
      };
    }

    const coachMeta = this.getCoachDesignationMeta(
      coach.certifications,
      coach.certificationEvidence,
    );

    return {
      success: true as const,
      data: {
        id: coach.id,
        slug: coach.user.profile?.displayName ?? coach.id,
        userId: coach.userId,
        title: coach.title,
        bio: coach.bio,
        location: coach.location,
        experienceYears: coach.experienceYears,
        certifications: coach.certifications,
        designation: coachMeta.designation,
        influencerSocialLinks: coachMeta.influencerSocialLinks,
        specialties: coach.specialties,
        isAvailable: coach.isAvailable,
        isFeatured: coach.isFeatured,
        isVerified: coach.isVerified,
        rating: Number(coach.rating),
        reviewCount: coach.reviewCount,
        clientCount: coach.clientCount,
        createdAt: coach.createdAt.toISOString(),
        profile: coach.user.profile
          ? {
              displayName: coach.user.profile.displayName,
              avatarUrl: coach.user.profile.avatarUrl,
            }
          : null,
        packages: coach.packages.map((pkg) => ({
          id: pkg.id,
          coachId: pkg.coachId,
          name: pkg.name,
          description: pkg.description,
          priceInCents: pkg.priceInCents,
          billingCycle: pkg.billingCycle,
          features: pkg.features,
          isActive: pkg.isActive,
          sortOrder: pkg.sortOrder,
          createdAt: pkg.createdAt,
          updatedAt: pkg.updatedAt,
        })),
      },
    };
  }

  /**
   * Get reviews for a coach
   */
  async getReviews(
    coachId: string,
    page = 1,
    limit = 10,
  ): Promise<SuccessResponse<CoachReviewsData> | ErrorResponse> {
    // Verify coach exists
    const coach = await this.db.coach.findUnique({
      where: { id: coachId },
      select: { id: true, rating: true, reviewCount: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Coach not found' },
      };
    }

    const [reviews, total] = await Promise.all([
      this.db.coachReview.findMany({
        where: { coachId },
        select: coachReviewSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.coachReview.count({ where: { coachId } }),
    ]);

    const items: CoachReviewResponse[] = reviews.map((review) => ({
      id: review.id,
      coachId: review.coachId,
      rating: review.rating,
      title: review.title,
      content: review.content,
      isVerified: review.isVerified,
      createdAt: review.createdAt.toISOString(),
      user: {
        displayName: review.user.profile?.displayName ?? null,
        avatarUrl: review.user.profile?.avatarUrl ?? null,
      },
    }));

    return {
      success: true as const,
      data: {
        items,
        total,
        averageRating: Number(coach.rating),
      },
    };
  }

  /**
   * Create or update an authenticated user's review for a coach.
   * A user can only have one review per coach.
   */
  async createReview(
    userId: string,
    coachId: string,
    data: CreateCoachReview,
  ): Promise<SuccessResponse | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { id: coachId },
      select: { id: true, userId: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Coach not found' },
      };
    }

    if (coach.userId === userId) {
      return {
        success: false as const,
        error: { code: 'FORBIDDEN', message: 'You cannot review yourself' },
      };
    }

    const savedReview = await this.db.coachReview.upsert({
      where: {
        coachId_userId: {
          coachId,
          userId,
        },
      },
      update: {
        rating: data.rating,
        title: data.title?.trim() || null,
        content: data.content?.trim() || null,
      },
      create: {
        coachId,
        userId,
        rating: data.rating,
        title: data.title?.trim() || null,
        content: data.content?.trim() || null,
        isVerified: false,
      },
      select: {
        id: true,
        coachId: true,
        userId: true,
        rating: true,
        title: true,
        content: true,
        isVerified: true,
        createdAt: true,
      },
    });

    const aggregates = await this.db.coachReview.aggregate({
      where: { coachId },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.db.coach.update({
      where: { id: coachId },
      data: {
        rating: aggregates._avg.rating ?? 0,
        reviewCount: aggregates._count.id,
      },
    });

    // Notify coach they received a review
    void this.notificationService.create({
      userId: coach.userId,
      type: 'REVIEW_RECEIVED',
      title: 'New review received',
      body: `You received a ${data.rating}-star review.`,
      actionUrl: `/coaching/profile/${coachId}`,
      data: { reviewId: savedReview.id, coachId },
    });

    return {
      success: true as const,
      data: {
        ...savedReview,
        createdAt: savedReview.createdAt.toISOString(),
      },
    };
  }

  /**
   * Get featured coaches for homepage
   */
  async getFeatured(
    limit = 6,
  ): Promise<SuccessResponse<CoachListItem[]> | ErrorResponse> {
    const coaches = await this.db.coach.findMany({
      where: {
        isFeatured: true,
        isAvailable: true,
        isVerified: true,
      },
      select: coachListSelect,
      orderBy: { rating: 'desc' },
      take: limit,
    });

    const items: CoachListItem[] = coaches.map((coach) => {
      const meta = this.getCoachDesignationMeta(
        coach.certifications,
        coach.certificationEvidence,
      );
      return {
        id: coach.id,
        slug: coach.user.profile?.displayName ?? coach.id,
        userId: coach.userId,
        title: coach.title,
        bio: coach.bio,
        location: coach.location,
        experienceYears: coach.experienceYears,
        certifications: coach.certifications,
        designation: meta.designation,
        influencerSocialLinks: meta.influencerSocialLinks,
        specialties: coach.specialties,
        isAvailable: coach.isAvailable,
        isFeatured: coach.isFeatured,
        isVerified: coach.isVerified,
        rating: Number(coach.rating),
        reviewCount: coach.reviewCount,
        clientCount: coach.clientCount,
        profile: coach.user.profile
          ? {
              displayName: coach.user.profile.displayName,
              avatarUrl: coach.user.profile.avatarUrl,
            }
          : null,
        startingPrice: coach.packages[0]?.priceInCents ?? null,
      };
    });

    return {
      success: true as const,
      data: items,
    };
  }

  /**
   * Submit or update an authenticated user's coach application.
   * Applications remain unverified and unavailable until reviewed by admin.
   */
  async applyAsCoach(
    userId: string,
    data: ApplyCoachApplication,
  ): Promise<SuccessResponse | ErrorResponse> {
    const existingCoach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true, isVerified: true },
    });

    if (existingCoach?.isVerified) {
      return {
        success: false as const,
        error: {
          code: 'CONFLICT',
          message: 'You are already an approved coach',
        },
      };
    }

    const normalizedDesignation = data.designation ?? 'CERTIFIED';

    const payload = {
      title: data.title.trim(),
      bio: data.bio.trim(),
      location: data.location.trim(),
      experienceYears: data.experienceYears,
      certifications:
        normalizedDesignation === 'INFLUENCER'
          ? []
          : data.certifications.map((cert) => cert.name.trim()),
      certificationEvidence:
        normalizedDesignation === 'INFLUENCER'
          ? {
              applicationType: 'INFLUENCER',
              influencerSocialLinks: data.influencerSocialLinks,
            }
          : {
              applicationType: 'CERTIFIED',
              certifications: data.certifications,
            },
      specialties: data.specialties,
      isAvailable: false,
      isFeatured: false,
      isVerified: false,
    };

    const coach = existingCoach
      ? await this.db.coach.update({
          where: { id: existingCoach.id },
          data: payload,
        })
      : await this.db.coach.create({
          data: {
            userId,
            ...payload,
          },
        });

    return {
      success: true,
      data: coach,
      message: existingCoach
        ? 'Application updated and sent for review'
        : 'Application submitted for review',
    };
  }

  /**
   * Get active contract for a coach
   */
  async getContract(
    coachId: string,
  ): Promise<SuccessResponse<CoachingContractResponse> | ErrorResponse> {
    const contract = await this.db.coachingContract.findFirst({
      where: {
        coachId,
        isActive: true,
        effectiveAt: { lte: new Date() },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: coachingContractSelect,
      orderBy: { effectiveAt: 'desc' },
    });

    if (!contract) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'No active contract found for this coach',
        },
      };
    }

    return {
      success: true as const,
      data: {
        id: contract.id,
        coachId: contract.coachId,
        version: contract.version,
        title: contract.title,
        content: contract.content,
        hashValue: contract.hashValue,
        effectiveAt: contract.effectiveAt.toISOString(),
        expiresAt: contract.expiresAt?.toISOString() ?? null,
        cancellationPolicy: contract.cancellationPolicy,
        refundPolicy: contract.refundPolicy,
      },
    };
  }

  /**
   * Sign a contract for a booking
   */
  async signContract(params: {
    userId: string;
    bookingId: string;
    contractId: string;
    signature: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SuccessResponse<ContractSignatureResponse> | ErrorResponse> {
    const { userId, bookingId, contractId, signature, ipAddress, userAgent } =
      params;

    // Verify booking exists and belongs to user
    const booking = await this.db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        coachId: true,
        status: true,
        contractSignature: true,
      },
    });

    if (!booking) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Booking not found' },
      };
    }

    if (booking.userId !== userId) {
      return {
        success: false as const,
        error: { code: 'FORBIDDEN', message: 'You do not own this booking' },
      };
    }

    if (booking.contractSignature) {
      return {
        success: false as const,
        error: {
          code: 'CONFLICT',
          message: 'Contract already signed for this booking',
        },
      };
    }

    // Verify contract exists and is active
    const contract = await this.db.coachingContract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        coachId: true,
        hashValue: true,
        isActive: true,
        effectiveAt: true,
        expiresAt: true,
      },
    });

    if (!contract) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      };
    }

    if (contract.coachId !== booking.coachId) {
      return {
        success: false as const,
        error: {
          code: 'BAD_REQUEST',
          message: 'Contract does not belong to this coach',
        },
      };
    }

    if (!contract.isActive) {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: 'Contract is no longer active' },
      };
    }

    // Create cryptographic signature for legal non-repudiation
    const signedAt = new Date();
    const signingPayload = this.signatureService.createContractSigningPayload({
      contractId,
      contractHash: contract.hashValue ?? '',
      userId,
      bookingId,
      userSignatureInput: signature, // User's typed signature
      timestamp: signedAt.toISOString(),
    });

    const digitalSig = this.signatureService.sign(signingPayload);

    // Create signature record with cryptographic proof
    const contractSignature = await this.db.contractSignature.create({
      data: {
        contractId,
        bookingId,
        userId,
        signedAt,
        ipAddress,
        userAgent,
        ...this.encryptSignatureMeta(ipAddress, userAgent),
        contractHashAtSigning: contract.hashValue ?? '',
        // Cryptographic signature fields
        signatureAlgorithm: digitalSig.algorithm,
        digitalSignature: digitalSig.signature,
        publicKeyFingerprint: digitalSig.publicKeyFingerprint,
        signingPayload,
        userSignatureInput: signature,
      },
      select: {
        id: true,
        contractId: true,
        bookingId: true,
        signedAt: true,
      },
    });

    this.logger.log(
      `Contract signed with ECDSA: contractId=${contractId}, userId=${userId}, keyFingerprint=${digitalSig.publicKeyFingerprint}`,
    );

    return {
      success: true as const,
      data: {
        id: contractSignature.id,
        contractId: contractSignature.contractId,
        bookingId: contractSignature.bookingId,
        signedAt: contractSignature.signedAt.toISOString(),
        signature,
      },
    };
  }

  /**
   * Verify the cryptographic integrity of a contract signature
   * Used for legal disputes or audit verification
   */
  async verifyContractSignature(
    signatureId: string,
  ): Promise<
    SuccessResponse<{ isValid: boolean; algorithm: string; message: string }>
  > {
    const sig = await this.db.contractSignature.findUnique({
      where: { id: signatureId },
      select: {
        id: true,
        signatureAlgorithm: true,
        digitalSignature: true,
        publicKeyFingerprint: true,
        signingPayload: true,
      },
    });

    if (!sig) {
      return {
        success: true as const,
        data: {
          isValid: false,
          algorithm: 'unknown',
          message: 'Contract signature not found',
        },
      };
    }

    // Legacy signatures without cryptographic proof
    if (!sig.signingPayload || !sig.digitalSignature) {
      return {
        success: true as const,
        data: {
          isValid: false,
          algorithm: sig.signatureAlgorithm ?? 'legacy',
          message:
            'Legacy signature without cryptographic proof - signed before ECDSA was implemented',
        },
      };
    }

    // Verify cryptographic signature
    const result = this.signatureService.verify(sig.signingPayload, {
      algorithm: sig.signatureAlgorithm,
      signature: sig.digitalSignature,
      publicKeyFingerprint: sig.publicKeyFingerprint ?? '',
      signedAt: '', // Not needed for verification
    });

    this.logger.log(
      `Signature verification: id=${signatureId}, isValid=${result.isValid}, algorithm=${result.algorithm}`,
    );

    return {
      success: true as const,
      data: {
        isValid: result.isValid,
        algorithm: result.algorithm,
        message: result.message,
      },
    };
  }

  // ============================================
  // Coach Dashboard Methods (for coaches managing their own business)
  // ============================================

  /**
   * Get current user's coach profile
   */
  async getMyCoachProfile(
    userId: string,
  ): Promise<SuccessResponse<CoachResponse> | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: coachDetailSelect,
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const coachMeta = this.getCoachDesignationMeta(
      coach.certifications,
      coach.certificationEvidence,
    );

    return {
      success: true as const,
      data: {
        id: coach.id,
        slug: coach.user.profile?.displayName ?? coach.id,
        userId: coach.userId,
        title: coach.title,
        bio: coach.bio,
        location: coach.location,
        experienceYears: coach.experienceYears,
        certifications: coach.certifications,
        designation: coachMeta.designation,
        influencerSocialLinks: coachMeta.influencerSocialLinks,
        specialties: coach.specialties,
        isAvailable: coach.isAvailable,
        isFeatured: coach.isFeatured,
        isVerified: coach.isVerified,
        rating: Number(coach.rating),
        reviewCount: coach.reviewCount,
        clientCount: coach.clientCount,
        createdAt: coach.createdAt.toISOString(),
        profile: coach.user.profile
          ? {
              displayName: coach.user.profile.displayName,
              avatarUrl: coach.user.profile.avatarUrl,
            }
          : null,
        packages: coach.packages.map((pkg) => ({
          id: pkg.id,
          coachId: pkg.coachId,
          name: pkg.name,
          description: pkg.description,
          priceInCents: pkg.priceInCents,
          billingCycle: pkg.billingCycle,
          features: pkg.features,
          isActive: pkg.isActive,
          sortOrder: pkg.sortOrder,
          createdAt: pkg.createdAt,
          updatedAt: pkg.updatedAt,
        })),
      },
    };
  }

  /**
   * Get coach dashboard stats
   */
  async getDashboardStats(
    userId: string,
  ): Promise<SuccessResponse<CoachDashboardStats> | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    // Get various stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalBookings,
      activeBookings,
      thisMonthBookings,
      lastMonthBookings,
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      avgRating,
      reviewCount,
    ] = await Promise.all([
      // Total bookings for this coach
      this.db.booking.count({ where: { coachId: coach.id } }),
      // Active/confirmed bookings
      this.db.booking.count({
        where: { coachId: coach.id, status: BookingStatus.CONFIRMED },
      }),
      // Bookings this month
      this.db.booking.count({
        where: { coachId: coach.id, createdAt: { gte: startOfMonth } },
      }),
      // Bookings last month
      this.db.booking.count({
        where: {
          coachId: coach.id,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
      // Total revenue from completed payments (using bookingIds from coach's bookings)
      this.db.booking
        .findMany({
          where: { coachId: coach.id },
          select: { id: true },
        })
        .then((bookings) =>
          this.db.payment.aggregate({
            where: {
              bookingId: { in: bookings.map((b) => b.id) },
              status: 'SUCCEEDED',
            },
            _sum: { amountInCents: true },
          }),
        ),
      // This month's revenue
      this.db.booking
        .findMany({
          where: { coachId: coach.id },
          select: { id: true },
        })
        .then((bookings) =>
          this.db.payment.aggregate({
            where: {
              bookingId: { in: bookings.map((b) => b.id) },
              status: 'SUCCEEDED',
              createdAt: { gte: startOfMonth },
            },
            _sum: { amountInCents: true },
          }),
        ),
      // Last month's revenue
      this.db.booking
        .findMany({
          where: { coachId: coach.id },
          select: { id: true },
        })
        .then((bookings) =>
          this.db.payment.aggregate({
            where: {
              bookingId: { in: bookings.map((b) => b.id) },
              status: 'SUCCEEDED',
              createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
            },
            _sum: { amountInCents: true },
          }),
        ),
      // Average rating
      this.db.coachReview.aggregate({
        where: { coachId: coach.id },
        _avg: { rating: true },
      }),
      // Review count
      this.db.coachReview.count({ where: { coachId: coach.id } }),
    ]);

    const thisMonthRev = thisMonthRevenue._sum?.amountInCents ?? 0;
    const lastMonthRev = lastMonthRevenue._sum?.amountInCents ?? 0;
    const revenueChange =
      lastMonthRev > 0
        ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100)
        : thisMonthRev > 0
          ? 100
          : 0;

    const clientGrowth =
      lastMonthBookings > 0
        ? Math.round(
            ((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100,
          )
        : thisMonthBookings > 0
          ? 100
          : 0;

    return {
      success: true as const,
      data: {
        totalClients: totalBookings,
        activeClients: activeBookings,
        newClientsThisMonth: thisMonthBookings,
        clientGrowthPercent: clientGrowth,
        totalRevenueCents: totalRevenue._sum?.amountInCents ?? 0,
        monthlyRevenueCents: thisMonthRev,
        revenueChangePercent: revenueChange,
        avgRating: avgRating._avg.rating || 0,
        reviewCount,
      },
    };
  }

  /**
   * Update the logged-in coach's availability toggle
   */
  async updateMyAvailability(
    userId: string,
    isAvailable: boolean,
  ): Promise<SuccessResponse | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const updated = await this.db.coach.update({
      where: { id: coach.id },
      data: { isAvailable },
      select: {
        id: true,
        isAvailable: true,
      },
    });

    return {
      success: true as const,
      data: updated,
    };
  }

  /**
   * List packages for the logged-in coach (active + archived)
   */
  async getMyPackages(
    userId: string,
  ): Promise<SuccessResponse | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const packages = await this.db.coachPackage.findMany({
      where: { coachId: coach.id },
      select: coachPackageSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      success: true as const,
      data: packages,
    };
  }

  /**
   * Create a package for the logged-in coach
   */
  async createMyPackage(
    userId: string,
    data: CreateCoachPackage,
  ): Promise<SuccessResponse | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const created = await this.db.coachPackage.create({
      data: {
        coachId: coach.id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        priceInCents: data.priceInCents,
        billingCycle: data.billingCycle,
        features: data.features
          .map((f) => f.trim())
          .filter((f) => f.length > 0),
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
      select: coachPackageSelect,
    });

    return {
      success: true as const,
      data: created,
    };
  }

  /**
   * Update a package owned by the logged-in coach
   */
  async updateMyPackage(
    userId: string,
    packageId: string,
    data: UpdateCoachPackage,
  ): Promise<SuccessResponse | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const existing = await this.db.coachPackage.findFirst({
      where: { id: packageId, coachId: coach.id },
      select: { id: true },
    });

    if (!existing) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'Package not found',
        },
      };
    }

    const updated = await this.db.coachPackage.update({
      where: { id: packageId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.priceInCents !== undefined
          ? { priceInCents: data.priceInCents }
          : {}),
        ...(data.billingCycle !== undefined
          ? { billingCycle: data.billingCycle }
          : {}),
        ...(data.features !== undefined
          ? {
              features: data.features
                .map((feature) => feature.trim())
                .filter((feature) => feature.length > 0),
            }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
      select: coachPackageSelect,
    });

    return {
      success: true as const,
      data: updated,
    };
  }

  /**
   * Archive a package (soft delete) owned by the logged-in coach
   */
  async archiveMyPackage(
    userId: string,
    packageId: string,
  ): Promise<SuccessResponse | ErrorResponse> {
    return this.updateMyPackage(userId, packageId, { isActive: false });
  }

  /**
   * Permanently delete a package owned by the logged-in coach.
   * Allowed only when there are no active/past-due/paused subscriptions.
   */
  async deleteMyPackage(
    userId: string,
    packageId: string,
  ): Promise<
    SuccessResponse<{ deleted: true; packageId: string }> | ErrorResponse
  > {
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const existing = await this.db.coachPackage.findFirst({
      where: { id: packageId, coachId: coach.id },
      select: { id: true },
    });

    if (!existing) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'Package not found',
        },
      };
    }

    const blockingSubscriptions = await this.db.subscription.count({
      where: {
        packageId,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAUSED,
            SubscriptionStatus.PAST_DUE,
          ],
        },
      },
    });

    if (blockingSubscriptions > 0) {
      return {
        success: false as const,
        error: {
          code: 'CONFLICT',
          message:
            'Cannot delete package while active subscriptions exist. Archive it instead.',
        },
      };
    }

    await this.db.$transaction(async (tx) => {
      // Remove non-active historical subscription and booking rows so package deletion succeeds.
      await tx.subscription.deleteMany({
        where: { packageId },
      });

      await tx.booking.deleteMany({
        where: { packageId },
      });

      await tx.coachPackage.delete({ where: { id: packageId } });
    });

    return {
      success: true as const,
      data: { deleted: true, packageId },
    };
  }

  /**
   * Get coach's clients (bookings with user info)
   */
  async getMyClients(
    userId: string,
    options?: { status?: string; page?: number; limit?: number },
  ): Promise<SuccessResponse<CoachClientsData> | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const { status, page = 1, limit = 20 } = options || {};

    const where: Prisma.BookingWhereInput = { coachId: coach.id };
    if (status) {
      where.status = status.toUpperCase() as BookingStatus;
    }

    const [bookings, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        select: {
          id: true,
          referenceCode: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              priceInCents: true,
              billingCycle: true,
            },
          },
          subscription: {
            select: {
              id: true,
              status: true,
              stripeSubscriptionId: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
              cancelledAt: true,
              scheduledCancellationAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.booking.count({ where }),
    ]);

    const clients = bookings.map((b) => ({
      bookingId: b.id,
      referenceCode: b.referenceCode,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      user: {
        id: b.user.id,
        email: b.user.email,
        displayName: b.user.profile?.displayName ?? null,
        avatarUrl: b.user.profile?.avatarUrl ?? null,
      },
      package: {
        id: b.package.id,
        name: b.package.name,
        priceInCents: b.package.priceInCents,
        billingCycle: b.package.billingCycle,
      },
      subscription: b.subscription
        ? {
            id: b.subscription.id,
            status: b.subscription.status,
            stripeSubscriptionId: b.subscription.stripeSubscriptionId,
            currentPeriodStart: b.subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: b.subscription.currentPeriodEnd.toISOString(),
            cancelledAt: b.subscription.cancelledAt?.toISOString() ?? null,
            scheduledCancellationAt:
              b.subscription.scheduledCancellationAt?.toISOString() ?? null,
          }
        : null,
    }));

    return {
      success: true as const,
      data: { clients, total, page, limit },
    };
  }

  /**
   * Get detailed client info including decrypted intake form
   */
  async getClientDetails(
    userId: string,
    bookingId: string,
  ): Promise<
    | SuccessResponse<{
        bookingId: string;
        referenceCode: string;
        status: string;
        createdAt: string;
        user: {
          id: string;
          email: string;
          displayName: string | null;
          avatarUrl: string | null;
        };
        package: {
          id: string;
          name: string;
          priceInCents: number;
          billingCycle: string;
        };
        subscription: {
          id: string;
          status: string;
          stripeSubscriptionId: string | null;
          currentPeriodStart: string;
          currentPeriodEnd: string;
          cancelledAt: string | null;
          scheduledCancellationAt: string | null;
        } | null;
        intake: {
          firstName?: string;
          lastName?: string;
          phone?: string;
          goals?: string;
          experience?: string;
          injuries?: string;
        } | null;
        contractSignature: {
          id: string;
          signedAt: string;
          signatureAlgorithm: string;
          userSignatureInput: string | null;
          contractVersion: string;
          contractTitle: string;
          isVerified: boolean;
          verificationMessage: string;
        } | null;
      }>
    | ErrorResponse
  > {
    // Verify user is a coach
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    // Get booking with all details
    const booking = await this.db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        referenceCode: true,
        status: true,
        createdAt: true,
        coachId: true,
        eIntake: true,
        intakeIv: true,
        intakeAuthTag: true,
        intakeWrappedKey: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        package: {
          select: {
            id: true,
            name: true,
            priceInCents: true,
            billingCycle: true,
          },
        },
        subscription: {
          select: {
            id: true,
            status: true,
            stripeSubscriptionId: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelledAt: true,
            scheduledCancellationAt: true,
          },
        },
        contractSignature: {
          select: {
            id: true,
            signedAt: true,
            signatureAlgorithm: true,
            digitalSignature: true,
            publicKeyFingerprint: true,
            signingPayload: true,
            userSignatureInput: true,
            contractHashAtSigning: true,
            contract: {
              select: {
                version: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Booking not found' },
      };
    }

    // Verify booking belongs to this coach
    if (booking.coachId !== coach.id) {
      return {
        success: false as const,
        error: {
          code: 'FORBIDDEN',
          message: 'This booking does not belong to you',
        },
      };
    }

    // Decrypt intake data if present
    let intake: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      goals?: string;
      experience?: string;
      injuries?: string;
    } | null = null;

    if (
      booking.eIntake &&
      booking.intakeIv &&
      booking.intakeAuthTag &&
      booking.intakeWrappedKey
    ) {
      try {
        const decrypted = this.encryption.decrypt({
          encryptedContent: Buffer.from(booking.eIntake),
          contentIv: Buffer.from(booking.intakeIv),
          contentAuthTag: Buffer.from(booking.intakeAuthTag),
          wrappedKey: Buffer.from(booking.intakeWrappedKey),
        });
        intake = JSON.parse(decrypted.toString());
      } catch (error) {
        // Log but don't fail - intake is optional
        console.error('Failed to decrypt intake data:', error);
      }
    }

    // Verify contract signature if present
    let contractSignatureInfo: {
      id: string;
      signedAt: string;
      signatureAlgorithm: string;
      userSignatureInput: string | null;
      contractVersion: string;
      contractTitle: string;
      isVerified: boolean;
      verificationMessage: string;
    } | null = null;

    if (booking.contractSignature) {
      const sig = booking.contractSignature;
      let isVerified = false;
      let verificationMessage = 'Legacy signature without cryptographic proof';

      // Verify digital signature if present
      if (sig.signingPayload && sig.digitalSignature) {
        const result = this.signatureService.verify(sig.signingPayload, {
          algorithm: sig.signatureAlgorithm,
          signature: sig.digitalSignature,
          publicKeyFingerprint: sig.publicKeyFingerprint ?? '',
          signedAt: sig.signedAt.toISOString(),
        });
        isVerified = result.isValid;
        verificationMessage = result.message;
      }

      contractSignatureInfo = {
        id: sig.id,
        signedAt: sig.signedAt.toISOString(),
        signatureAlgorithm: sig.signatureAlgorithm,
        userSignatureInput: sig.userSignatureInput,
        contractVersion: sig.contract.version,
        contractTitle: sig.contract.title,
        isVerified,
        verificationMessage,
      };
    }

    return {
      success: true as const,
      data: {
        bookingId: booking.id,
        referenceCode: booking.referenceCode,
        status: booking.status,
        createdAt: booking.createdAt.toISOString(),
        user: {
          id: booking.user.id,
          email: booking.user.email,
          displayName: booking.user.profile?.displayName ?? null,
          avatarUrl: booking.user.profile?.avatarUrl ?? null,
        },
        package: {
          id: booking.package.id,
          name: booking.package.name,
          priceInCents: booking.package.priceInCents,
          billingCycle: booking.package.billingCycle,
        },
        subscription: booking.subscription
          ? {
              id: booking.subscription.id,
              status: booking.subscription.status,
              stripeSubscriptionId: booking.subscription.stripeSubscriptionId,
              currentPeriodStart:
                booking.subscription.currentPeriodStart.toISOString(),
              currentPeriodEnd:
                booking.subscription.currentPeriodEnd.toISOString(),
              cancelledAt:
                booking.subscription.cancelledAt?.toISOString() ?? null,
              scheduledCancellationAt:
                booking.subscription.scheduledCancellationAt?.toISOString() ??
                null,
            }
          : null,
        intake,
        contractSignature: contractSignatureInfo,
      },
    };
  }

  private convertToOunces(amount: number, unit: VolumeUnit): number {
    if (unit === VolumeUnit.OZ) return amount;
    if (unit === VolumeUnit.CUPS) return amount * 8;
    if (unit === VolumeUnit.L) return amount * 33.814;
    return amount * 0.033814;
  }

  async getClientMetrics(
    coachUserId: string,
    bookingId: string,
    options?: { days?: number },
  ): Promise<
    | SuccessResponse<{
        bookingId: string;
        userId: string;
        window: { days: number; since: string };
        summary: {
          workoutSessions: number;
          foodEntries: number;
          weightEntries: number;
          waterEntries: number;
          totalCalories: number;
          totalWaterOunces: number;
          latestWeight: {
            value: number;
            unit: 'LB' | 'KG';
            loggedAt: string;
          } | null;
          weightChange: {
            value: number;
            unit: 'LB' | 'KG';
          } | null;
        };
        workoutLogs: Array<{
          id: string;
          title: string | null;
          startedAt: string;
          endedAt: string | null;
          durationMinutes: number | null;
          exerciseCount: number;
          setCount: number;
          exercises: string[];
        }>;
        foodDiary: Array<{
          id: string;
          loggedAt: string;
          mealType: string;
          name: string;
          servings: number;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        }>;
        weightLogs: Array<{
          id: string;
          loggedAt: string;
          value: number;
          unit: 'LB' | 'KG';
          bodyFat: number | null;
          muscleMass: number | null;
        }>;
        waterLogs: Array<{
          id: string;
          loggedAt: string;
          amount: number;
          unit: VolumeUnit;
          amountOunces: number;
        }>;
        healthTrends: {
          steps: {
            avgDailySteps: number | null;
            trend: Array<{ date: string; steps: number }>;
          };
          sleep: {
            avgDurationHours: number | null;
            trend: Array<{ date: string; durationHours: number }>;
          };
          heartRate: {
            avgRestingBpm: number | null;
          };
        };
      }>
    | ErrorResponse
  > {
    const coach = await this.db.coach.findUnique({
      where: { userId: coachUserId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const booking = await this.db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        coachId: true,
        status: true,
        subscription: {
          select: {
            id: true,
            status: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!booking) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Booking not found' },
      };
    }

    if (booking.coachId !== coach.id) {
      return {
        success: false as const,
        error: {
          code: 'FORBIDDEN',
          message: 'This booking does not belong to you',
        },
      };
    }

    const hasActiveSubscription =
      booking.status === BookingStatus.CONFIRMED &&
      booking.subscription?.status === SubscriptionStatus.ACTIVE &&
      booking.subscription.currentPeriodEnd.getTime() > Date.now();

    if (!hasActiveSubscription) {
      return {
        success: false as const,
        error: {
          code: 'FORBIDDEN',
          message:
            'Client metrics are only available while subscription is active',
        },
      };
    }

    const requestedDays = options?.days ?? 30;
    const days = Math.min(Math.max(requestedDays, 7), 180);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      sessions,
      foodLogs,
      weightLogsRaw,
      waterLogs,
      stepLogs,
      sleepLogs,
      heartRateLogs,
    ] = await Promise.all([
      this.db.workoutSession.findMany({
        where: {
          userId: booking.userId,
          startedAt: { gte: since },
        },
        orderBy: { startedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          startedAt: true,
          endedAt: true,
          workouts: {
            select: {
              id: true,
              exercise: {
                select: {
                  id: true,
                  name: true,
                },
              },
              sets: {
                select: { id: true },
              },
            },
          },
        },
      }),
      this.db.foodLog.findMany({
        where: {
          userId: booking.userId,
          loggedAt: { gte: since },
        },
        orderBy: { loggedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          loggedAt: true,
          mealType: true,
          servings: true,
          quickAddName: true,
          totalCalories: true,
          totalProtein: true,
          totalCarbs: true,
          totalFat: true,
          food: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.db.weightLog.findMany({
        where: {
          userId: booking.userId,
          loggedAt: { gte: since },
        },
        orderBy: { loggedAt: 'desc' },
        take: 40,
        select: {
          id: true,
          loggedAt: true,
          encryptedData: true,
          dataIv: true,
          dataAuthTag: true,
          wrappedKey: true,
          encryptedBodyFat: true,
          bodyFatIv: true,
          bodyFatAuthTag: true,
          bodyFatWrappedKey: true,
          encryptedMuscleMass: true,
          muscleMassIv: true,
          muscleMassAuthTag: true,
          muscleMassWrappedKey: true,
        },
      }),
      this.db.waterLog.findMany({
        where: {
          userId: booking.userId,
          loggedAt: { gte: since },
        },
        orderBy: { loggedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          loggedAt: true,
          amount: true,
          unit: true,
        },
      }),
      this.db.stepLog.findMany({
        where: { userId: booking.userId, date: { gte: since } },
        select: { date: true, steps: true },
      }),
      this.db.sleepLog.findMany({
        where: { userId: booking.userId, date: { gte: since } },
        orderBy: { date: 'desc' },
        take: 30,
        select: { date: true, duration: true },
      }),
      this.db.heartRateLog.findMany({
        where: { userId: booking.userId, timestamp: { gte: since } },
        select: { timestamp: true, bpm: true },
      }),
    ]);

    const workoutLogs = sessions.map((session) => {
      const setCount = session.workouts.reduce(
        (sum, workout) => sum + workout.sets.length,
        0,
      );
      const durationMinutes =
        session.endedAt && session.startedAt
          ? Math.max(
              1,
              Math.round(
                (session.endedAt.getTime() - session.startedAt.getTime()) /
                  60000,
              ),
            )
          : null;

      return {
        id: session.id,
        title: session.title,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString() ?? null,
        durationMinutes,
        exerciseCount: session.workouts.length,
        setCount,
        exercises: Array.from(
          new Set(session.workouts.map((workout) => workout.exercise.name)),
        ),
      };
    });

    const foodDiary = foodLogs.map((log) => ({
      id: log.id,
      loggedAt: log.loggedAt.toISOString(),
      mealType: log.mealType,
      name: log.quickAddName || log.food?.name || 'Food entry',
      servings: log.servings,
      calories: log.totalCalories,
      protein: log.totalProtein,
      carbs: log.totalCarbs,
      fat: log.totalFat,
    }));

    const weightLogs: Array<{
      id: string;
      loggedAt: string;
      value: number;
      unit: 'LB' | 'KG';
      bodyFat: number | null;
      muscleMass: number | null;
    }> = [];

    for (const log of weightLogsRaw) {
      try {
        const decryptedWeight = this.encryption.decrypt({
          encryptedContent: Buffer.from(log.encryptedData),
          contentIv: Buffer.from(log.dataIv),
          contentAuthTag: Buffer.from(log.dataAuthTag),
          wrappedKey: Buffer.from(log.wrappedKey),
        });
        const weightPayload = JSON.parse(decryptedWeight.toString()) as {
          value: number;
          unit: 'LB' | 'KG';
        };

        let bodyFat: number | null = null;
        if (
          log.encryptedBodyFat &&
          log.bodyFatIv &&
          log.bodyFatAuthTag &&
          log.bodyFatWrappedKey
        ) {
          const decryptedBodyFat = this.encryption.decrypt({
            encryptedContent: Buffer.from(log.encryptedBodyFat),
            contentIv: Buffer.from(log.bodyFatIv),
            contentAuthTag: Buffer.from(log.bodyFatAuthTag),
            wrappedKey: Buffer.from(log.bodyFatWrappedKey),
          });
          bodyFat = Number(decryptedBodyFat.toString());
        }

        let muscleMass: number | null = null;
        if (
          log.encryptedMuscleMass &&
          log.muscleMassIv &&
          log.muscleMassAuthTag &&
          log.muscleMassWrappedKey
        ) {
          const decryptedMuscleMass = this.encryption.decrypt({
            encryptedContent: Buffer.from(log.encryptedMuscleMass),
            contentIv: Buffer.from(log.muscleMassIv),
            contentAuthTag: Buffer.from(log.muscleMassAuthTag),
            wrappedKey: Buffer.from(log.muscleMassWrappedKey),
          });
          muscleMass = Number(decryptedMuscleMass.toString());
        }

        weightLogs.push({
          id: log.id,
          loggedAt: log.loggedAt.toISOString(),
          value: weightPayload.value,
          unit: weightPayload.unit,
          bodyFat,
          muscleMass,
        });
      } catch {
        // Skip malformed/undecryptable entries without failing the whole response.
      }
    }

    const waterLogsMapped = waterLogs.map((log) => ({
      id: log.id,
      loggedAt: log.loggedAt.toISOString(),
      amount: log.amount,
      unit: log.unit,
      amountOunces: this.convertToOunces(log.amount, log.unit),
    }));

    // Step trend: aggregate multi-source daily totals
    const stepDailyTotals = new Map<string, number>();
    for (const log of stepLogs) {
      const key = log.date.toISOString().split('T')[0];
      stepDailyTotals.set(key, (stepDailyTotals.get(key) ?? 0) + log.steps);
    }
    const stepValues = [...stepDailyTotals.values()];
    const avgDailySteps =
      stepValues.length > 0
        ? Math.round(stepValues.reduce((s, v) => s + v, 0) / stepValues.length)
        : null;
    const stepTrend = [...stepDailyTotals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, steps]) => ({ date, steps }));

    // Sleep trend: daily duration in hours
    const sleepTrend = sleepLogs.map((log) => ({
      date: log.date.toISOString().split('T')[0],
      durationHours: Math.round(log.duration * 10) / 10,
    }));
    const avgSleepHours =
      sleepLogs.length > 0
        ? Math.round(
            (sleepLogs.reduce((s, l) => s + l.duration, 0) / sleepLogs.length) *
              10,
          ) / 10
        : null;

    // Heart rate: average resting bpm over window
    const avgRestingBpm =
      heartRateLogs.length > 0
        ? Math.round(
            heartRateLogs.reduce((s, l) => s + l.bpm, 0) / heartRateLogs.length,
          )
        : null;

    const totalCalories = foodDiary.reduce(
      (sum, entry) => sum + entry.calories,
      0,
    );
    const totalWaterOunces = waterLogsMapped.reduce(
      (sum, entry) => sum + entry.amountOunces,
      0,
    );
    const latestWeight = weightLogs[0] ?? null;
    const oldestWeight =
      weightLogs.length > 1 ? weightLogs[weightLogs.length - 1] : null;
    const weightChange =
      latestWeight && oldestWeight && latestWeight.unit === oldestWeight.unit
        ? {
            value: Number((latestWeight.value - oldestWeight.value).toFixed(2)),
            unit: latestWeight.unit,
          }
        : null;

    return {
      success: true as const,
      data: {
        bookingId: booking.id,
        userId: booking.userId,
        window: {
          days,
          since: since.toISOString(),
        },
        summary: {
          workoutSessions: workoutLogs.length,
          foodEntries: foodDiary.length,
          weightEntries: weightLogs.length,
          waterEntries: waterLogsMapped.length,
          totalCalories: Number(totalCalories.toFixed(0)),
          totalWaterOunces: Number(totalWaterOunces.toFixed(1)),
          latestWeight: latestWeight
            ? {
                value: latestWeight.value,
                unit: latestWeight.unit,
                loggedAt: latestWeight.loggedAt,
              }
            : null,
          weightChange,
        },
        workoutLogs,
        foodDiary,
        weightLogs,
        waterLogs: waterLogsMapped,
        healthTrends: {
          steps: {
            avgDailySteps,
            trend: stepTrend,
          },
          sleep: {
            avgDurationHours: avgSleepHours,
            trend: sleepTrend,
          },
          heartRate: {
            avgRestingBpm,
          },
        },
      },
    };
  }

  /**
   * Update a booking's status (for coaches to approve/complete/cancel bookings)
   */
  async updateBookingStatus(
    userId: string,
    bookingId: string,
    newStatus: 'APPROVED' | 'COMPLETED' | 'CANCELLED',
  ): Promise<
    SuccessResponse<{ bookingId: string; status: string }> | ErrorResponse
  > {
    // Verify user is a coach
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: {
        id: true,
        title: true,
        user: {
          select: {
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    // Get booking with user and package info for email
    const booking = await this.db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        coachId: true,
        status: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
        package: {
          select: {
            name: true,
            priceInCents: true,
            billingCycle: true,
          },
        },
      },
    });

    if (!booking) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Booking not found' },
      };
    }

    // Verify booking belongs to this coach
    if (booking.coachId !== coach.id) {
      return {
        success: false as const,
        error: {
          code: 'FORBIDDEN',
          message: 'This booking does not belong to you',
        },
      };
    }

    // Validate status transitions
    // PENDING → APPROVED (coach approves, user can now pay)
    // PENDING → CANCELLED (coach rejects)
    // APPROVED → CANCELLED (cancel before payment)
    // CONFIRMED → COMPLETED (coaching ended naturally)
    // CONFIRMED → CANCELLED (cancel active subscription)
    const validTransitions: Record<string, string[]> = {
      PENDING: ['APPROVED', 'CANCELLED'],
      APPROVED: ['CANCELLED'],
      CONFIRMED: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      REFUNDED: [],
    };

    if (!validTransitions[booking.status]?.includes(newStatus)) {
      return {
        success: false as const,
        error: {
          code: 'BAD_REQUEST',
          message: `Cannot change booking from ${booking.status} to ${newStatus}`,
        },
      };
    }

    // Cancel subscription when completing or cancelling a confirmed booking
    if (
      booking.status === 'CONFIRMED' &&
      (newStatus === 'COMPLETED' || newStatus === 'CANCELLED')
    ) {
      const subscription = await this.db.subscription.findUnique({
        where: { bookingId },
      });

      if (subscription) {
        try {
          // Only try to cancel with Stripe if there's a Stripe subscription ID
          if (subscription.stripeSubscriptionId) {
            await this.subscriptionService.cancelSubscription(
              subscription.id,
              undefined,
              true,
            );
          } else {
            // Just mark local subscription as cancelled
            await this.db.subscription.update({
              where: { id: subscription.id },
              data: { status: 'CANCELLED', cancelledAt: new Date() },
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to cancel subscription for booking ${bookingId}`,
            error,
          );
          // Continue anyway - we still want to update the booking status
        }
      }

      // Decrement client count when ending active coaching
      await this.db.coach.update({
        where: { id: booking.coachId },
        data: { clientCount: { decrement: 1 } },
      });
    }

    // Update booking status
    const updated = await this.db.booking.update({
      where: { id: bookingId },
      data: { status: newStatus as BookingStatus },
      select: { id: true, status: true },
    });

    // Send email notification when booking is approved
    if (newStatus === 'APPROVED') {
      const formatPrice = (cents: number, cycle: string) => {
        const dollars = cents / 100;
        const cycleLabel =
          cycle === 'MONTHLY'
            ? '/month'
            : cycle === 'QUARTERLY'
              ? '/quarter'
              : '/year';
        return `$${dollars}${cycleLabel}`;
      };

      try {
        await this.mailService.sendBookingApprovedEmail({
          email: booking.user.email,
          name: booking.user.profile?.displayName || undefined,
          coachName: coach.user.profile?.displayName || 'Your Coach',
          coachTitle: coach.title || undefined,
          coachAvatarUrl: coach.user.profile?.avatarUrl || undefined,
          packageName: booking.package.name,
          packagePrice: formatPrice(
            booking.package.priceInCents,
            booking.package.billingCycle,
          ),
          bookingId: booking.id,
        });
      } catch (error) {
        // Log but don't fail - the booking was updated successfully
        this.logger.error(
          `Failed to send approval email for booking ${bookingId}`,
          error,
        );
      }

      // Send push notification to client
      try {
        const notification = await this.notificationService.create({
          userId: booking.user.id,
          type: 'BOOKING_APPROVED',
          title: 'Booking Approved',
          body: `${coach.user.profile?.displayName || 'Your coach'} approved your booking for ${booking.package.name}. Complete payment to start.`,
          actionUrl: `/my-coaching`,
          data: { bookingId: booking.id },
        });
        if (notification) {
          this.notificationGateway.sendToUser(booking.user.id, notification);
        }
      } catch (error) {
        this.logger.error(`Failed to send approval notification`, error);
      }
    }

    // Send notification when booking is cancelled
    if (newStatus === 'CANCELLED') {
      try {
        const notification = await this.notificationService.create({
          userId: booking.user.id,
          type: 'BOOKING_CANCELLED',
          title: 'Booking Cancelled',
          body: `Your booking for ${booking.package.name} has been cancelled.`,
          actionUrl: `/my-coaching`,
          data: { bookingId: booking.id },
        });
        if (notification) {
          this.notificationGateway.sendToUser(booking.user.id, notification);
        }
      } catch (error) {
        this.logger.error(`Failed to send cancellation notification`, error);
      }
    }

    return {
      success: true as const,
      data: { bookingId: updated.id, status: updated.status },
    };
  }

  /**
   * Get coach's monthly revenue for charts
   */
  async getRevenueHistory(
    userId: string,
    months = 6,
  ): Promise<SuccessResponse<MonthlyRevenueData[]> | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const result: MonthlyRevenueData[] = [];
    const now = new Date();

    // Get all booking IDs for this coach once
    const coachBookings = await this.db.booking.findMany({
      where: { coachId: coach.id },
      select: { id: true },
    });
    const bookingIds = coachBookings.map((b) => b.id);

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );

      const [revenue, clientCount] = await Promise.all([
        this.db.payment.aggregate({
          where: {
            bookingId: { in: bookingIds },
            status: 'SUCCEEDED',
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amountInCents: true },
        }),
        this.db.booking.count({
          where: {
            coachId: coach.id,
            createdAt: { lte: endDate },
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
          },
        }),
      ]);

      result.push({
        month: startDate.toLocaleString('default', { month: 'short' }),
        year: startDate.getFullYear(),
        revenueCents: revenue._sum?.amountInCents ?? 0,
        clientCount,
      });
    }

    return { success: true as const, data: result };
  }

  // ==========================================================================
  // Admin Coach Management
  // ==========================================================================

  /**
   * Get all coaches for admin management
   */
  async getCoachesAdmin(
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<SuccessResponse> {
    const skip = (page - 1) * limit;

    const where: Prisma.CoachWhereInput = {};

    if (status === 'pending') {
      where.isVerified = false;
    } else if (status === 'verified') {
      where.isVerified = true;
    } else if (status === 'featured') {
      where.isFeatured = true;
    }

    const [coaches, total] = await Promise.all([
      this.db.coach.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          title: true,
          bio: true,
          location: true,
          experienceYears: true,
          certifications: true,
          certificationEvidence: true,
          specialties: true,
          isAvailable: true,
          isFeatured: true,
          isVerified: true,
          rating: true,
          reviewCount: true,
          clientCount: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              email: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      this.db.coach.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: coaches.map((coach) => {
          const meta = this.getCoachDesignationMeta(
            coach.certifications,
            coach.certificationEvidence,
          );
          return {
            ...coach,
            designation: meta.designation,
            influencerSocialLinks: meta.influencerSocialLinks,
          };
        }),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + coaches.length < total,
      },
    };
  }

  /**
   * Get single coach details for admin
   */
  async getCoachAdmin(id: string): Promise<SuccessResponse | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        packages: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
    });

    if (!coach) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Coach not found' },
      } as ErrorResponse;
    }

    const meta = this.getCoachDesignationMeta(
      coach.certifications,
      coach.certificationEvidence,
    );

    return {
      success: true,
      data: {
        ...coach,
        designation: meta.designation,
        influencerSocialLinks: meta.influencerSocialLinks,
      },
    };
  }

  /**
   * Approve a coach application
   */
  async approveCoach(id: string): Promise<SuccessResponse | ErrorResponse> {
    const coachRole = await this.db.role.findFirst({
      where: {
        name: {
          equals: 'coach',
          mode: 'insensitive',
        },
      },
      include: {
        permissions: {
          select: {
            permissionId: true,
          },
        },
      },
    });

    if (!coachRole) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Coach role is missing. Run RBAC seed before approval.',
        },
      };
    }

    const coach = await this.db.$transaction(async (tx) => {
      const updatedCoach = await tx.coach.update({
        where: { id },
        data: { isVerified: true, isAvailable: true },
      });

      await tx.userRole.upsert({
        where: {
          userId_roleId: { userId: updatedCoach.userId, roleId: coachRole.id },
        },
        create: { userId: updatedCoach.userId, roleId: coachRole.id },
        update: {},
      });

      for (const rolePermission of coachRole.permissions) {
        await tx.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId: updatedCoach.userId,
              permissionId: rolePermission.permissionId,
            },
          },
          create: {
            userId: updatedCoach.userId,
            permissionId: rolePermission.permissionId,
          },
          update: {},
        });
      }

      return updatedCoach;
    });

    // Notify the coach their profile has been verified
    void this.notificationService.create({
      userId: coach.userId,
      type: 'PROFILE_VERIFIED',
      title: 'Profile verified',
      body: 'Congratulations! Your coach profile has been verified and is now visible to clients.',
      actionUrl: '/coaching/dashboard',
    });

    return { success: true, data: coach };
  }

  /**
   * Reject/revoke a coach application
   */
  async rejectCoach(
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _reason?: string,
  ): Promise<SuccessResponse> {
    const coachRole = await this.db.role.findUnique({
      where: { name: 'Coach' },
      include: {
        permissions: {
          select: {
            permissionId: true,
          },
        },
      },
    });

    const coach = await this.db.$transaction(async (tx) => {
      const updatedCoach = await tx.coach.update({
        where: { id },
        data: { isVerified: false, isAvailable: false, isFeatured: false },
      });

      if (coachRole) {
        await tx.userRole.deleteMany({
          where: {
            userId: updatedCoach.userId,
            roleId: coachRole.id,
          },
        });

        if (coachRole.permissions.length > 0) {
          await tx.userPermission.deleteMany({
            where: {
              userId: updatedCoach.userId,
              permissionId: {
                in: coachRole.permissions.map((p) => p.permissionId),
              },
            },
          });
        }
      }

      return updatedCoach;
    });

    return { success: true, data: coach };
  }

  /**
   * Toggle coach featured status
   */
  async toggleCoachFeatured(
    id: string,
  ): Promise<SuccessResponse | ErrorResponse> {
    const coach = await this.db.coach.findUnique({ where: { id } });
    if (!coach) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Coach not found' },
      } as ErrorResponse;
    }

    const updated = await this.db.coach.update({
      where: { id },
      data: { isFeatured: !coach.isFeatured },
    });

    return { success: true, data: updated };
  }

  /**
   * Delete a coach account from admin panel
   */
  async deleteCoach(id: string): Promise<SuccessResponse> {
    const coach = await this.db.coach.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!coach) {
      throw new NotFoundException('Coach not found');
    }

    const bookingCount = await this.db.booking.count({
      where: { coachId: id },
    });

    if (bookingCount > 0) {
      throw new ConflictException(
        'Cannot delete coach with existing bookings. Revoke verification instead.',
      );
    }

    const coachRole = await this.db.role.findUnique({
      where: { name: 'Coach' },
      include: {
        permissions: {
          select: {
            permissionId: true,
          },
        },
      },
    });

    await this.db.$transaction(async (tx) => {
      if (coachRole) {
        await tx.userRole.deleteMany({
          where: {
            userId: coach.userId,
            roleId: coachRole.id,
          },
        });

        if (coachRole.permissions.length > 0) {
          await tx.userPermission.deleteMany({
            where: {
              userId: coach.userId,
              permissionId: {
                in: coachRole.permissions.map((p) => p.permissionId),
              },
            },
          });
        }
      }

      await tx.coach.delete({ where: { id } });
    });

    return { success: true, data: { id } };
  }

  private encryptSignatureMeta(ipAddress?: string, userAgent?: string) {
    if (!ipAddress && !userAgent) return {};
    const payload = JSON.stringify({ ipAddress, userAgent });
    const enc = this.encryption.encrypt(payload);
    return {
      eSignatureMeta: enc.encryptedContent,
      signatureMetaIv: enc.contentIv,
      signatureMetaAuthTag: enc.contentAuthTag,
      signatureMetaWrappedKey: enc.wrappedKey,
    };
  }

  /**
   * Get aggregate client analytics for the coach dashboard.
   * Summarizes workout consistency, food logging, and weight trends
   * across all active clients.
   */
  async getClientAnalytics(
    userId: string,
    days = 30,
  ): Promise<SuccessResponse<CoachClientAnalytics> | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all active bookings for this coach
    const activeBookings = await this.db.booking.findMany({
      where: {
        coachId: coach.id,
        status: BookingStatus.CONFIRMED,
      },
      select: {
        userId: true,
        user: { select: { profile: { select: { displayName: true } } } },
      },
    });

    const clientUserIds = activeBookings.map((b) => b.userId);

    if (clientUserIds.length === 0) {
      return {
        success: true as const,
        data: {
          totalActiveClients: 0,
          periodDays: days,
          workoutConsistency: [],
          averageWorkoutsPerWeek: 0,
          averageFoodEntriesPerDay: 0,
          clientsLoggingWorkouts: 0,
          clientsLoggingFood: 0,
          clientsLoggingWeight: 0,
        },
      };
    }

    // Aggregate stats across all active clients
    const [workoutCounts, foodCounts, weightCounts] = await Promise.all([
      // Workout sessions per client
      this.db.workoutSession.groupBy({
        by: ['userId'],
        where: { userId: { in: clientUserIds }, startedAt: { gte: since } },
        _count: true,
      }),
      // Food log entries per client
      this.db.foodLog.groupBy({
        by: ['userId'],
        where: { userId: { in: clientUserIds }, loggedAt: { gte: since } },
        _count: true,
      }),
      // Weight log entries per client
      this.db.weightLog.groupBy({
        by: ['userId'],
        where: { userId: { in: clientUserIds }, loggedAt: { gte: since } },
        _count: true,
      }),
    ]);

    const workoutMap = new Map(workoutCounts.map((w) => [w.userId, w._count as number]));
    const foodMap = new Map(foodCounts.map((f) => [f.userId, f._count as number]));

    const totalWorkouts = workoutCounts.reduce((sum, w) => sum + (w._count as number), 0);
    const totalFoodEntries = foodCounts.reduce((sum, f) => sum + (f._count as number), 0);
    const weeks = Math.max(days / 7, 1);

    // Build per-client consistency data
    const workoutConsistency: Array<{ displayName: string; workouts: number; foodEntries: number }> = activeBookings.map((b) => ({
      displayName: (b.user as any)?.profile?.displayName ?? 'Client',
      workouts: workoutMap.get(b.userId) ?? 0,
      foodEntries: foodMap.get(b.userId) ?? 0,
    }));

    // Sort by workouts descending
    workoutConsistency.sort((a, b) => b.workouts - a.workouts);

    return {
      success: true as const,
      data: {
        totalActiveClients: clientUserIds.length,
        periodDays: days,
        workoutConsistency,
        averageWorkoutsPerWeek:
          Math.round((totalWorkouts / clientUserIds.length / weeks) * 10) / 10,
        averageFoodEntriesPerDay:
          Math.round((totalFoodEntries / clientUserIds.length / days) * 10) /
          10,
        clientsLoggingWorkouts: workoutCounts.length,
        clientsLoggingFood: foodCounts.length,
        clientsLoggingWeight: weightCounts.length,
      },
    };
  }

  /**
   * Export client list as CSV data
   */
  async exportClientsCsv(
    userId: string,
  ): Promise<SuccessResponse<{ csv: string }> | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const bookings = await this.db.booking.findMany({
      where: { coachId: coach.id },
      select: {
        referenceCode: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            profile: { select: { displayName: true } },
          },
        },
        package: {
          select: { name: true, priceInCents: true, billingCycle: true },
        },
        subscription: { select: { status: true, currentPeriodEnd: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Reference Code',
      'Name',
      'Email',
      'Status',
      'Package',
      'Price',
      'Billing Cycle',
      'Subscription Status',
      'Period End',
      'Booked On',
    ];

    const escapeCsvField = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = bookings.map((b) => [
      b.referenceCode,
      b.user?.profile?.displayName ?? '',
      b.user?.email ?? '',
      b.status,
      b.package?.name ?? '',
      b.package ? `$${(b.package.priceInCents / 100).toFixed(2)}` : '',
      b.package?.billingCycle ?? '',
      b.subscription?.status ?? 'N/A',
      b.subscription?.currentPeriodEnd
        ? new Date(b.subscription.currentPeriodEnd).toISOString().split('T')[0]
        : '',
      new Date(b.createdAt).toISOString().split('T')[0],
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvField).join(','))
      .join('\n');
    return { success: true as const, data: { csv } };
  }

  async getClientActivityTimeline(
    coachUserId: string,
    bookingId: string,
    options?: { days?: number; limit?: number },
  ): Promise<SuccessResponse<ClientActivityTimeline> | ErrorResponse> {
    const coach = await this.db.coach.findUnique({
      where: { userId: coachUserId },
      select: { id: true },
    });

    if (!coach) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: 'You are not registered as a coach',
        },
      };
    }

    const booking = await this.db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        coachId: true,
        status: true,
        subscription: {
          select: { status: true, currentPeriodEnd: true },
        },
      },
    });

    if (!booking) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Booking not found' },
      };
    }

    if (booking.coachId !== coach.id) {
      return {
        success: false as const,
        error: {
          code: 'FORBIDDEN',
          message: 'This booking does not belong to you',
        },
      };
    }

    const hasActiveSubscription =
      booking.status === BookingStatus.CONFIRMED &&
      booking.subscription?.status === SubscriptionStatus.ACTIVE &&
      booking.subscription.currentPeriodEnd.getTime() > Date.now();

    if (!hasActiveSubscription) {
      return {
        success: false as const,
        error: {
          code: 'FORBIDDEN',
          message:
            'Client activity is only available while subscription is active',
        },
      };
    }

    const requestedDays = options?.days ?? 14;
    const days = Math.min(Math.max(requestedDays, 1), 90);
    const eventLimit = Math.min(options?.limit ?? 50, 200);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      sessions,
      foodLogs,
      weightLogsRaw,
      habitLogs,
      personalRecords,
      achievements,
    ] = await Promise.all([
      this.db.workoutSession.findMany({
        where: { userId: booking.userId, startedAt: { gte: since } },
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          title: true,
          startedAt: true,
          endedAt: true,
          workouts: {
            select: {
              exercise: { select: { name: true } },
            },
          },
        },
      }),
      this.db.foodLog.findMany({
        where: { userId: booking.userId, loggedAt: { gte: since } },
        orderBy: { loggedAt: 'desc' },
        select: {
          id: true,
          loggedAt: true,
          mealType: true,
          quickAddName: true,
          totalCalories: true,
          food: { select: { name: true } },
        },
      }),
      this.db.weightLog.findMany({
        where: { userId: booking.userId, loggedAt: { gte: since } },
        orderBy: { loggedAt: 'desc' },
        select: {
          id: true,
          loggedAt: true,
          encryptedData: true,
          dataIv: true,
          dataAuthTag: true,
          wrappedKey: true,
        },
      }),
      this.db.habitLog.findMany({
        where: {
          habit: { userId: booking.userId },
          date: { gte: since },
          completed: true,
        },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          habit: { select: { name: true, icon: true } },
        },
      }),
      this.db.personalRecord.findMany({
        where: { userId: booking.userId, achievedAt: { gte: since } },
        orderBy: { achievedAt: 'desc' },
        select: {
          id: true,
          achievedAt: true,
          type: true,
          value: true,
          exercise: { select: { name: true } },
        },
      }),
      this.db.userAchievement.findMany({
        where: { userId: booking.userId, unlockedAt: { gte: since } },
        orderBy: { unlockedAt: 'desc' },
        select: {
          id: true,
          unlockedAt: true,
          achievement: { select: { name: true, icon: true } },
        },
      }),
    ]);

    // Decrypt weight logs
    const weightLogs = weightLogsRaw.map((wl) => {
      let value = 0;
      if (wl.encryptedData && wl.dataIv && wl.dataAuthTag && wl.wrappedKey) {
        try {
          const decrypted = this.encryption.decrypt({
            encryptedContent: Buffer.from(wl.encryptedData),
            contentIv: Buffer.from(wl.dataIv),
            contentAuthTag: Buffer.from(wl.dataAuthTag),
            wrappedKey: Buffer.from(wl.wrappedKey),
          });
          value = parseFloat(decrypted.toString());
        } catch {
          value = 0;
        }
      }
      return { id: wl.id, loggedAt: wl.loggedAt, value };
    });

    // Map to unified events
    const events: ActivityTimelineEvent[] = [];

    for (const s of sessions) {
      const exercises = s.workouts.map((w) => w.exercise.name);
      const durationMin =
        s.endedAt && s.startedAt
          ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60_000)
          : null;
      events.push({
        id: s.id,
        type: 'workout',
        timestamp: s.startedAt.toISOString(),
        title: s.title ?? 'Workout',
        description: exercises.length
          ? `${exercises.slice(0, 3).join(', ')}${exercises.length > 3 ? ` +${exercises.length - 3} more` : ''}`
          : undefined,
        meta: { durationMinutes: durationMin, exerciseCount: exercises.length },
      });
    }

    for (const fl of foodLogs) {
      const foodName = fl.food?.name ?? fl.quickAddName ?? 'Meal';
      events.push({
        id: fl.id,
        type: 'meal',
        timestamp: fl.loggedAt.toISOString(),
        title: `${fl.mealType.charAt(0) + fl.mealType.slice(1).toLowerCase()} — ${foodName}`,
        meta: { calories: fl.totalCalories },
      });
    }

    for (const wl of weightLogs) {
      if (wl.value > 0) {
        events.push({
          id: wl.id,
          type: 'weight',
          timestamp: wl.loggedAt.toISOString(),
          title: `Weigh-in: ${wl.value} lbs`,
        });
      }
    }

    for (const hl of habitLogs) {
      events.push({
        id: hl.id,
        type: 'habit',
        timestamp: hl.date.toISOString(),
        title: `Completed habit: ${hl.habit.name}`,
        meta: { icon: hl.habit.icon },
      });
    }

    for (const pr of personalRecords) {
      events.push({
        id: pr.id,
        type: 'pr',
        timestamp: pr.achievedAt.toISOString(),
        title: `New PR: ${pr.exercise.name}`,
        description: `${pr.type} — ${pr.value}`,
      });
    }

    for (const a of achievements) {
      events.push({
        id: a.id,
        type: 'achievement',
        timestamp: a.unlockedAt.toISOString(),
        title: `Achievement: ${a.achievement.name}`,
        meta: { icon: a.achievement.icon },
      });
    }

    // Sort by timestamp descending and apply limit
    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const limited = events.slice(0, eventLimit);

    return {
      success: true as const,
      data: {
        bookingId,
        userId: booking.userId,
        window: { days, since: since.toISOString() },
        events: limited,
        totalEvents: events.length,
      },
    };
  }
}

// Type definitions for dashboard data
export interface CoachDashboardStats {
  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;
  clientGrowthPercent: number;
  totalRevenueCents: number;
  monthlyRevenueCents: number;
  revenueChangePercent: number;
  avgRating: number;
  reviewCount: number;
}

export interface CoachClientsData {
  clients: Array<{
    bookingId: string;
    referenceCode: string;
    status: string;
    createdAt: string;
    user: {
      id: string;
      email: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
    package: {
      id: string;
      name: string;
      priceInCents: number;
      billingCycle: string;
    };
    subscription: {
      id: string;
      status: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
      cancelledAt: string | null;
    } | null;
  }>;
  total: number;
  page: number;
  limit: number;
}

export interface MonthlyRevenueData {
  month: string;
  year: number;
  revenueCents: number;
  clientCount: number;
}

export interface CoachClientAnalytics {
  totalActiveClients: number;
  periodDays: number;
  workoutConsistency: Array<{
    displayName: string;
    workouts: number;
    foodEntries: number;
  }>;
  averageWorkoutsPerWeek: number;
  averageFoodEntriesPerDay: number;
  clientsLoggingWorkouts: number;
  clientsLoggingFood: number;
  clientsLoggingWeight: number;
}

export interface ActivityTimelineEvent {
  id: string;
  type: 'workout' | 'meal' | 'weight' | 'habit' | 'pr' | 'achievement';
  timestamp: string;
  title: string;
  description?: string;
  meta?: Record<string, unknown>;
}

export interface ClientActivityTimeline {
  bookingId: string;
  userId: string;
  window: { days: number; since: string };
  events: ActivityTimelineEvent[];
  totalEvents: number;
}
