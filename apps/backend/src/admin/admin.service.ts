import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type { SuccessResponse } from '@varaperformance/core';

export interface DailyActiveUsersData {
  date: string;
  users: number;
}

export interface UserGrowthData {
  month: string;
  users: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  createdAt: Date;
  user: { email: string; displayName: string | null } | null;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCoaches: number;
  verifiedCoaches: number;
  totalBlogPosts: number;
  publishedBlogPosts: number;
  openIncidents: number;
  totalGyms: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  userGrowth: UserGrowthData[];
  revenueData: RevenueData[];
  coaching: {
    activeBookings: number;
    totalPackages: number;
    contractSignatures: number;
  };
  foodDatabase: {
    totalFoods: number;
    bySource: Record<string, number>;
  };
  recentActivity: RecentActivityItem[];
  compliance: {
    legalDocuments: {
      total: number;
      active: number;
      types: string[];
    };
    auditLogging: {
      active: boolean;
      recentEntries: number;
    };
    dataEncryption: {
      active: boolean;
      encryptedProfiles: number;
      totalProfiles: number;
      encryptedSessions: number;
    };
    consentTracking: {
      enabled: boolean;
      totalConsents: number;
    };
    wormStorage: {
      active: boolean;
      legalDocuments: { total: number; withHash: number };
      coachingContracts: { total: number; withHash: number };
    };
    gdpr: {
      dataExports: number;
      accountDeletions: number;
      pendingRetentions: number;
    };
  };
}

export interface AdminAuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  oldValue: unknown;
  newValue: unknown;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
}

