import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@generated/prisma';
import { DatabaseService } from '@app/database';
import type { PaginatedResponse, SuccessResponse } from '@varaperformance/core';
import {
  CreateSpotlightDto,
  PublicSpotlightQueryDto,
  SpotlightQueryDto,
  SubmitSpotlightDto,
  UpdateSpotlightDto,
} from './dto/spotlight.dto';
import { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import {
  publicSpotlightSelector,
  spotlightSelector,
} from './selectors/spotlight.selector';

type PublicSpotlightItem = Prisma.SpotlightGetPayload<{
  select: typeof publicSpotlightSelector;
}>;
type SpotlightItem = Prisma.SpotlightGetPayload<{
  select: typeof spotlightSelector;
}>;

@Injectable()
export class SpotlightService {
  constructor(private readonly db: DatabaseService) {}

  async getPublicSpotlights(
    query: PublicSpotlightQueryDto,
  ): Promise<SuccessResponse<PublicSpotlightItem[]>> {
    const { limit = 12 } = query;

    const stories = await this.db.spotlight.findMany({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
      },
      orderBy: [
        { featured: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      select: publicSpotlightSelector,
    });

    return { success: true, data: stories };
  }

  async getPublicSpotlightBySlug(
    slug: string,
  ): Promise<SuccessResponse<PublicSpotlightItem>> {
    const story = await this.db.spotlight.findFirst({
      where: {
        slug,
        isActive: true,
        status: 'PUBLISHED',
        OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
      },
      select: publicSpotlightSelector,
    });

    if (!story) {
      throw new NotFoundException('Spotlight story not found');
    }

    return { success: true, data: story };
  }

  async getSpotlights(
    query: SpotlightQueryDto,
  ): Promise<PaginatedResponse<SpotlightItem>> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      isActive,
      featured,
      submitterEmail,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SpotlightWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tagline: { contains: search, mode: 'insensitive' } },
        { story: { contains: search, mode: 'insensitive' } },
        { sport: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (featured !== undefined) {
      where.featured = featured;
    }

    if (submitterEmail) {
      where.submitterEmail = submitterEmail;
    }

    const [items, total] = await Promise.all([
      this.db.spotlight.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { featured: 'desc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        select: spotlightSelector,
      }),
      this.db.spotlight.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + items.length < total,
      },
    };
  }

  async getSpotlight(id: string): Promise<SuccessResponse<SpotlightItem>> {
    const story = await this.db.spotlight.findUnique({
      where: { id },
      select: spotlightSelector,
    });

    if (!story) {
      throw new NotFoundException('Spotlight story not found');
    }

    return { success: true, data: story };
  }

  async createSpotlight(
    data: CreateSpotlightDto,
  ): Promise<SuccessResponse<SpotlightItem>> {
    const spotlight = await this.db.$transaction(async (tx) => {
      if (data.featured) {
        await tx.spotlight.updateMany({
          where: { featured: true },
          data: { featured: false },
        });
      }

      return tx.spotlight.create({
        data: {
          ...data,
          publishedAt:
            data.status === 'PUBLISHED' && !data.publishedAt
              ? new Date()
              : data.publishedAt,
        },
        select: spotlightSelector,
      });
    });

    return { success: true, data: spotlight };
  }

  async submitSpotlight(
    data: SubmitSpotlightDto,
    user: JwtPayload,
  ): Promise<SuccessResponse<SpotlightItem>> {
    const userRecord = await this.db.user.findUnique({
      where: { id: user.sub },
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            displayName: true,
            socials: {
              select: {
                twitter: true,
                instagram: true,
              },
            },
          },
        },
      },
    });

    if (!userRecord) {
      throw new NotFoundException('User not found');
    }

    const displayName =
      userRecord.profile?.displayName?.trim() ||
      userRecord.email.split('@')[0] ||
      'member-story';

    if (!displayName) {
      throw new BadRequestException(
        'Please complete profile before submitting',
      );
    }

    const slug = await this.generateUniqueSlug(displayName);

    const spotlight = await this.db.spotlight.create({
      data: {
        ...data,
        slug,
        name: displayName,
        username: displayName,
        memberSince: userRecord.createdAt,
        twitterUrl: this.toSocialUrl(
          userRecord.profile?.socials?.twitter,
          'twitter',
        ),
        instagramUrl: this.toSocialUrl(
          userRecord.profile?.socials?.instagram,
          'instagram',
        ),
        status: 'DRAFT',
        isActive: false,
        featured: false,
        publishedAt: null,
        submitterUserId: user.sub,
        submitterEmail: userRecord.email,
        reviewNotes: data.reviewNotes,
      },
      select: spotlightSelector,
    });

    return {
      success: true,
      data: spotlight,
      message: 'Story submitted for review',
    };
  }

  private slugify(value: string): string {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);

    return slug || 'member-story';
  }

  private async generateUniqueSlug(value: string): Promise<string> {
    const base = this.slugify(value);

    const existing = await this.db.spotlight.findFirst({
      where: { slug: base },
      select: { id: true },
    });

    if (!existing) {
      return base;
    }

    for (let i = 2; i < 1000; i++) {
      const candidate = `${base}-${i}`.slice(0, 120);
      const collision = await this.db.spotlight.findFirst({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!collision) {
        return candidate;
      }
    }

    return `${base}-${Date.now()}`.slice(0, 120);
  }

  private toSocialUrl(
    handle?: string | null,
    platform?: 'twitter' | 'instagram',
  ): string | null {
    if (!handle) {
      return null;
    }

    const trimmed = handle.trim();
    if (!trimmed) {
      return null;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    const normalized = trimmed.replace(/^@+/, '');
    if (!normalized) {
      return null;
    }

    if (platform === 'instagram') {
      return `https://instagram.com/${normalized}`;
    }

    return `https://x.com/${normalized}`;
  }

  async updateSpotlight(
    id: string,
    data: UpdateSpotlightDto,
  ): Promise<SuccessResponse<SpotlightItem>> {
    const spotlight = await this.db.$transaction(async (tx) => {
      if (data.featured) {
        await tx.spotlight.updateMany({
          where: { featured: true, id: { not: id } },
          data: { featured: false },
        });
      }

      return tx.spotlight.update({
        where: { id },
        data: {
          ...data,
          publishedAt:
            data.status === 'PUBLISHED' && data.publishedAt === undefined
              ? new Date()
              : data.publishedAt,
        },
        select: spotlightSelector,
      });
    });

    return { success: true, data: spotlight };
  }

  async deleteSpotlight(
    id: string,
  ): Promise<SuccessResponse<{ deleted: true }>> {
    await this.db.spotlight.delete({ where: { id } });
    return { success: true, data: { deleted: true } };
  }
}
