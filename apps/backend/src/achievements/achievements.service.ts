import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type { AchievementCategory } from '@varaperformance/core';
import { NotificationService } from '../notification/notification.service';
import {
  achievementSelect,
  userAchievementSelect,
} from './selectors/achievement.selector';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * List all active achievements grouped by category
   */
  async findAll() {
    return await this.db.achievement.findMany({
      where: { isActive: true },
      select: achievementSelect,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Get all achievements unlocked by a user
   */
  async getUserAchievements(userId: string) {
    return await this.db.userAchievement.findMany({
      where: { userId },
      select: userAchievementSelect,
      orderBy: { unlockedAt: 'desc' },
    });
  }

  /**
   * Check whether a user qualifies for any achievement in a category and award it.
   * `value` is the metric (e.g. total workouts, streak length) to compare against thresholds.
   * `slug` optionally narrows to a specific achievement (prevents cross-awarding within the same category).
   */
  async checkAndAward(
    userId: string,
    category: AchievementCategory,
    value: number,
    slug?: string,
  ): Promise<string[]> {
    const candidates = await this.db.achievement.findMany({
      where: {
        isActive: true,
        category,
        threshold: { lte: value },
        ...(slug && { slug }),
      },
      select: { id: true, slug: true, name: true, threshold: true },
      orderBy: { threshold: 'asc' },
    });

    if (candidates.length === 0) return [];

    const existing = await this.db.userAchievement.findMany({
      where: {
        userId,
        achievementId: { in: candidates.map((c) => c.id) },
      },
      select: { achievementId: true },
    });

    const existingSet = new Set(existing.map((e) => e.achievementId));
    const toAward = candidates.filter((c) => !existingSet.has(c.id));

    if (toAward.length === 0) return [];

    await this.db.userAchievement.createMany({
      data: toAward.map((a) => ({
        userId,
        achievementId: a.id,
      })),
      skipDuplicates: true,
    });

    const awarded = toAward.map((a) => a.name);
    this.logger.log(
      `Awarded ${awarded.length} achievement(s) to ${userId}: ${awarded.join(', ')}`,
    );

    await Promise.allSettled(
      toAward.map((achievement) =>
        this.notificationService.create({
          userId,
          type: 'ACHIEVEMENT_UNLOCKED',
          title: 'Achievement Unlocked!',
          body: `You earned the "${achievement.name}" badge!`,
          actionUrl: '/achievements',
          data: {
            achievementId: achievement.id,
            achievementSlug: achievement.slug,
          },
        }),
      ),
    ).then((results) => {
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        this.logger.warn(
          `Failed to send ${failures.length} achievement notification(s)`,
        );
      }
    });

    return awarded;
  }

  /**
   * Share an unlocked achievement to Elevate as an ACHIEVEMENT post
   */
  async shareToElevate(
    userId: string,
    achievementId: string,
  ): Promise<{ postId: string }> {
    // Verify user has unlocked this achievement
    const userAchievement = await this.db.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId } },
      include: { achievement: true },
    });

    if (!userAchievement) {
      throw new NotFoundException('Achievement not unlocked');
    }

    // Check if already shared
    const existing = await this.db.elevatePost.findFirst({
      where: { userId, achievementId, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException(
        'This achievement has already been shared to Elevate',
      );
    }

    const achievement = userAchievement.achievement;
    const post = await this.db.elevatePost.create({
      data: {
        userId,
        type: 'ACHIEVEMENT',
        content: `I just earned the "${achievement.name}" badge! ${achievement.description}`,
        images: [],
        privacy: 'PUBLIC',
        achievementId,
      },
      select: { id: true },
    });

    return { postId: post.id };
  }
}
