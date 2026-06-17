import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { MailService } from '@app/common/mailer';
import type { SuccessResponse } from '@varaperformance/core';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
  ) {}

  // ─── Subscribers ───────────────────────────────────────────

  /**
   * Get users who have granted MARKETING consent (subscribers).
   */
  async getSubscribers(query: {
    page: number;
    limit: number;
    search?: string;
  }) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    // No Prisma relation between Consent→User, so use raw SQL
    const searchFilter = search
      ? `AND (u."email" ILIKE '%' || $3 || '%' OR p."displayName" ILIKE '%' || $3 || '%')`
      : '';

    const params: (string | number)[] = [limit, skip];
    if (search) params.push(search);

    const items = await this.db.$queryRawUnsafe<
      {
        id: string;
        userId: string;
        email: string;
        displayName: string | null;
        avatarUrl: string | null;
        grantedAt: Date | null;
      }[]
    >(
      `SELECT c."id", c."userId", u."email", p."displayName", p."avatarUrl", c."grantedAt"
       FROM "Consent" c
       JOIN "User" u ON u."id" = c."userId"
       LEFT JOIN "Profile" p ON p."userId" = c."userId"
       WHERE c."type" = 'MARKETING' AND c."status" = 'GRANTED' ${searchFilter}
       ORDER BY c."grantedAt" DESC NULLS LAST
       LIMIT $1 OFFSET $2`,
      ...params,
    );

    const countResult = await this.db.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint as count FROM "Consent" c
       JOIN "User" u ON u."id" = c."userId"
       LEFT JOIN "Profile" p ON p."userId" = c."userId"
       WHERE c."type" = 'MARKETING' AND c."status" = 'GRANTED' ${searchFilter}`,
      ...(search ? [search] : []),
    );
    const total = Number(countResult[0]?.count ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: {
        items: items.map((i) => ({
          id: i.id,
          userId: i.userId,
          grantedAt: i.grantedAt,
          user: {
            id: i.userId,
            email: i.email,
            profile: {
              displayName: i.displayName,
              avatarUrl: i.avatarUrl,
            },
          },
        })),
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Get total subscriber + unsubscribed counts for the overview card.
   */
  async getSubscriberStats(): Promise<
    SuccessResponse<{ subscribers: number; unsubscribed: number }>
  > {
    const [subscribers, unsubscribed] = await Promise.all([
      this.db.consent.count({
        where: { type: 'MARKETING', status: 'GRANTED' },
      }),
      this.db.consent.count({
        where: { type: 'MARKETING', status: 'REVOKED' },
      }),
    ]);

    return { success: true, data: { subscribers, unsubscribed } };
  }

  // ─── Newsletters ───────────────────────────────────────────

  /**
   * List newsletters with pagination.
   */
  async getNewsletters(query: {
    page: number;
    limit: number;
    status?: string;
  }) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where = status
      ? {
          status: status as
            | 'DRAFT'
            | 'SCHEDULED'
            | 'SENDING'
            | 'SENT'
            | 'FAILED',
        }
      : {};

    const [items, total] = await Promise.all([
      this.db.newsletter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.newsletter.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Get a single newsletter by ID.
   */
  async getNewsletter(id: string): Promise<SuccessResponse<unknown>> {
    const newsletter = await this.db.newsletter.findUnique({ where: { id } });
    if (!newsletter) throw new NotFoundException('Newsletter not found');
    return { success: true, data: newsletter };
  }

  /**
   * Create a new newsletter draft.
   */
  async createNewsletter(data: {
    subject: string;
    content: string;
    scheduledAt?: string;
  }): Promise<SuccessResponse<unknown>> {
    const newsletter = await this.db.newsletter.create({
      data: {
        subject: data.subject,
        content: data.content,
        status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });

    return { success: true, data: newsletter };
  }

  /**
   * Update an existing newsletter (only DRAFT/SCHEDULED).
   */
  async updateNewsletter(
    id: string,
    data: { subject?: string; content?: string; scheduledAt?: string },
  ): Promise<SuccessResponse<unknown>> {
    const existing = await this.db.newsletter.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Newsletter not found');

    if (existing.status !== 'DRAFT' && existing.status !== 'SCHEDULED') {
      throw new NotFoundException(
        'Only DRAFT or SCHEDULED newsletters can be edited',
      );
    }

    const newsletter = await this.db.newsletter.update({
      where: { id },
      data: {
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.scheduledAt !== undefined && {
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
          status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        }),
      },
    });

    return { success: true, data: newsletter };
  }

  /**
   * Delete a newsletter (only DRAFT/SCHEDULED).
   */
  async deleteNewsletter(id: string): Promise<SuccessResponse<void>> {
    const existing = await this.db.newsletter.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Newsletter not found');

    if (existing.status !== 'DRAFT' && existing.status !== 'SCHEDULED') {
      throw new NotFoundException(
        'Only DRAFT or SCHEDULED newsletters can be deleted',
      );
    }

    await this.db.newsletter.delete({ where: { id } });
    return { success: true, data: undefined };
  }

  /**
   * Send a newsletter now to all MARKETING-consented users.
   * Marks status SENDING → SENT/FAILED.
   */
  async sendNewsletter(id: string): Promise<SuccessResponse<unknown>> {
    const newsletter = await this.db.newsletter.findUnique({ where: { id } });
    if (!newsletter) throw new NotFoundException('Newsletter not found');

    if (newsletter.status !== 'DRAFT' && newsletter.status !== 'SCHEDULED') {
      throw new NotFoundException(
        'Only DRAFT or SCHEDULED newsletters can be sent',
      );
    }

    await this.db.newsletter.update({
      where: { id },
      data: { status: 'SENDING' },
    });

    // Fetch all marketing-consented users
    const subscribers = await this.db.$queryRaw<
      {
        userId: string;
        email: string;
        displayName: string | null;
      }[]
    >`SELECT c."userId", u."email", p."displayName"
      FROM "Consent" c
      JOIN "User" u ON u."id" = c."userId"
      LEFT JOIN "Profile" p ON p."userId" = c."userId"
      WHERE c."type" = 'MARKETING' AND c."status" = 'GRANTED'`;

    let sentCount = 0;
    let failedCount = 0;

    for (const sub of subscribers) {
      try {
        await this.mailService.sendNewsletterEmail({
          email: sub.email,
          name: sub.displayName ?? undefined,
          userId: sub.userId,
          subject: newsletter.subject,
          content: newsletter.content,
        });
        sentCount++;
      } catch (error) {
        failedCount++;
        this.logger.error(
          `Failed to send newsletter to ${sub.email}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }

    const finalStatus = failedCount > 0 && sentCount === 0 ? 'FAILED' : 'SENT';

    const updated = await this.db.newsletter.update({
      where: { id },
      data: {
        status: finalStatus,
        sentAt: new Date(),
        sentCount,
        failedCount,
      },
    });

    return { success: true, data: updated };
  }
}
