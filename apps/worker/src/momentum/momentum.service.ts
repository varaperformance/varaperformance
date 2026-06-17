import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DatabaseService } from "@app/database";

// Import ElevatePostType enum values
type ElevatePostType =
  | "TEXT"
  | "WORKOUT"
  | "MILESTONE"
  | "PHOTO"
  | "PR"
  | "CHECK_IN"
  | "ACHIEVEMENT"
  | "CHALLENGE";

const PR_ATTACHMENT_META_PREFIX = "[[vp-pr:";
const RECIPE_ATTACHMENT_META_PREFIX = "[[vp-recipe:";
const STACK_ATTACHMENT_META_PREFIX = "[[vp-stack:";
const WORKOUT_PLAN_ATTACHMENT_META_PREFIX = "[[vp-workout-plan:";
const RECIPE_ATTACHMENT_BONUS = 1.25;
const STACK_ATTACHMENT_BONUS = 1.3;
const WORKOUT_PLAN_ATTACHMENT_BONUS = 1.4;
const SAVE_WEIGHT = 3.0;
const COMMENT_WEIGHT = 2.5;

/**
 * Momentum Score Algorithm
 *
 * Score = engagementQuality * effectiveContentBonus * velocityBoost *
 *         creatorFatigue * timeDecay * safetyFactor
 *
 * Where:
 * - engagementQuality = weightedEngagement * uniqueEngagerFactor
 *   weightedEngagement = highFives + (comments * 2.5) + (saves * 3.0)
 *   uniqueEngagerFactor favors broader engagement over repeated actions
 *
 * - effectiveContentBonus: Multiplier based on post type + attachment signals
 *   - WORKOUT: 1.5x (sharing workouts is core to the platform)
 *   - PR: 2.0x (celebrating achievements)
 *   - MILESTONE: 1.8x (consistency milestones)
 *   - CHECK_IN: 1.3x (gym presence engagement)
 *   - PHOTO: 1.1x (visual content)
 *   - TEXT: 1.0x (baseline)
 *   - PR attachment metadata in content: at least 2.0x
 *   - Workout plan attachment metadata in content: at least 1.4x
 *   - Stack attachment metadata in content: at least 1.3x
 *   - Recipe attachment metadata in content: at least 1.25x
 *   - Small contextual boosts for workout/check-in relevance and mixed rich posts

 * - velocityBoost: Short-lived lift for posts that gain interactions quickly
 *   (strongest in the first 3 hours)

 * - creatorFatigue: Slight damping when an author publishes many posts in 24h

 * - safetyFactor: Down-ranks moderated/reported or low-signal repetitive posts
 *
 * - timeDecay = 1 / (1 + (hoursOld / 24)^1.5)
 *   Gives recent posts a boost while still allowing older popular posts to rank
 *   24h old post: ~0.35 multiplier
 *   48h old post: ~0.18 multiplier
 *   72h old post: ~0.11 multiplier
 */

const POST_TYPE_BONUS: Record<ElevatePostType, number> = {
  WORKOUT: 1.5,
  PR: 2.0,
  MILESTONE: 1.8,
  CHECK_IN: 1.3,
  PHOTO: 1.1,
  TEXT: 1.0,
  ACHIEVEMENT: 1.6,
  CHALLENGE: 1.7,
};

type MomentumScoreInput = {
  highFiveCount: number;
  commentCount: number;
  saveCount: number;
  uniqueEngagerCount: number;
  postType: ElevatePostType;
  content: string | null;
  createdAt: Date;
  authorRecentPublicPosts24h: number;
  reportCount: number;
  moderationLocked: boolean;
  hasWorkout: boolean;
  hasCheckIn: boolean;
};

const hasPrAttachment = (content: string | null | undefined): boolean =>
  Boolean(content?.includes(PR_ATTACHMENT_META_PREFIX));

const hasRecipeAttachment = (content: string | null | undefined): boolean =>
  Boolean(content?.includes(RECIPE_ATTACHMENT_META_PREFIX));

const hasStackAttachment = (content: string | null | undefined): boolean =>
  Boolean(content?.includes(STACK_ATTACHMENT_META_PREFIX));

const hasWorkoutPlanAttachment = (
  content: string | null | undefined,
): boolean => Boolean(content?.includes(WORKOUT_PLAN_ATTACHMENT_META_PREFIX));

const getAttachmentBonus = (content: string | null | undefined): number => {
  if (hasPrAttachment(content)) {
    return POST_TYPE_BONUS.PR;
  }

  if (hasWorkoutPlanAttachment(content)) {
    return WORKOUT_PLAN_ATTACHMENT_BONUS;
  }

  if (hasStackAttachment(content)) {
    return STACK_ATTACHMENT_BONUS;
  }

  if (hasRecipeAttachment(content)) {
    return RECIPE_ATTACHMENT_BONUS;
  }

  return 1;
};

