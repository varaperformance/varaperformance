import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { PostPrivacy, GymPartnerStatus } from '@generated/prisma';
import { NotificationService } from '../notification/notification.service';
import { AchievementsService } from '../achievements/achievements.service';
import {
  REPORT_THRESHOLD,
  POST_COOLDOWN_SECONDS,
  COMMENT_COOLDOWN_SECONDS,
  DUPLICATE_WINDOW_MINUTES,
  MAX_POST_URLS,
  MAX_COMMENT_URLS,
  normalizeSpamText,
  countUrls,
} from './elevate.constants';
import { getEffectiveTimezone } from '@varaperformance/core';
import type {
  CreateElevatePost,
  UpdateElevatePost,
  CreateElevateComment,
  UpdateElevateComment,
  ElevateFeedQuery,
  ElevatePostResponse,
  ElevateFeedResponse,
  ElevateCommentResponse,
  ElevateAuthor,
  ElevateWorkoutSummary,
  ElevateMilestoneData,
  ElevatePRData,
  ElevateAchievementData,
  ElevateChallengeData,
  SuccessResponse,
  CreateElevateReport,
  UpdateElevateReport,
  AdminElevateReportsQuery,
  AdminElevateReportResponse,
  AdminElevateReportsResponse,
  ElevateReportResponse,
  CreateElevateStory,
  ElevateStoryResponse,
  ElevateStoryGroup,
  ElevateStoriesFeedResponse,
  StoryAuthor,
  SendGymPartnerRequest,
  RespondGymPartnerRequest,
  GymPartnersQuery,
  GymPartnerResponse,
  GymPartnerSuggestion,
  ElevateFeedQueryExtended,
  SearchUsersQuery,
  SearchUserResult,
  GymStatsResponse,
  TrendingExercise,
  PeakHours,
  TrainingUser,
} from '@varaperformance/core';