interface AuditLogQueryParams {
  page?: string;
  limit?: string;
  action?: string;
  resource?: string;
  userId?: string;
  search?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly db: DatabaseService) {}

  private parsePositiveInt(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number.parseInt(value ?? '', 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      return fallback;
    }
    return parsed;
  }

  private parseDate(value?: string): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  /**
   * Get user growth data for the last 6 months
   */
  private async getUserGrowth(): Promise<UserGrowthData[]> {
    const months: UserGrowthData[] = [];
    const now = new Date();
    this.logger.debug(`getUserGrowth current date: ${now.toISOString()}`);

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // Set end date to the last moment of the last day of the month
      const endDate = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
        999,
      );
      this.logger.debug(
        `Checking month ${date.toISOString()} to ${endDate.toISOString()}`,
      );

      const count = await this.db.user.count({
        where: {
          createdAt: {
            gte: date,
            lte: endDate,
          },
        },
      });
      this.logger.debug(
        `Month ${date.toLocaleString('default', { month: 'short' })}: ${count} users`,
      );

      months.push({
        month: date.toLocaleString('default', { month: 'short' }),
        users: count,
      });
    }

    this.logger.debug(`Final userGrowth payload size: ${months.length}`);
    return months;
  }

  /**
   * Get revenue data for the last 6 months
   */
  private async getRevenueData(): Promise<RevenueData[]> {
    const months: RevenueData[] = [];
    const now = new Date();
    this.logger.debug(`getRevenueData current date: ${now.toISOString()}`);

    // Debug: Check all payment statuses in the database
    const allPayments = await this.db.payment.groupBy({
      by: ['status'],
      _count: true,
      _sum: { amountInCents: true },
    });
    this.logger.debug(`Payment statuses grouped: ${allPayments.length}`);

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // Set end date to the last moment of the last day of the month
      const endDate = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const result = await this.db.payment.aggregate({
        where: {
          status: 'SUCCEEDED',
          createdAt: {
            gte: date,
            lte: endDate,
          },
        },
        _sum: {
          amountInCents: true,
        },
      });
      this.logger.debug(
        `Revenue ${date.toLocaleString('default', { month: 'short' })}: ${result._sum?.amountInCents ?? 0} cents`,
      );

      months.push({
        month: date.toLocaleString('default', { month: 'short' }),
        // Convert cents to dollars
        revenue: (result._sum?.amountInCents ?? 0) / 100,
      });
    }

    this.logger.debug(`Final revenueData payload size: ${months.length}`);
    return months;
  }

  /**
   * Get daily active users for the last N days.
   * Counts distinct userIds from Session.lastActivity per day.
   */
  async getDailyActiveUsers(
    daysParam?: string,
  ): Promise<SuccessResponse<DailyActiveUsersData[]>> {
    const days = Math.min(
      Math.max(this.parsePositiveInt(daysParam, 30), 1),
      90,
    );

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows = await this.db.$queryRaw<
      { day: Date; users: bigint }[]
    >`SELECT DATE("lastActivity") AS day, COUNT(DISTINCT "userId")::bigint AS users
      FROM "Session"
      WHERE "lastActivity" >= ${since}
      GROUP BY day
      ORDER BY day`;

    // Build a zero-filled map for every day in the range
    const map = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      map.set(d.toISOString().slice(0, 10), 0);
    }

    for (const row of rows) {
      const key =
        row.day instanceof Date
          ? row.day.toISOString().slice(0, 10)
          : String(row.day);
      map.set(key, Number(row.users));
    }

    const data: DailyActiveUsersData[] = Array.from(map, ([date, users]) => ({
      date,
      users,
    }));

    return { success: true, data };
  }

  /**
   * Get today's active users (up to 10) with display names.
   * "Today" is from midnight UTC to now.
   */
  async getTodayActiveUsers(): Promise<
    SuccessResponse<{ id: string; displayName: string | null }[]>
  > {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const sessions = await this.db.session.findMany({
      where: { lastActivity: { gte: todayStart } },
      distinct: ['userId'],
      orderBy: { lastActivity: 'desc' },
      take: 10,
      select: {
        userId: true,
      },
    });

    const userIds = sessions.map((s) => s.userId);

    const profiles = await this.db.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, displayName: true },
    });

    const profileMap = new Map(
      profiles.map((profile) => [profile.userId, profile.displayName ?? null]),
    );

    const data = sessions.map((s) => ({
      id: s.userId,
      displayName: profileMap.get(s.userId) ?? null,
    }));

    return { success: true, data };
  }

  /**
   * Get admin dashboard statistics
   */
  async getStats(): Promise<SuccessResponse<AdminStats>> {
    const [
      totalUsers,
      activeUsers,
      totalCoaches,
      verifiedCoaches,
      totalBlogPosts,
      publishedBlogPosts,
      openIncidents,
      totalGyms,
      totalLegalDocs,
      activeLegalDocs,
      legalDocTypes,
      totalConsents,
      userGrowth,
      revenueData,
      gdprExports,
      gdprDeletions,
      gdprPendingRetentions,
      // Live compliance checks — encryption
      totalProfiles,
      encryptedProfiles,
      encryptedSessions,
      recentAuditEntries,
      legalDocsWithHash,
      totalContracts,
      contractsWithHash,
      // Coaching stats
      activeBookings,
      totalPackages,
      contractSignatures,
      // Food database
      totalFoods,
      foodsBySource,
      // Revenue KPIs
      thisMonthRevenueResult,
      lastMonthRevenueResult,
      // Recent activity
      recentLogs,
    ] = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { isActive: true } }),
      this.db.coach.count(),
      this.db.coach.count({ where: { isVerified: true } }),
      this.db.blog.count(),
      this.db.blog.count({ where: { status: 'PUBLISHED' } }),
      this.db.incident.count({ where: { status: { not: 'RESOLVED' } } }),
      this.db.gym.count(),
      this.db.legalDocument.count(),
      this.db.legalDocument.count({ where: { isActive: true } }),
      this.db.legalDocument.findMany({
        where: { isActive: true },
        select: { type: true },
        distinct: ['type'],
      }),
      this.db.consent.count(),
      this.getUserGrowth(),
      this.getRevenueData(),
      this.db.auditLog.count({ where: { action: 'EXPORT' } }),
      this.db.auditLog.count({ where: { action: 'DELETE', resource: 'User' } }),
      this.db.dataRetention.count({
        where: { retainUntil: { gt: new Date() }, deletedAt: null },
      }),
      // Live compliance checks
      this.db.profile.count(),
      this.db.profile.count({
        where: {
          eProfile: { not: null },
          profileWrappedKey: { not: null },
        },
      }),
      // Session tokens are always encrypted (wrappedKey is non-nullable)
      this.db.session.count(),
      this.db.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.db.legalDocument.count({
        where: { hashValue: { not: null } },
      }),
      this.db.coachingContract.count(),
      this.db.coachingContract.count({
        where: { hashValue: { not: null } },
      }),
      // Coaching stats
      this.db.booking.count({ where: { status: 'CONFIRMED' } }),
      this.db.coachPackage.count({ where: { isActive: true } }),
      this.db.contractSignature.count(),
      // Food database
      this.db.food.count(),
      this.db.food.groupBy({ by: ['source'], _count: true }),
      // Revenue KPIs — this month
      (() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return this.db.payment.aggregate({
          where: { status: 'SUCCEEDED', createdAt: { gte: monthStart } },
          _sum: { amountInCents: true },
        });
      })(),
      // Revenue KPIs — last month
      (() => {
        const now = new Date();
        const lastMonthStart = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
        );
        const lastMonthEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59,
          999,
        );
        return this.db.payment.aggregate({
          where: {
            status: 'SUCCEEDED',
            createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          },
          _sum: { amountInCents: true },
        });
      })(),
      // Recent activity (last 10 entries)
      this.db.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          createdAt: true,
          userId: true,
        },
      }),
    ]);

    // Resolve users for recent activity
    const activityUserIds = Array.from(
      new Set(
        recentLogs
          .map((l) => l.userId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const activityUsers =
      activityUserIds.length > 0
        ? await this.db.user.findMany({
            where: { id: { in: activityUserIds } },
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true } },
            },
          })
        : [];
    const userMap = new Map(
      activityUsers.map((u) => [
        u.id,
        { email: u.email, displayName: u.profile?.displayName ?? null },
      ]),
    );

    const thisMonthRevenue =
      (thisMonthRevenueResult._sum?.amountInCents ?? 0) / 100;
    const lastMonthRevenue =
      (lastMonthRevenueResult._sum?.amountInCents ?? 0) / 100;

    const bySource: Record<string, number> = {};
    for (const g of foodsBySource) {
      bySource[g.source] = g._count;
    }

    return {
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalCoaches,
        verifiedCoaches,
        totalBlogPosts,
        publishedBlogPosts,
        openIncidents,
        totalGyms,
        thisMonthRevenue,
        lastMonthRevenue,
        userGrowth,
        revenueData,
        coaching: {
          activeBookings,
          totalPackages,
          contractSignatures,
        },
        foodDatabase: {
          totalFoods,
          bySource,
        },
        recentActivity: recentLogs.map((l) => ({
          id: l.id,
          action: l.action,
          resource: l.resource,
          resourceId: l.resourceId,
          createdAt: l.createdAt,
          user: l.userId ? (userMap.get(l.userId) ?? null) : null,
        })),
        compliance: {
          legalDocuments: {
            total: totalLegalDocs,
            active: activeLegalDocs,
            types: legalDocTypes.map((d) => d.type),
          },
          auditLogging: {
            active: recentAuditEntries > 0,
            recentEntries: recentAuditEntries,
          },
          dataEncryption: {
            active: encryptedProfiles > 0 && encryptedSessions > 0,
            encryptedProfiles,
            totalProfiles,
            encryptedSessions,
          },
          consentTracking: {
            enabled: totalConsents > 0,
            totalConsents,
          },
          wormStorage: {
            active: legalDocsWithHash > 0 || contractsWithHash > 0,
            legalDocuments: {
              total: totalLegalDocs,
              withHash: legalDocsWithHash,
            },
            coachingContracts: {
              total: totalContracts,
              withHash: contractsWithHash,
            },
          },
          gdpr: {
            dataExports: gdprExports,
            accountDeletions: gdprDeletions,
            pendingRetentions: gdprPendingRetentions,
          },
        },
      },
    };
  }

  async getAuditLogs(query: AuditLogQueryParams): Promise<
    SuccessResponse<{
      items: AdminAuditLog[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasMore: boolean;
    }>
  > {
    const page = this.parsePositiveInt(query.page, 1);
    const limit = Math.min(this.parsePositiveInt(query.limit, 25), 100);
    const skip = (page - 1) * limit;

    const from = this.parseDate(query.from);
    const to = this.parseDate(query.to);

    const where: Record<string, unknown> = {};

    if (query.action) {
      where.action = query.action;
    }

    if (query.resource) {
      where.resource = {
        contains: query.resource,
        mode: 'insensitive',
      };
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    if (query.search) {
      where.OR = [
        {
          resource: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          resourceId: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          userId: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [logs, total] = await Promise.all([
      this.db.auditLog.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.auditLog.count({ where: where as any }),
    ]);

    const userIds = Array.from(
      new Set(
        logs
          .map((log) => log.userId)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    );

    const users =
      userIds.length > 0
        ? await this.db.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          })
        : [];

    const userMap = new Map(
      users.map((user) => [
        user.id,
        {
          id: user.id,
          email: user.email,
          displayName: user.profile?.displayName ?? null,
        },
      ]),
    );

    return {
      success: true,
      data: {
        items: logs.map((log) => ({
          id: log.id,
          userId: log.userId,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          metadata: log.metadata,
          oldValue: log.oldValue,
          newValue: log.newValue,
          createdAt: log.createdAt,
          user: log.userId ? (userMap.get(log.userId) ?? null) : null,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + logs.length < total,
      },
    };
  }
}