const normalizeContent = (content: string | null | undefined): string =>
  (content ?? "")
    .replace(/\[\[vp-pr:[^\]]+\]\]/g, "")
    .replace(/\[\[vp-recipe:[^\]]+\]\]/g, "")
    .replace(/\[\[vp-stack:[^\]]+\]\]/g, "")
    .replace(/\[\[vp-workout-plan:[^\]]+\]\]/g, "")
    .trim();

const isLowSignalRepetitiveContent = (
  content: string | null | undefined,
): boolean => {
  const normalized = normalizeContent(content).toLowerCase();
  if (!normalized) {
    return false;
  }

  const compact = normalized.replace(/\s+/g, " ");
  const repeatedWordPattern = /\b(\w{2,})\b(?:\W+\1\b){3,}/;
  const repeatedPunctuationPattern = /([!?.])\1{3,}/;

  return (
    compact.length < 18 ||
    repeatedWordPattern.test(compact) ||
    repeatedPunctuationPattern.test(compact)
  );
};

// How many posts to process per batch
const BATCH_SIZE = 500;
const WRITE_CHUNK_SIZE = 100;

// Only recalculate posts from the last N days for efficiency
const MAX_AGE_DAYS = 14;
const MOMENTUM_LOCK_KEY = 1_904_022;