@Injectable()
export class ElevateService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationService: NotificationService,
    private readonly achievementsService: AchievementsService,
  ) {}

  /**
   * Convert a UTC timestamp into a 24-hour clock value in the target timezone.
   */
  private getHourInTimezone(date: Date, timezone: string): number {
    const hourPart = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    })
      .formatToParts(date)
      .find((part) => part.type === 'hour')?.value;

    const parsed = Number.parseInt(hourPart ?? '', 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private async enforcePostAntiSpam(
    userId: string,
    data: CreateElevatePost,
  ): Promise<void> {
    const normalized = normalizeSpamText(data.content);
    if (!normalized) {
      throw new BadRequestException('Post content cannot be empty');
    }

    const urlCount = countUrls(data.content);
    if (urlCount > MAX_POST_URLS) {
      throw new BadRequestException(
        `Too many links in one post (max ${MAX_POST_URLS})`,
      );
    }

    const now = Date.now();
    const latestPost = await this.db.elevatePost.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (latestPost) {
      const sinceLastPostMs = now - latestPost.createdAt.getTime();
      if (sinceLastPostMs < POST_COOLDOWN_SECONDS * 1000) {
        throw new BadRequestException(
          `You are posting too quickly. Please wait ${POST_COOLDOWN_SECONDS} seconds between posts.`,
        );
      }
    }

    const duplicateWindowStart = new Date(
      now - DUPLICATE_WINDOW_MINUTES * 60 * 1000,
    );
    const recentPosts = await this.db.elevatePost.findMany({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: duplicateWindowStart },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: { content: true },
    });

    const hasDuplicate = recentPosts.some(
      (post) => normalizeSpamText(post.content) === normalized,
    );

    if (hasDuplicate) {
      throw new BadRequestException(
        `Duplicate post detected. Please wait ${DUPLICATE_WINDOW_MINUTES} minutes before posting the same content again.`,
      );
    }
  }

  private async enforceCommentAntiSpam(
    userId: string,
    postId: string,
    data: CreateElevateComment,
  ): Promise<void> {
    const normalized = normalizeSpamText(data.content);
    if (!normalized) {
      throw new BadRequestException('Comment content cannot be empty');
    }

    const urlCount = countUrls(data.content);
    if (urlCount > MAX_COMMENT_URLS) {
      throw new BadRequestException(
        `Too many links in one comment (max ${MAX_COMMENT_URLS})`,
      );
    }

    const now = Date.now();
    const latestComment = await this.db.elevateComment.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (latestComment) {
      const sinceLastCommentMs = now - latestComment.createdAt.getTime();
      if (sinceLastCommentMs < COMMENT_COOLDOWN_SECONDS * 1000) {
        throw new BadRequestException(
          `You are commenting too quickly. Please wait ${COMMENT_COOLDOWN_SECONDS} seconds between comments.`,
        );
      }
    }

    const duplicateWindowStart = new Date(
      now - DUPLICATE_WINDOW_MINUTES * 60 * 1000,
    );
    const recentComments = await this.db.elevateComment.findMany({
      where: {
        userId,
        postId,
        deletedAt: null,
        createdAt: { gte: duplicateWindowStart },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: { content: true },
    });

    const hasDuplicate = recentComments.some(
      (comment) => normalizeSpamText(comment.content) === normalized,
    );

    if (hasDuplicate) {
      throw new BadRequestException(
        `Duplicate comment detected on this post. Please wait ${DUPLICATE_WINDOW_MINUTES} minutes before repeating it.`,
      );
    }
  }

  /**
   * Get paginated feed of posts
   */
  async getFeed(
    userId: string | undefined,
    query: ElevateFeedQuery,
  ): Promise<SuccessResponse<ElevateFeedResponse>> {
    const viewerUserId = userId ?? '';
    const { page = 1, limit = 20, type, userId: filterUserId } = query;
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(type && { type }),
      ...(filterUserId && { userId: filterUserId }),
      OR: viewerUserId
        ? [
            { privacy: PostPrivacy.PUBLIC },
            { userId: viewerUserId }, // User can always see their own posts
          ]
        : [{ privacy: PostPrivacy.PUBLIC }],
    };

    const [posts, total] = await Promise.all([
      this.db.elevatePost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  coverUrl: true,
                },
              },
            },
          },
          workoutSession: {
            include: {
              workouts: {
                include: {
                  sets: true,
                },
              },
            },
          },
          personalRecord: {
            include: {
              exercise: true,
            },
          },
          achievement: true,
          challenge: true,
          reactions: {
            where: { userId: viewerUserId },
            take: 1,
          },
          savedBy: {
            where: { userId: viewerUserId },
            take: 1,
          },
          comments: {
            where: { deletedAt: null, parentId: null },
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: {
              user: {
                include: {
                  profile: {
                    select: {
                      displayName: true,
                      avatarUrl: true,
                      coverUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.db.elevatePost.count({ where }),
    ]);

    const formattedPosts = posts.map((post) =>
      this.formatPostResponse(post, viewerUserId),
    );

    return {
      success: true,
      data: {
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + posts.length < total,
        },
      },
    };
  }

  /**
   * Get profile stats for the social page
   * Returns workout count, gym partner count, and PRs this year
   */
  async getProfileStats(userId: string): Promise<
    SuccessResponse<{
      workouts: number;
      gymPartners: number;
      prsThisYear: number;
    }>
  > {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [workoutCount, partnerCount, prCountThisYear] = await Promise.all([
      // Total workout sessions
      this.db.workoutSession.count({
        where: {
          userId,
        },
      }),
      // Count of accepted gym partners (either sent or received)
      this.db.gymPartner.count({
        where: {
          status: GymPartnerStatus.ACCEPTED,
          OR: [{ requesterId: userId }, { receiverId: userId }],
        },
      }),
      // PRs achieved this year
      this.db.personalRecord.count({
        where: {
          userId,
          achievedAt: { gte: startOfYear },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        workouts: workoutCount,
        gymPartners: partnerCount,
        prsThisYear: prCountThisYear,
      },
    };
  }

  /**
   * Get a single post by ID
   */
  async getPost(
    userId: string,
    postId: string,
  ): Promise<SuccessResponse<ElevatePostResponse>> {
    const post = await this.db.elevatePost.findFirst({
      where: {
        id: postId,
        deletedAt: null,
        OR: [{ privacy: PostPrivacy.PUBLIC }, { userId }],
      },
      include: {
        user: {
          include: {
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                coverUrl: true,
              },
            },
          },
        },
        workoutSession: {
          include: {
            workouts: {
              include: {
                sets: true,
              },
            },
          },
        },
        personalRecord: {
          include: {
            exercise: true,
          },
        },
        achievement: true,
        challenge: true,
        reactions: {
          where: { userId },
          take: 1,
        },
        savedBy: {
          where: { userId },
          take: 1,
        },
        comments: {
          where: { deletedAt: null, parentId: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              include: {
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                    coverUrl: true,
                  },
                },
              },
            },
            replies: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'asc' },
              include: {
                user: {
                  include: {
                    profile: {
                      select: {
                        displayName: true,
                        avatarUrl: true,
                        coverUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return {
      success: true,
      data: this.formatPostResponse(post, userId),
    };
  }

  /**
   * Create a new post
   */
  async createPost(
    userId: string,
    data: CreateElevatePost,
  ): Promise<SuccessResponse<ElevatePostResponse>> {
    await this.enforcePostAntiSpam(userId, data);

    // Validate workout privacy against post privacy
    if (data.workoutSessionId) {
      const workoutSession = await this.db.workoutSession.findFirst({
        where: { id: data.workoutSessionId, userId },
      });

      if (!workoutSession) {
        throw new NotFoundException('Workout session not found');
      }

      // Check if already shared
      const existingPost = await this.db.elevatePost.findFirst({
        where: { workoutSessionId: data.workoutSessionId, deletedAt: null },
      });
      if (existingPost) {
        throw new BadRequestException(
          'This workout has already been shared to Elevate',
        );
      }

      // Validate privacy: post can't be more public than workout
      // PUBLIC post → only PUBLIC workouts
      // FRIENDS post → PUBLIC or FRIENDS workouts
      // PRIVATE post → any workout
      const postPrivacy = data.privacy ?? 'PUBLIC';
      const workoutPrivacy = workoutSession.privacy;

      if (postPrivacy === 'PUBLIC' && workoutPrivacy !== 'PUBLIC') {
        throw new BadRequestException(
          `Cannot share a ${workoutPrivacy.toLowerCase()} workout publicly. Change post privacy or workout privacy first.`,
        );
      }

      if (postPrivacy === 'FRIENDS' && workoutPrivacy === 'PRIVATE') {
        throw new BadRequestException(
          'Cannot share a private workout with friends. Change post privacy to private or workout privacy first.',
        );
      }
    }

    const post = await this.db.elevatePost.create({
      data: {
        userId,
        type: data.type,
        content: data.content,
        images: data.images || [],
        privacy: data.privacy ?? 'PUBLIC',
        workoutSessionId: data.workoutSessionId,
        milestoneType: data.milestoneType,
        milestoneValue: data.milestoneValue,
        milestoneLabel: data.milestoneLabel,
        personalRecordId: data.personalRecordId,
        checkInGymId: data.checkInData?.gymId,
        checkInGymName: data.checkInData?.gymName,
      },
      include: {
        user: {
          include: {
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                coverUrl: true,
              },
            },
          },
        },
        workoutSession: {
          include: {
            workouts: {
              include: {
                sets: true,
              },
            },
          },
        },
        personalRecord: {
          include: {
            exercise: true,
          },
        },
        achievement: true,
        challenge: true,
        checkInGym: true,
      },
    });

    // Check SOCIAL achievements (e.g. Social Butterfly — first post)
    const postCount = await this.db.elevatePost.count({
      where: { userId, deletedAt: null },
    });
    this.achievementsService
      .checkAndAward(userId, 'SOCIAL', postCount, 'first-post')
      .catch(() => {});

    return {
      success: true,
      data: this.formatPostResponse(
        { ...post, reactions: [], savedBy: [], comments: [] },
        userId,
      ),
    };
  }

  /**
   * Update a post
   */
  async updatePost(
    userId: string,
    postId: string,
    data: UpdateElevatePost,
  ): Promise<SuccessResponse<ElevatePostResponse>> {
    const post = await this.db.elevatePost.findFirst({
      where: { id: postId, userId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Prevent privacy changes on moderation-locked posts
    if (post.moderationLocked && data.privacy !== undefined) {
      throw new BadRequestException(
        'This post is under moderation review and privacy cannot be changed',
      );
    }

    const updated = await this.db.elevatePost.update({
      where: { id: postId },
      data: {
        ...(data.content && { content: data.content }),
        ...(data.images && { images: data.images }),
        ...(!post.moderationLocked &&
          data.privacy !== undefined && { privacy: data.privacy }),
      },
      include: {
        user: {
          include: {
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                coverUrl: true,
              },
            },
          },
        },
        workoutSession: {
          include: {
            workouts: {
              include: {
                sets: true,
              },
            },
          },
        },
        personalRecord: {
          include: {
            exercise: true,
          },
        },
        achievement: true,
        challenge: true,
        reactions: {
          where: { userId },
          take: 1,
        },
        savedBy: {
          where: { userId },
          take: 1,
        },
        comments: {
          where: { deletedAt: null, parentId: null },
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            user: {
              include: {
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                    coverUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: this.formatPostResponse(updated, userId),
    };
  }

  /**
   * Delete a post (soft delete)
   */
  async deletePost(
    userId: string,
    postId: string,
  ): Promise<SuccessResponse<{ deleted: true }>> {
    const post = await this.db.elevatePost.findFirst({
      where: { id: postId, userId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Clear unique foreign keys so they can be reused after soft delete
    await this.db.elevatePost.update({
      where: { id: postId },
      data: {
        deletedAt: new Date(),
        workoutSessionId: null,
        personalRecordId: null,
      },
    });

    return { success: true, data: { deleted: true } };
  }

  /**
   * Toggle high five (like) on a post
   */
  async toggleHighFive(
    userId: string,
    postId: string,
  ): Promise<SuccessResponse<{ highFived: boolean; highFiveCount: number }>> {
    const post = await this.db.elevatePost.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.db.elevateReaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      // Remove high five
      await this.db.$transaction([
        this.db.elevateReaction.delete({
          where: { id: existing.id },
        }),
        this.db.elevatePost.update({
          where: { id: postId },
          data: { highFiveCount: { decrement: 1 } },
        }),
      ]);

      return {
        success: true,
        data: { highFived: false, highFiveCount: post.highFiveCount - 1 },
      };
    } else {
      // Add high five
      await this.db.$transaction([
        this.db.elevateReaction.create({
          data: { postId, userId },
        }),
        this.db.elevatePost.update({
          where: { id: postId },
          data: { highFiveCount: { increment: 1 } },
        }),
      ]);

      // Notify post author (skip self high-fives)
      if (post.userId !== userId) {
        void this.notificationService.create({
          userId: post.userId,
          type: 'POST_HIGH_FIVED',
          title: 'Post high-fived',
          body: 'Someone high-fived your post!',
          actionUrl: `/elevate/post/${postId}`,
          data: { postId },
        });
      }

      return {
        success: true,
        data: { highFived: true, highFiveCount: post.highFiveCount + 1 },
      };
    }
  }

  /**
   * Toggle save/bookmark on a post
   */
  async toggleSave(
    userId: string,
    postId: string,
  ): Promise<SuccessResponse<{ saved: boolean }>> {
    const post = await this.db.elevatePost.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.db.elevateSavedPost.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      // Remove save
      await this.db.elevateSavedPost.delete({
        where: { id: existing.id },
      });

      return {
        success: true,
        data: { saved: false },
      };
    } else {
      // Add save
      await this.db.elevateSavedPost.create({
        data: { postId, userId },
      });

      return {
        success: true,
        data: { saved: true },
      };
    }
  }

  /**
   * Get comments for a post
   */
  async getComments(
    postId: string,
    page = 1,
    limit = 20,
  ): Promise<
    SuccessResponse<{ comments: ElevateCommentResponse[]; total: number }>
  > {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.db.elevateComment.findMany({
        where: { postId, deletedAt: null, parentId: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  coverUrl: true,
                },
              },
            },
          },
          replies: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                include: {
                  profile: {
                    select: {
                      displayName: true,
                      avatarUrl: true,
                      coverUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.db.elevateComment.count({
        where: { postId, deletedAt: null, parentId: null },
      }),
    ]);

    return {
      success: true,
      data: {
        comments: comments.map((c) => this.formatCommentResponse(c)),
        total,
      },
    };
  }

  /**
   * Create a comment on a post
   */
  async createComment(
    userId: string,
    postId: string,
    data: CreateElevateComment,
  ): Promise<SuccessResponse<ElevateCommentResponse>> {
    await this.enforceCommentAntiSpam(userId, postId, data);

    const post = await this.db.elevatePost.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // If replying to a comment, verify parent exists
    if (data.parentId) {
      const parent = await this.db.elevateComment.findFirst({
        where: { id: data.parentId, postId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const [comment] = await this.db.$transaction([
      this.db.elevateComment.create({
        data: {
          postId,
          userId,
          content: data.content,
          parentId: data.parentId,
        },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  coverUrl: true,
                },
              },
            },
          },
        },
      }),
      this.db.elevatePost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    // Notify post author about the comment (skip self-comments)
    if (post.userId !== userId) {
      const commenterName = comment.user?.profile?.displayName || 'Someone';
      void this.notificationService.create({
        userId: post.userId,
        type: 'POST_COMMENT_RECEIVED',
        title: 'New comment on your post',
        body: `${commenterName} commented on your post.`,
        actionUrl: `/elevate/post/${postId}`,
        data: { postId, commentId: comment.id },
      });
    }

    return {
      success: true,
      data: this.formatCommentResponse(comment),
    };
  }

  /**
   * Update a comment
   */
  async updateComment(
    userId: string,
    commentId: string,
    data: UpdateElevateComment,
  ): Promise<SuccessResponse<ElevateCommentResponse>> {
    const comment = await this.db.elevateComment.findFirst({
      where: { id: commentId, userId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const updated = await this.db.elevateComment.update({
      where: { id: commentId },
      data: { content: data.content },
      include: {
        user: {
          include: {
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                coverUrl: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: this.formatCommentResponse(updated),
    };
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(
    userId: string,
    commentId: string,
  ): Promise<SuccessResponse<{ deleted: true }>> {
    const comment = await this.db.elevateComment.findFirst({
      where: { id: commentId, userId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.db.$transaction([
      this.db.elevateComment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() },
      }),
      this.db.elevatePost.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);

    return { success: true, data: { deleted: true } };
  }

  // ============ Private Helpers ============

  private formatPostResponse(
    post: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _currentUserId: string,
  ): ElevatePostResponse {
    const author: ElevateAuthor = {
      id: post.user.id,
      displayName: post.user.profile?.displayName ?? null,
      avatarUrl: post.user.profile?.avatarUrl ?? null,
      coverUrl: post.user.profile?.coverUrl ?? null,
    };

    let workout: ElevateWorkoutSummary | null = null;
    if (post.workoutSession) {
      const ws = post.workoutSession;
      const totalSets = ws.workouts.reduce(
        (acc: number, w: any) => acc + w.sets.length,
        0,
      );
      const totalVolume = ws.workouts.reduce((acc: number, w: any) => {
        return (
          acc +
          w.sets.reduce((setAcc: number, s: any) => {
            return setAcc + (s.weight || 0) * (s.reps || 0);
          }, 0)
        );
      }, 0);

      // Calculate total duration from sets (in seconds)
      const totalDuration = ws.workouts.reduce((acc: number, w: any) => {
        return (
          acc +
          w.sets.reduce((setAcc: number, s: any) => {
            return setAcc + (s.duration || 0);
          }, 0)
        );
      }, 0);

      // Calculate total distance from sets (in meters)
      const totalDistance = ws.workouts.reduce((acc: number, w: any) => {
        return (
          acc +
          w.sets.reduce((setAcc: number, s: any) => {
            return setAcc + (s.distance || 0);
          }, 0)
        );
      }, 0);

      workout = {
        id: ws.id,
        title: ws.title,
        performed: ws.performed.toISOString(),
        exerciseCount: ws.workouts.length,
        totalSets,
        totalVolume: totalVolume > 0 ? totalVolume : null,
        totalDistance: totalDistance > 0 ? totalDistance : null,
        duration: totalDuration > 0 ? totalDuration : null,
      };
    }

    let milestone: ElevateMilestoneData | null = null;
    if (post.milestoneType && post.milestoneValue && post.milestoneLabel) {
      milestone = {
        type: post.milestoneType,
        value: post.milestoneValue,
        label: post.milestoneLabel,
      };
    }

    let personalRecord: ElevatePRData | null = null;
    if (post.personalRecord) {
      const pr = post.personalRecord;
      personalRecord = {
        id: pr.id,
        exerciseName: pr.exercise.name,
        type: pr.type,
        value: pr.value,
        reps: pr.reps,
        weight: pr.weight,
      };
    }

    let checkIn: {
      gymId?: string;
      gymName: string;
      timestamp?: string;
    } | null = null;
    // Show check-in data regardless of post type (workout posts can also have gym check-ins)
    if (post.checkInGymName) {
      checkIn = {
        gymId: post.checkInGymId ?? undefined,
        gymName: post.checkInGymName,
        timestamp: post.createdAt.toISOString(),
      };
    }

    let achievement: ElevateAchievementData | null = null;
    if (post.achievement) {
      const a = post.achievement;
      achievement = {
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        slug: a.slug,
      };
    }

    let challenge: ElevateChallengeData | null = null;
    if (post.challenge) {
      const c = post.challenge;
      challenge = {
        id: c.id,
        title: c.title,
        description: c.description,
        type: c.type,
        goalValue: c.goalValue,
        goalUnit: c.goalUnit,
        participantCount: c.participantCount,
        isOfficial: c.isOfficial,
        status: c.status,
      };
    }

    return {
      id: post.id,
      type: post.type,
      content: post.content,
      images: post.images || [],
      privacy: post.privacy,
      author,
      highFiveCount: post.highFiveCount,
      commentCount: post.commentCount,
      hasHighFived: post.reactions?.length > 0,
      hasSaved: post.savedBy?.length > 0,
      moderationLocked: post.moderationLocked ?? false,
      workout,
      milestone,
      personalRecord,
      checkIn,
      achievement,
      challenge,
      recentComments: post.comments?.map((c: any) =>
        this.formatCommentResponse(c),
      ),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  private formatCommentResponse(comment: any): ElevateCommentResponse {
    return {
      id: comment.id,
      content: comment.content,
      author: {
        id: comment.user.id,
        displayName: comment.user.profile?.displayName ?? null,
        avatarUrl: comment.user.profile?.avatarUrl ?? null,
        coverUrl: comment.user.profile?.coverUrl ?? null,
      },
      parentId: comment.parentId,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      replies: comment.replies?.map((r: any) => this.formatCommentResponse(r)),
    };
  }

  // ============ Report Methods ============

  /**
   * Report a post
   */
  async reportPost(
    userId: string,
    postId: string,
    data: CreateElevateReport,
  ): Promise<SuccessResponse<ElevateReportResponse>> {
    const post = await this.db.elevatePost.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user has already reported this post
    const existingReport = await this.db.elevateReport.findFirst({
      where: { postId, userId },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this post');
    }

    // Can't report your own post
    if (post.userId === userId) {
      throw new BadRequestException('You cannot report your own post');
    }

    // Create report and increment report count
    const newReportCount = post.reportCount + 1;
    const shouldLock =
      newReportCount >= REPORT_THRESHOLD && !post.moderationLocked;

    const [report] = await this.db.$transaction([
      this.db.elevateReport.create({
        data: {
          postId,
          userId,
          reason: data.reason,
          details: data.details,
        },
      }),
      this.db.elevatePost.update({
        where: { id: postId },
        data: {
          reportCount: { increment: 1 },
          // Auto-lock and set to private if threshold reached
          ...(shouldLock && {
            moderationLocked: true,
            privacy: 'PRIVATE',
          }),
        },
      }),
    ]);

    return {
      success: true,
      data: {
        id: report.id,
        postId: report.postId,
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
      },
    };
  }

  /**
   * Get all reports (admin)
   */
  async getReports(
    query: AdminElevateReportsQuery,
  ): Promise<SuccessResponse<AdminElevateReportsResponse>> {
    const { page = 1, limit = 20, status, reason } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(reason && { reason }),
    };

    const [reports, total] = await Promise.all([
      this.db.elevateReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          post: {
            include: {
              user: {
                include: {
                  profile: {
                    select: {
                      displayName: true,
                      avatarUrl: true,
                      coverUrl: true,
                    },
                  },
                },
              },
            },
          },
          user: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  coverUrl: true,
                },
              },
            },
          },
          reviewedBy: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  coverUrl: true,
                },
              },
            },
          },
        },
      }),
      this.db.elevateReport.count({ where }),
    ]);

    const formattedReports: AdminElevateReportResponse[] = reports.map(
      (report) => ({
        id: report.id,
        postId: report.postId,
        post: {
          id: report.post.id,
          type: report.post.type,
          content: report.post.content,
          images: report.post.images || [],
          author: {
            id: report.post.user.id,
            displayName: report.post.user.profile?.displayName ?? null,
            avatarUrl: report.post.user.profile?.avatarUrl ?? null,
            coverUrl: report.post.user.profile?.coverUrl ?? null,
          },
          createdAt: report.post.createdAt.toISOString(),
        },
        reporter: {
          id: report.user.id,
          displayName: report.user.profile?.displayName ?? null,
          avatarUrl: report.user.profile?.avatarUrl ?? null,
          coverUrl: report.user.profile?.coverUrl ?? null,
        },
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        reviewedAt: report.reviewedAt?.toISOString() ?? null,
        reviewedBy: report.reviewedBy
          ? {
              id: report.reviewedBy.id,
              displayName: report.reviewedBy.profile?.displayName ?? null,
              avatarUrl: report.reviewedBy.profile?.avatarUrl ?? null,
              coverUrl: report.reviewedBy.profile?.coverUrl ?? null,
            }
          : null,
        reviewNote: report.reviewNote,
      }),
    );

    return {
      success: true,
      data: {
        reports: formattedReports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + reports.length < total,
        },
      },
    };
  }

  /**
   * Update report status (admin)
   */
  async updateReportStatus(
    moderatorId: string,
    reportId: string,
    data: UpdateElevateReport,
  ): Promise<SuccessResponse<{ updated: true }>> {
    const report = await this.db.elevateReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    await this.db.$transaction(async (tx) => {
      await tx.elevateReport.update({
        where: { id: reportId },
        data: {
          status: data.status,
          reviewNote: data.reviewNote,
          reviewedById: moderatorId,
          reviewedAt: new Date(),
        },
      });

      const pendingCount = await tx.elevateReport.count({
        where: {
          postId: report.postId,
          status: 'PENDING',
        },
      });

      if (pendingCount === 0) {
        await tx.elevatePost.update({
          where: { id: report.postId },
          data: {
            moderationLocked: false,
          },
        });
      }
    });

    return { success: true, data: { updated: true } };
  }

  /**
   * Delete a post as admin (soft delete)
   */
  async adminDeletePost(
    moderatorId: string,
    postId: string,
  ): Promise<SuccessResponse<{ deleted: true }>> {
    const post = await this.db.elevatePost.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Soft delete the post
    await this.db.elevatePost.update({
      where: { id: postId },
      data: {
        deletedAt: new Date(),
        workoutSessionId: null,
        personalRecordId: null,
      },
    });

    // Resolve all pending reports for this post
    await this.db.elevateReport.updateMany({
      where: { postId, status: 'PENDING' },
      data: {
        status: 'RESOLVED',
        reviewedById: moderatorId,
        reviewedAt: new Date(),
        reviewNote: 'Post deleted by moderator',
      },
    });

    return { success: true, data: { deleted: true } };
  }

  // ==================== STORIES ====================

  /**
   * Get stories feed grouped by user (only non-expired stories)
   */
  async getStories(
    userId: string,
  ): Promise<SuccessResponse<ElevateStoriesFeedResponse>> {
    const now = new Date();

    // Get all non-expired stories grouped by user
    const stories = await this.db.elevateStory.findMany({
      where: {
        expiresAt: { gt: now },
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        views: {
          where: { userId },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group stories by user
    const userGroups = new Map<
      string,
      {
        user: StoryAuthor;
        stories: ElevateStoryResponse[];
        hasUnviewed: boolean;
        latestAt: string;
      }
    >();

    for (const story of stories) {
      const authorId = story.userId;
      const hasViewed = story.views.length > 0;

      const storyResponse: ElevateStoryResponse = {
        id: story.id,
        author: {
          id: story.user.id,
          displayName: story.user.profile?.displayName || null,
          avatarUrl: story.user.profile?.avatarUrl || null,
        },
        mediaType: story.mediaType === 'IMAGE' ? 'IMAGE' : 'VIDEO',
        mediaUrl: story.mediaUrl,
        thumbnail: story.thumbnail,
        duration: story.duration,
        caption: story.caption,
        viewCount: story.viewCount,
        hasViewed,
        expiresAt: story.expiresAt.toISOString(),
        createdAt: story.createdAt.toISOString(),
      };

      if (!userGroups.has(authorId)) {
        userGroups.set(authorId, {
          user: {
            id: story.user.id,
            displayName: story.user.profile?.displayName || null,
            avatarUrl: story.user.profile?.avatarUrl || null,
          },
          stories: [storyResponse],
          hasUnviewed: !hasViewed,
          latestAt: story.createdAt.toISOString(),
        });
      } else {
        const group = userGroups.get(authorId)!;
        group.stories.push(storyResponse);
        if (!hasViewed) {
          group.hasUnviewed = true;
        }
      }
    }

    // Convert to array and sort - current user first, then by unviewed, then by latest
    const groups: ElevateStoryGroup[] = Array.from(userGroups.values()).sort(
      (a, b) => {
        // Current user's stories first
        if (a.user.id === userId) return -1;
        if (b.user.id === userId) return 1;
        // Then by unviewed
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        // Then by most recent
        return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
      },
    );

    return { success: true, data: { groups } };
  }

  /**
   * Create a new story
   */
  async createStory(
    userId: string,
    data: CreateElevateStory,
  ): Promise<SuccessResponse<ElevateStoryResponse>> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const story = await this.db.elevateStory.create({
      data: {
        userId,
        mediaType: data.mediaType,
        mediaUrl: data.mediaUrl,
        thumbnail: data.thumbnail,
        duration: data.duration,
        caption: data.caption,
      },
    });

    const response: ElevateStoryResponse = {
      id: story.id,
      author: {
        id: user.id,
        displayName: user.profile?.displayName || null,
        avatarUrl: user.profile?.avatarUrl || null,
      },
      mediaType: story.mediaType === 'IMAGE' ? 'IMAGE' : 'VIDEO',
      mediaUrl: story.mediaUrl,
      thumbnail: story.thumbnail,
      duration: story.duration,
      caption: story.caption,
      viewCount: 0,
      hasViewed: true, // Creator has "viewed" their own story
      expiresAt: story.expiresAt.toISOString(),
      createdAt: story.createdAt.toISOString(),
    };

    return { success: true, data: response };
  }

  /**
   * Mark a story as viewed
   */
  async viewStory(
    userId: string,
    storyId: string,
  ): Promise<SuccessResponse<{ viewed: boolean }>> {
    const story = await this.db.elevateStory.findFirst({
      where: {
        id: storyId,
        expiresAt: { gt: new Date() },
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found or expired');
    }

    // Create view record (upsert to handle duplicate views)
    await this.db.elevateStoryView.upsert({
      where: {
        storyId_userId: { storyId, userId },
      },
      create: { storyId, userId },
      update: { viewedAt: new Date() },
    });

    // Increment view count (only for first view)
    const existingView = await this.db.elevateStoryView.findUnique({
      where: { storyId_userId: { storyId, userId } },
    });

    if (!existingView || existingView.viewedAt.getTime() >= Date.now() - 1000) {
      // Only increment if this is a new view (created within last second)
      await this.db.elevateStory.update({
        where: { id: storyId },
        data: { viewCount: { increment: 1 } },
      });
    }

    return { success: true, data: { viewed: true } };
  }

  /**
   * Delete own story
   */
  async deleteStory(
    userId: string,
    storyId: string,
  ): Promise<SuccessResponse<{ deleted: true }>> {
    const story = await this.db.elevateStory.findFirst({
      where: { id: storyId, userId },
    });

    if (!story) {
      throw new NotFoundException('Story not found or not owned by user');
    }

    await this.db.elevateStory.delete({
      where: { id: storyId },
    });

    return { success: true, data: { deleted: true } };
  }

  // ============ Gym Partners ============

  /**
   * Get user's gym partner IDs (for filtering feed)
   */
  private async getGymPartnerIds(userId: string): Promise<string[]> {
    const partnerships = await this.db.gymPartner.findMany({
      where: {
        status: GymPartnerStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: { requesterId: true, receiverId: true },
    });

    const partnerIds = new Set<string>();
    for (const p of partnerships) {
      if (p.requesterId !== userId) partnerIds.add(p.requesterId);
      if (p.receiverId !== userId) partnerIds.add(p.receiverId);
    }
    return Array.from(partnerIds);
  }

  /**
   * Batch-load gym partner IDs for multiple users in a single query,
   * returning a Map<userId, partnerIds[]> to avoid N+1 queries.
   */
  private async getGymPartnerIdsBatch(
    userIds: string[],
  ): Promise<Map<string, string[]>> {
    if (userIds.length === 0) return new Map();

    const partnerships = await this.db.gymPartner.findMany({
      where: {
        status: GymPartnerStatus.ACCEPTED,
        OR: [{ requesterId: { in: userIds } }, { receiverId: { in: userIds } }],
      },
      select: { requesterId: true, receiverId: true },
    });

    const result = new Map<string, Set<string>>();
    for (const uid of userIds) {
      result.set(uid, new Set());
    }
    for (const p of partnerships) {
      result.get(p.requesterId)?.add(p.receiverId);
      result.get(p.receiverId)?.add(p.requesterId);
    }

    const mapped = new Map<string, string[]>();
    for (const [uid, set] of result) {
      mapped.set(uid, Array.from(set));
    }
    return mapped;
  }

  /**
   * Send a gym partner request
   */
  async sendGymPartnerRequest(
    userId: string,
    data: SendGymPartnerRequest,
  ): Promise<SuccessResponse<GymPartnerResponse>> {
    const { receiverId } = data;

    if (userId === receiverId) {
      throw new BadRequestException('Cannot send request to yourself');
    }

    // Check if receiver exists
    const receiver = await this.db.user.findUnique({
      where: { id: receiverId },
      select: {
        id: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            gyms: { select: { id: true, name: true }, take: 1 },
          },
        },
      },
    });

    if (!receiver) {
      throw new NotFoundException('User not found');
    }

    // Check for existing relationship (in either direction)
    const existing = await this.db.gymPartner.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId },
          { requesterId: receiverId, receiverId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === GymPartnerStatus.ACCEPTED) {
        throw new ConflictException('Already gym partners');
      }
      if (existing.status === GymPartnerStatus.PENDING) {
        throw new ConflictException('Request already pending');
      }
      if (existing.status === GymPartnerStatus.BLOCKED) {
        throw new BadRequestException('Cannot send request to this user');
      }
    }

    // Get requester info for notification
    const requester = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profile: { select: { displayName: true, avatarUrl: true } },
      },
    });

    // Create the request
    const request = await this.db.gymPartner.create({
      data: {
        requesterId: userId,
        receiverId,
      },
    });

    // Send notification to receiver
    await this.notificationService.create({
      userId: receiverId,
      type: 'GYM_PARTNER_REQUEST',
      title: 'New Gym Partner Request',
      body: `${requester?.profile?.displayName || 'Someone'} wants to be your gym partner`,
      actionUrl: '/partners',
      data: {
        requestId: request.id,
        requesterId: userId,
        requesterName: requester?.profile?.displayName,
        requesterAvatar: requester?.profile?.avatarUrl,
      },
    });

    return {
      success: true,
      data: {
        id: request.id,
        user: {
          id: receiver.id,
          displayName: receiver.profile?.displayName || null,
          avatarUrl: receiver.profile?.avatarUrl || null,
          gym: receiver.profile?.gyms[0] || null,
        },
        status: request.status as any,
        isRequester: true,
        respondedAt: null,
        createdAt: request.createdAt.toISOString(),
      },
    };
  }

  /**
   * Respond to a gym partner request (accept/reject/block)
   */
  async respondToGymPartnerRequest(
    userId: string,
    requestId: string,
    data: RespondGymPartnerRequest,
  ): Promise<SuccessResponse<GymPartnerResponse>> {
    const request = await this.db.gymPartner.findFirst({
      where: { id: requestId, receiverId: userId },
      include: {
        requester: {
          select: {
            id: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                gyms: { select: { id: true, name: true }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== GymPartnerStatus.PENDING) {
      throw new BadRequestException('Request already responded to');
    }

    const statusMap = {
      ACCEPT: GymPartnerStatus.ACCEPTED,
      REJECT: GymPartnerStatus.REJECTED,
      BLOCK: GymPartnerStatus.BLOCKED,
    };

    const updated = await this.db.gymPartner.update({
      where: { id: requestId },
      data: {
        status: statusMap[data.action],
        respondedAt: new Date(),
      },
    });

    // If accepted, notify the requester
    if (data.action === 'ACCEPT') {
      const responder = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      });

      await this.notificationService.create({
        userId: request.requesterId,
        type: 'GYM_PARTNER_ACCEPTED',
        title: 'Gym Partner Request Accepted!',
        body: `${responder?.profile?.displayName || 'Someone'} accepted your gym partner request`,
        actionUrl: `/elevate/${userId}`,
        data: {
          partnerId: userId,
          partnerName: responder?.profile?.displayName,
          partnerAvatar: responder?.profile?.avatarUrl,
        },
      });
    }

    return {
      success: true,
      data: {
        id: updated.id,
        user: {
          id: request.requester.id,
          displayName: request.requester.profile?.displayName || null,
          avatarUrl: request.requester.profile?.avatarUrl || null,
          gym: request.requester.profile?.gyms[0] || null,
        },
        status: updated.status as any,
        isRequester: false,
        respondedAt: updated.respondedAt?.toISOString() || null,
        createdAt: updated.createdAt.toISOString(),
      },
    };
  }

  /**
   * Remove a gym partner connection
   */
  async removeGymPartner(
    userId: string,
    partnerId: string,
  ): Promise<SuccessResponse<{ removed: true }>> {
    const partnership = await this.db.gymPartner.findFirst({
      where: {
        status: GymPartnerStatus.ACCEPTED,
        OR: [
          { requesterId: userId, receiverId: partnerId },
          { requesterId: partnerId, receiverId: userId },
        ],
      },
    });

    if (!partnership) {
      throw new NotFoundException('Partnership not found');
    }

    await this.db.gymPartner.delete({
      where: { id: partnership.id },
    });

    return { success: true, data: { removed: true } };
  }

  /**
   * Get gym partners list
   */
  async getGymPartners(
    userId: string,
    query: GymPartnersQuery,
  ): Promise<
    SuccessResponse<{
      partners: GymPartnerResponse[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status
        ? { status: status as GymPartnerStatus }
        : {
            status: {
              in: [GymPartnerStatus.PENDING, GymPartnerStatus.ACCEPTED],
            },
          }),
      OR: [{ requesterId: userId }, { receiverId: userId }],
    };

    const [partnerships, total] = await Promise.all([
      this.db.gymPartner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  gyms: { select: { id: true, name: true }, take: 1 },
                },
              },
            },
          },
          receiver: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  gyms: { select: { id: true, name: true }, take: 1 },
                },
              },
            },
          },
        },
      }),
      this.db.gymPartner.count({ where }),
    ]);

    const partners: GymPartnerResponse[] = partnerships.map((p) => {
      const isRequester = p.requesterId === userId;
      const otherUser = isRequester ? p.receiver : p.requester;

      return {
        id: p.id,
        user: {
          id: otherUser.id,
          displayName: otherUser.profile?.displayName || null,
          avatarUrl: otherUser.profile?.avatarUrl || null,
          gym: otherUser.profile?.gyms[0] || null,
        },
        status: p.status as any,
        isRequester,
        respondedAt: p.respondedAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: { partners, total, page, limit },
    };
  }

  /**
   * Get pending requests (incoming)
   */
  async getPendingRequests(
    userId: string,
  ): Promise<SuccessResponse<{ requests: GymPartnerResponse[] }>> {
    const requests = await this.db.gymPartner.findMany({
      where: {
        receiverId: userId,
        status: GymPartnerStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: {
          include: {
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                gyms: { select: { id: true, name: true }, take: 1 },
              },
            },
          },
        },
      },
    });

    const formatted: GymPartnerResponse[] = requests.map((r) => ({
      id: r.id,
      user: {
        id: r.requester.id,
        displayName: r.requester.profile?.displayName || null,
        avatarUrl: r.requester.profile?.avatarUrl || null,
        gym: r.requester.profile?.gyms[0] || null,
      },
      status: r.status as any,
      isRequester: false,
      respondedAt: null,
      createdAt: r.createdAt.toISOString(),
    }));

    return { success: true, data: { requests: formatted } };
  }

  /**
   * Get gym partner suggestions (prioritize same gym members)
   */
  async getGymPartnerSuggestions(
    userId: string,
    limit = 10,
  ): Promise<SuccessResponse<{ suggestions: GymPartnerSuggestion[] }>> {
    // Get user's gyms
    const userProfile = await this.db.profile.findUnique({
      where: { userId },
      include: { gyms: { select: { id: true, name: true } } },
    });

    if (!userProfile) {
      return { success: true, data: { suggestions: [] } };
    }

    const userGymIds = userProfile.gyms.map((g) => g.id);

    // Get existing partner IDs to exclude
    const existingPartnerIds = await this.getGymPartnerIds(userId);

    // Also exclude pending requests
    const pendingRequests = await this.db.gymPartner.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
        status: GymPartnerStatus.PENDING,
      },
      select: { requesterId: true, receiverId: true },
    });

    const excludeIds = new Set([userId, ...existingPartnerIds]);
    for (const p of pendingRequests) {
      excludeIds.add(p.requesterId);
      excludeIds.add(p.receiverId);
    }

    // Find users who share gyms
    const sharedGymUsers = await this.db.profile.findMany({
      where: {
        userId: { notIn: Array.from(excludeIds) },
        gyms: { some: { id: { in: userGymIds } } },
        user: { isActive: true },
      },
      take: limit,
      include: {
        user: { select: { id: true } },
        gyms: { select: { id: true, name: true } },
      },
    });

    // Filter out any profiles with missing user data
    const validProfiles = sharedGymUsers.filter((profile) => profile.user?.id);

    // Calculate mutual partners for each suggestion using batch query
    const suggestedUserIds = validProfiles.map((p) => p.user.id);
    const partnerIdsBatch = await this.getGymPartnerIdsBatch(suggestedUserIds);

    const suggestions: GymPartnerSuggestion[] = validProfiles.map((profile) => {
      const suggestedUserId = profile.user.id;
      const theirPartnerIds = partnerIdsBatch.get(suggestedUserId) ?? [];
      const mutualCount = existingPartnerIds.filter((id) =>
        theirPartnerIds.includes(id),
      ).length;

      const sharedGyms = profile.gyms.filter((g) => userGymIds.includes(g.id));

      return {
        user: {
          id: suggestedUserId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          gym: profile.gyms[0] || null,
        },
        sharedGyms,
        mutualPartners: mutualCount,
      };
    });

    // Sort by: shared gyms count, then mutual partners
    suggestions.sort((a, b) => {
      if (b.sharedGyms.length !== a.sharedGyms.length) {
        return b.sharedGyms.length - a.sharedGyms.length;
      }
      return b.mutualPartners - a.mutualPartners;
    });

    return { success: true, data: { suggestions } };
  }

  /**
   * Search for users by displayName or email (for finding partners outside gym)
   */
  async searchUsers(
    userId: string,
    query: SearchUsersQuery,
  ): Promise<SuccessResponse<{ results: SearchUserResult[] }>> {
    const { query: searchTerm, limit = 20 } = query;

    // Get current user's existing partners and pending requests
    const existingPartnerIds = await this.getGymPartnerIds(userId);

    const pendingRequests = await this.db.gymPartner.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
        status: GymPartnerStatus.PENDING,
      },
      select: { requesterId: true, receiverId: true },
    });

    const pendingUserIds = new Set<string>();
    for (const p of pendingRequests) {
      if (p.requesterId !== userId) pendingUserIds.add(p.requesterId);
      if (p.receiverId !== userId) pendingUserIds.add(p.receiverId);
    }

    // Search users by displayName or email (case-insensitive)
    const searchResults = await this.db.profile.findMany({
      where: {
        userId: { not: userId }, // Exclude self
        user: { isActive: true },
        OR: [
          { displayName: { contains: searchTerm, mode: 'insensitive' } },
          { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
        ],
      },
      take: limit,
      include: {
        user: { select: { id: true, email: true } },
        gyms: { select: { id: true, name: true } },
      },
    });

    // Build results with partner status and mutual partner counts
    // Filter out any profiles with missing user data
    const validProfiles = searchResults.filter((profile) => profile.user?.id);

    // Batch-load partner IDs for all search results in a single query
    const searchedUserIds = validProfiles.map((p) => p.user.id);
    const partnerIdsBatch = await this.getGymPartnerIdsBatch(searchedUserIds);

    const results: SearchUserResult[] = validProfiles.map((profile) => {
      const searchedUserId = profile.user.id;
      const isPartner = existingPartnerIds.includes(searchedUserId);
      const hasPendingRequest = pendingUserIds.has(searchedUserId);

      const theirPartnerIds = partnerIdsBatch.get(searchedUserId) ?? [];
      const mutualCount = existingPartnerIds.filter((id) =>
        theirPartnerIds.includes(id),
      ).length;

      return {
        user: {
          id: searchedUserId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          gym: profile.gyms[0] || null,
        },
        isPartner,
        hasPendingRequest,
        mutualPartners: mutualCount,
      };
    });

    // Sort: non-partners first, then by mutual partners count
    results.sort((a, b) => {
      // Partners at the end
      if (a.isPartner !== b.isPartner) return a.isPartner ? 1 : -1;
      // Pending requests next
      if (a.hasPendingRequest !== b.hasPendingRequest)
        return a.hasPendingRequest ? 1 : -1;
      // By mutual partners
      return b.mutualPartners - a.mutualPartners;
    });

    return { success: true, data: { results } };
  }

  /**
   * Get feed with mode support (partners, public, my_gym, momentum)
   */
  async getFeedWithMode(
    userId: string,
    query: ElevateFeedQueryExtended,
  ): Promise<SuccessResponse<ElevateFeedResponse>> {
    const {
      page = 1,
      limit = 20,
      type,
      userId: filterUserId,
      mode = 'PARTNERS',
    } = query;
    const skip = (page - 1) * limit;

    // Build visibility filter based on mode
    let userFilter: string[] = [];

    if (mode === 'PARTNERS') {
      // Get gym partners + self
      const partnerIds = await this.getGymPartnerIds(userId);
      userFilter = [userId, ...partnerIds];
    } else if (mode === 'MY_GYM') {
      // Get users at the same gym
      const userProfile = await this.db.profile.findUnique({
        where: { userId },
        include: { gyms: { select: { id: true } } },
      });

      if (userProfile && userProfile.gyms.length > 0) {
        const userGymIds = userProfile.gyms.map((g) => g.id);
        const sameGymProfiles = await this.db.profile.findMany({
          where: {
            gyms: { some: { id: { in: userGymIds } } },
          },
          select: { userId: true },
        });
        userFilter = sameGymProfiles.map((p) => p.userId);
      }
    }

    const where = {
      deletedAt: null,
      ...(type && { type }),
      ...(filterUserId && { userId: filterUserId }),
      ...(mode === 'PARTNERS' &&
        userFilter.length > 0 && { userId: { in: userFilter } }),
      ...(mode === 'PARTNERS' && {
        OR: [
          { privacy: PostPrivacy.PUBLIC },
          { privacy: PostPrivacy.FRIENDS },
          { userId },
        ],
      }),
      ...(mode === 'MY_GYM' &&
        userFilter.length > 0 && { userId: { in: userFilter } }),
      ...(mode === 'MY_GYM' && {
        OR: [
          { privacy: PostPrivacy.PUBLIC },
          { privacy: PostPrivacy.FRIENDS },
          { userId },
        ],
      }),
      ...(mode === 'PUBLIC' && {
        privacy: PostPrivacy.PUBLIC,
      }),
      ...(mode === 'MOMENTUM' && {
        privacy: PostPrivacy.PUBLIC,
        momentumScore: { gt: 0 }, // Only posts with calculated momentum
      }),
    };

    const orderBy =
      mode === 'MOMENTUM'
        ? { momentumScore: 'desc' as const } // Use pre-computed momentum score
        : { createdAt: 'desc' as const };

    const [posts, total] = await Promise.all([
      this.db.elevatePost.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  coverUrl: true,
                },
              },
            },
          },
          workoutSession: {
            include: {
              workouts: {
                include: {
                  sets: true,
                },
              },
            },
          },
          personalRecord: {
            include: {
              exercise: true,
            },
          },
          achievement: true,
          challenge: true,
          reactions: {
            where: { userId },
            take: 1,
          },
          savedBy: {
            where: { userId },
            take: 1,
          },
          comments: {
            where: { deletedAt: null, parentId: null },
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: {
              user: {
                include: {
                  profile: {
                    select: {
                      displayName: true,
                      avatarUrl: true,
                      coverUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.db.elevatePost.count({ where }),
    ]);

    const formattedPosts: ElevatePostResponse[] = posts.map((post) =>
      this.formatPostResponse(post, userId),
    );

    return {
      success: true,
      data: {
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + posts.length < total,
        },
      },
    };
  }

  /**
   * Get gym stats for user's gyms (partners training, peak hours, trending exercises)
   */
  async getGymStats(
    userId: string,
  ): Promise<SuccessResponse<GymStatsResponse>> {
    // Get user's gyms via their profile
    const userProfile = await this.db.profile.findUnique({
      where: { userId },
      select: {
        timezone: true,
        gyms: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const gymIds = userProfile?.gyms.map((g) => g.id) ?? [];
    const timezone = getEffectiveTimezone(userProfile?.timezone);

    if (gymIds.length === 0) {
      return {
        success: true,
        data: {
          trainingNow: [],
          peakHours: [],
          trendingExercises: [],
        },
      };
    }

    // Get users training now (active sessions at user's gyms) - including self
    const activeSessions = await this.db.workoutSession.findMany({
      where: {
        gymId: { in: gymIds },
        endedAt: null, // Only active sessions (not ended)
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
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
        workouts: {
          select: {
            exercise: {
              select: {
                name: true,
              },
            },
          },
          take: 1,
          orderBy: { created: 'desc' },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    // Format training now response
    const trainingNow: TrainingUser[] = activeSessions.map((session: any) => ({
      id: session.user.id,
      displayName:
        session.user.profile?.displayName || session.user.email.split('@')[0],
      avatarUrl: session.user.profile?.avatarUrl || null,
      gym: session.gym ? { id: session.gym.id, name: session.gym.name } : null,
      currentExercise: session.workouts[0]?.exercise?.name || null,
      sessionStartedAt: session.startedAt,
    }));

    // Get peak hours (aggregate session start times over last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSessions = await this.db.workoutSession.findMany({
      where: {
        gymId: { in: gymIds },
        startedAt: { gte: thirtyDaysAgo },
      },
      select: {
        startedAt: true,
      },
    });

    // Calculate peak hours
    const hourCounts: Record<number, number> = {};
    for (const session of recentSessions) {
      const hour = this.getHourInTimezone(session.startedAt, timezone);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    const peakHours: PeakHours[] = Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get trending exercises (most popular today at user's gyms)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayWorkouts = await this.db.workout.findMany({
      where: {
        session: {
          gymId: { in: gymIds },
          startedAt: { gte: today },
        },
      },
      select: {
        exerciseId: true,
        exercise: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Count exercises
    const exerciseCounts: Record<
      string,
      { id: string; name: string; count: number }
    > = {};
    for (const workout of todayWorkouts) {
      const exerciseId = workout.exerciseId;
      if (!exerciseCounts[exerciseId]) {
        exerciseCounts[exerciseId] = {
          id: exerciseId,
          name: workout.exercise.name,
          count: 0,
        };
      }
      exerciseCounts[exerciseId].count++;
    }

    const trendingExercises: TrendingExercise[] = Object.values(exerciseCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(({ id, name, count }) => ({ id, name, count }));

    return {
      success: true,
      data: {
        trainingNow,
        peakHours,
        trendingExercises,
      },
    };
  }
}