@Injectable()
export class MomentumService implements OnModuleInit {
  private readonly logger = new Logger(MomentumService.name);
  private isProcessing = false;

  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    this.logger.log("Momentum Service initialized");
    // Run initial calculation after a short delay to let DB warm up
    setTimeout(() => {
      this.calculateAllMomentumScores().catch((err) => {
        this.logger.warn(`Initial momentum calculation failed: ${err.message}`);
      });
    }, 5000);
  }

  /**
   * Calculate time decay factor
   * Returns a value between 0 and 1, where newer posts get higher values
   */
  private calculateTimeDecay(createdAt: Date): number {
    const now = new Date();
    const hoursOld = Math.max(
      0,
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60),
    );

    // Formula: 1 / (1 + (hoursOld / 24)^1.5)
    // This gives a nice decay curve that:
    // - New posts (0h): ~1.0
    // - 12h old: ~0.55
    // - 24h old: ~0.35
    // - 48h old: ~0.18
    // - 72h old: ~0.11
    // - 7 days: ~0.02
    return 1 / (1 + Math.pow(hoursOld / 24, 1.5));
  }

  private calculateEngagementQuality(
    highFiveCount: number,
    commentCount: number,
    saveCount: number,
    uniqueEngagerCount: number,
  ): number {
    const weightedEngagement =
      highFiveCount + commentCount * COMMENT_WEIGHT + saveCount * SAVE_WEIGHT;
    const totalSignals = highFiveCount + commentCount + saveCount;

    if (weightedEngagement <= 0) {
      return 0;
    }

    if (totalSignals <= 0) {
      return weightedEngagement;
    }

    const uniqueRatio = Math.min(1, uniqueEngagerCount / totalSignals);
    const uniqueEngagerFactor = 0.75 + 0.5 * uniqueRatio;

    return weightedEngagement * uniqueEngagerFactor;
  }

  private calculateContextualBonus(
    postType: ElevatePostType,
    content: string | null,
    hasWorkout: boolean,
    hasCheckIn: boolean,
  ): number {
    let contextualBonus = 1;

    if (hasWorkout || postType === "WORKOUT") {
      contextualBonus *= 1.05;
    }

    if (hasCheckIn || postType === "CHECK_IN") {
      contextualBonus *= 1.03;
    }

    if (hasPrAttachment(content) && hasRecipeAttachment(content)) {
      contextualBonus *= 1.05;
    }

    return contextualBonus;
  }

  private calculateVelocityBoost(
    weightedEngagement: number,
    createdAt: Date,
  ): number {
    if (weightedEngagement <= 0) {
      return 1;
    }

    const hoursOld = Math.max(
      0,
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60),
    );

    if (hoursOld > 3) {
      return 1;
    }

    const engagementPerHour = weightedEngagement / Math.max(hoursOld, 0.25);
    const boost = 1 + Math.min(0.35, engagementPerHour * 0.04);
    return boost;
  }

  private calculateCreatorFatigue(authorRecentPublicPosts24h: number): number {
    if (authorRecentPublicPosts24h <= 1) {
      return 1;
    }

    const damping = 1 - (authorRecentPublicPosts24h - 1) * 0.08;
    return Math.max(0.6, damping);
  }

  private calculateSafetyFactor(
    reportCount: number,
    moderationLocked: boolean,
    content: string | null,
    weightedEngagement: number,
  ): number {
    let safety = 1;

    if (moderationLocked) {
      safety *= 0.45;
    }

    if (reportCount > 0) {
      safety *= Math.max(0.55, 1 - reportCount * 0.1);
    }

    if (weightedEngagement < 2 && isLowSignalRepetitiveContent(content)) {
      safety *= 0.8;
    }

    return safety;
  }

  private async getRecentPublicPostCountsByUser(
    userIds: string[],
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const since = new Date();
    since.setHours(since.getHours() - 24);

    const grouped = await this.db.elevatePost.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        createdAt: { gte: since },
        deletedAt: null,
        privacy: "PUBLIC",
      },
      _count: { _all: true },
    });

    return new Map(grouped.map((entry) => [entry.userId, entry._count._all]));
  }

  /**
   * Calculate momentum score for a single post
   */
  private calculateMomentumScore(input: MomentumScoreInput): number {
    const {
      highFiveCount,
      commentCount,
      saveCount,
      uniqueEngagerCount,
      postType,
      content,
      createdAt,
      authorRecentPublicPosts24h,
      reportCount,
      moderationLocked,
      hasWorkout,
      hasCheckIn,
    } = input;

    const weightedEngagement =
      highFiveCount + commentCount * COMMENT_WEIGHT + saveCount * SAVE_WEIGHT;
    const engagementQuality = this.calculateEngagementQuality(
      highFiveCount,
      commentCount,
      saveCount,
      uniqueEngagerCount,
    );

    // Post type bonus
    const typeBonus = POST_TYPE_BONUS[postType] ?? 1.0;
    const attachmentBonus = getAttachmentBonus(content);
    const contextualBonus = this.calculateContextualBonus(
      postType,
      content,
      hasWorkout,
      hasCheckIn,
    );
    const effectiveContentBonus =
      Math.max(typeBonus, attachmentBonus) * contextualBonus;

    const velocityBoost = this.calculateVelocityBoost(
      weightedEngagement,
      createdAt,
    );
    const creatorFatigue = this.calculateCreatorFatigue(
      authorRecentPublicPosts24h,
    );
    const safetyFactor = this.calculateSafetyFactor(
      reportCount,
      moderationLocked,
      content,
      weightedEngagement,
    );

    // Time decay
    const timeDecay = this.calculateTimeDecay(createdAt);

    // Final score
    const score =
      engagementQuality *
      effectiveContentBonus *
      velocityBoost *
      creatorFatigue *
      timeDecay *
      safetyFactor;

    // Round to 4 decimal places for storage
    return Math.round(score * 10000) / 10000;
  }

  /**
   * Calculate momentum scores for all recent posts
   * Runs every 15 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async calculateAllMomentumScores(): Promise<void> {
    const lockRows = await this.db.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(${MOMENTUM_LOCK_KEY}) AS acquired
    `;
    const acquired = lockRows[0]?.acquired === true;

    if (!acquired) {
      this.logger.debug(
        "Skipping momentum calculation because another scheduler instance holds the lock",
      );
      return;
    }

    // Prevent concurrent runs
    if (this.isProcessing) {
      this.logger.log("Momentum calculation already in progress, skipping...");
      await this.db.$queryRaw`
        SELECT pg_advisory_unlock(${MOMENTUM_LOCK_KEY})
      `;
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      this.logger.log("Starting momentum score calculation...");

      // Get posts from the last MAX_AGE_DAYS days that haven't been deleted
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS);

      // Count total posts to process
      const totalCount = await this.db.elevatePost.count({
        where: {
          createdAt: { gte: cutoffDate },
          deletedAt: null,
          privacy: "PUBLIC", // Only public posts for momentum
        },
      });

      this.logger.log(`Found ${totalCount} posts to process`);

      let processed = 0;
      let cursor: string | undefined;

      // Process in batches
      while (processed < totalCount) {
        const posts = await this.db.elevatePost.findMany({
          where: {
            createdAt: { gte: cutoffDate },
            deletedAt: null,
            privacy: "PUBLIC",
          },
          select: {
            id: true,
            userId: true,
            highFiveCount: true,
            commentCount: true,
            reportCount: true,
            moderationLocked: true,
            type: true,
            content: true,
            createdAt: true,
            workoutSessionId: true,
            checkInGymId: true,
            reactions: {
              select: { userId: true },
            },
            comments: {
              where: { deletedAt: null },
              select: { userId: true },
            },
            savedBy: {
              select: { userId: true },
            },
          },
          take: BATCH_SIZE,
          skip: cursor ? 1 : 0,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { id: "asc" },
        });

        if (posts.length === 0) break;

        const authorRecentCounts = await this.getRecentPublicPostCountsByUser([
          ...new Set(posts.map((post) => post.userId)),
        ]);

        // Calculate scores and update in a transaction
        const updates = posts.map((post) => {
          const uniqueEngagers = new Set<string>([
            ...post.reactions.map((reaction) => reaction.userId),
            ...post.comments.map((comment) => comment.userId),
            ...post.savedBy.map((saved) => saved.userId),
          ]).size;

          const score = this.calculateMomentumScore({
            highFiveCount: post.highFiveCount,
            commentCount: post.commentCount,
            saveCount: post.savedBy.length,
            uniqueEngagerCount: uniqueEngagers,
            postType: post.type,
            content: post.content,
            createdAt: post.createdAt,
            authorRecentPublicPosts24h:
              authorRecentCounts.get(post.userId) ?? 1,
            reportCount: post.reportCount,
            moderationLocked: post.moderationLocked,
            hasWorkout: Boolean(post.workoutSessionId),
            hasCheckIn: Boolean(post.checkInGymId),
          });

          return this.db.elevatePost.update({
            where: { id: post.id },
            data: {
              momentumScore: score,
              momentumUpdatedAt: new Date(),
            },
          });
        });

        for (let i = 0; i < updates.length; i += WRITE_CHUNK_SIZE) {
          const chunk = updates.slice(i, i + WRITE_CHUNK_SIZE);
          await this.db.$transaction(chunk);
        }

        processed += posts.length;
        cursor = posts[posts.length - 1].id;

        this.logger.debug(`Processed ${processed}/${totalCount} posts`);
      }

      // Zero out scores for old posts (beyond MAX_AGE_DAYS)
      await this.db.elevatePost.updateMany({
        where: {
          createdAt: { lt: cutoffDate },
          momentumScore: { gt: 0 },
        },
        data: {
          momentumScore: 0,
          momentumUpdatedAt: new Date(),
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Momentum calculation complete. Processed ${processed} posts in ${duration}ms`,
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Momentum calculation failed: ${err.message}`,
        err.stack,
      );
    } finally {
      this.isProcessing = false;
      await this.db.$queryRaw`
        SELECT pg_advisory_unlock(${MOMENTUM_LOCK_KEY})
      `;
    }
  }

  /**
   * Recalculate momentum for a specific post (called when engagement changes)
   */
  async recalculatePostMomentum(postId: string): Promise<void> {
    try {
      const post = await this.db.elevatePost.findUnique({
        where: { id: postId },
        select: {
          userId: true,
          highFiveCount: true,
          commentCount: true,
          reportCount: true,
          moderationLocked: true,
          type: true,
          content: true,
          createdAt: true,
          privacy: true,
          workoutSessionId: true,
          checkInGymId: true,
          reactions: {
            select: { userId: true },
          },
          comments: {
            where: { deletedAt: null },
            select: { userId: true },
          },
          savedBy: {
            select: { userId: true },
          },
        },
      });

      if (!post) return;

      // Only calculate for public posts
      if (post.privacy !== "PUBLIC") {
        await this.db.elevatePost.update({
          where: { id: postId },
          data: { momentumScore: 0, momentumUpdatedAt: new Date() },
        });
        return;
      }

      const authorRecentCounts = await this.getRecentPublicPostCountsByUser([
        post.userId,
      ]);
      const uniqueEngagers = new Set<string>([
        ...post.reactions.map((reaction) => reaction.userId),
        ...post.comments.map((comment) => comment.userId),
        ...post.savedBy.map((saved) => saved.userId),
      ]).size;

      const score = this.calculateMomentumScore({
        highFiveCount: post.highFiveCount,
        commentCount: post.commentCount,
        saveCount: post.savedBy.length,
        uniqueEngagerCount: uniqueEngagers,
        postType: post.type,
        content: post.content,
        createdAt: post.createdAt,
        authorRecentPublicPosts24h: authorRecentCounts.get(post.userId) ?? 1,
        reportCount: post.reportCount,
        moderationLocked: post.moderationLocked,
        hasWorkout: Boolean(post.workoutSessionId),
        hasCheckIn: Boolean(post.checkInGymId),
      });

      await this.db.elevatePost.update({
        where: { id: postId },
        data: {
          momentumScore: score,
          momentumUpdatedAt: new Date(),
        },
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to recalculate momentum for post ${postId}: ${err.message}`,
      );
    }
  }
}
