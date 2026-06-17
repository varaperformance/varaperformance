import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { AchievementsService } from '../achievements/achievements.service';
import { NotificationService } from '../notification/notification.service';
import type {
  CreateChallenge,
  UpdateChallenge,
  AdminUpdateChallenge,
  ChallengeQuery,
  ChallengeResponse,
  ChallengeParticipantResponse,
  ChallengeLeaderboardEntry,
} from '@varaperformance/core';
import {
  challengeSelect,
  challengeParticipantSelect,
} from './selectors/challenge.selector';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly achievementsService: AchievementsService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new challenge (community or admin/official)
   */
  async create(
    userId: string,
    data: CreateChallenge,
    isOfficial = false,
  ): Promise<{ data: ChallengeResponse }> {
    const challenge = await this.db.challenge.create({
      data: {
        creatorId: userId,
        title: data.title,
        description: data.description,
        type: data.type,
        visibility: data.visibility ?? 'PUBLIC',
        isOfficial,
        goalValue: data.goalValue,
        goalUnit: data.goalUnit,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        maxParticipants: data.maxParticipants,
        status: isOfficial ? 'DRAFT' : 'UPCOMING',
      },
      select: challengeSelect,
    });

    // Award "create-challenge" achievement
    const createdCount = await this.db.challenge.count({
      where: { creatorId: userId },
    });
    this.achievementsService
      .checkAndAward(userId, 'SOCIAL', createdCount, 'create-challenge')
      .catch(() => {});

    return { data: this.formatChallengeResponse(challenge) };
  }

  /**
   * List challenges with filtering
   */
  async findAll(
    query: ChallengeQuery,
    userId?: string,
  ): Promise<{
    data: { items: ChallengeResponse[]; total: number; page: number };
  }> {
    const { page, limit, status, type, isOfficial } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      visibility: 'PUBLIC',
    };
    if (status) where.status = status;
    else where.status = { in: ['UPCOMING', 'ACTIVE', 'COMPLETED'] };
    if (type) where.type = type;
    if (isOfficial !== undefined) where.isOfficial = isOfficial;

    const [challenges, total] = await Promise.all([
      this.db.challenge.findMany({
        where,
        select: {
          ...challengeSelect,
          participants: userId
            ? {
                where: { userId },
                select: { status: true, progress: true },
                take: 1,
              }
            : false,
        },
        orderBy: [{ isOfficial: 'desc' }, { startDate: 'asc' }],
        skip,
        take: limit,
      }),
      this.db.challenge.count({ where }),
    ]);

    const items = challenges.map((c) => {
      const participation = (c as any).participants?.[0];
      return {
        ...this.formatChallengeResponse(c),
        isParticipant: !!participation,
        myProgress: participation?.progress,
      };
    });

    return { data: { items, total, page } };
  }

  /**
   * Get challenges created by or joined by the current user
   */
  async findMyChallenges(userId: string): Promise<{
    data: { created: ChallengeResponse[]; joined: ChallengeResponse[] };
  }> {
    const [created, joined] = await Promise.all([
      this.db.challenge.findMany({
        where: { creatorId: userId },
        select: challengeSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.challenge.findMany({
        where: {
          participants: { some: { userId } },
        },
        select: {
          ...challengeSelect,
          participants: {
            where: { userId },
            select: { status: true, progress: true },
            take: 1,
          },
        },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    return {
      data: {
        created: created.map((c) => this.formatChallengeResponse(c)),
        joined: joined.map((c) => {
          const participation = (c as any).participants?.[0];
          return {
            ...this.formatChallengeResponse(c),
            isParticipant: true,
            myProgress: participation?.progress,
          };
        }),
      },
    };
  }

  /**
   * Get a single challenge by ID
   */
  async findOne(
    id: string,
    userId?: string,
  ): Promise<{ data: ChallengeResponse }> {
    const challenge = await this.db.challenge.findUnique({
      where: { id },
      select: {
        ...challengeSelect,
        participants: userId
          ? {
              where: { userId },
              select: { status: true, progress: true },
              take: 1,
            }
          : false,
      },
    });

    if (!challenge) throw new NotFoundException('Challenge not found');

    const participation = (challenge as any).participants?.[0];
    return {
      data: {
        ...this.formatChallengeResponse(challenge),
        isParticipant: !!participation,
        myProgress: participation?.progress,
      },
    };
  }

  /**
   * Update a challenge (owner only, or admin via separate endpoint)
   */
  async update(
    id: string,
    userId: string,
    data: UpdateChallenge,
  ): Promise<{ data: ChallengeResponse }> {
    const existing = await this.db.challenge.findUnique({
      where: { id },
      select: { creatorId: true, status: true },
    });

    if (!existing) throw new NotFoundException('Challenge not found');
    if (existing.creatorId !== userId)
      throw new ForbiddenException(
        'Only the creator can update this challenge',
      );
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED')
      throw new BadRequestException(
        'Cannot update a completed or cancelled challenge',
      );

    const challenge = await this.db.challenge.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      select: challengeSelect,
    });

    return { data: this.formatChallengeResponse(challenge) };
  }

  /**
   * Admin update — can set isOfficial, force status changes
   */
  async adminUpdate(
    id: string,
    data: AdminUpdateChallenge,
  ): Promise<{ data: ChallengeResponse }> {
    const existing = await this.db.challenge.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Challenge not found');

    const challenge = await this.db.challenge.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      select: challengeSelect,
    });

    return { data: this.formatChallengeResponse(challenge) };
  }

  /**
   * Delete a challenge (owner or admin)
   */
  async remove(id: string, userId: string, isAdmin = false): Promise<void> {
    const existing = await this.db.challenge.findUnique({
      where: { id },
      select: { creatorId: true, participantCount: true },
    });

    if (!existing) throw new NotFoundException('Challenge not found');
    if (!isAdmin && existing.creatorId !== userId)
      throw new ForbiddenException(
        'Only the creator can delete this challenge',
      );

    await this.db.challenge.delete({ where: { id } });
  }

  /**
   * Register (join) a challenge
   */
  async join(
    challengeId: string,
    userId: string,
  ): Promise<{ data: { joined: boolean } }> {
    const challenge = await this.db.challenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        status: true,
        maxParticipants: true,
        participantCount: true,
        visibility: true,
        creatorId: true,
        title: true,
      },
    });

    if (!challenge) throw new NotFoundException('Challenge not found');
    if (challenge.status !== 'UPCOMING' && challenge.status !== 'ACTIVE')
      throw new BadRequestException(
        'This challenge is not accepting participants',
      );
    if (
      challenge.maxParticipants &&
      challenge.participantCount >= challenge.maxParticipants
    )
      throw new BadRequestException('This challenge is full');

    const existing = await this.db.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });
    if (existing)
      throw new BadRequestException('Already registered for this challenge');

    await this.db.$transaction([
      this.db.challengeParticipant.create({
        data: {
          challengeId,
          userId,
          status: challenge.status === 'ACTIVE' ? 'ACTIVE' : 'REGISTERED',
        },
      }),
      this.db.challenge.update({
        where: { id: challengeId },
        data: { participantCount: { increment: 1 } },
      }),
    ]);

    // Award "participated in challenge" achievement
    const participationCount = await this.db.challengeParticipant.count({
      where: { userId },
    });
    this.achievementsService
      .checkAndAward(
        userId,
        'SOCIAL',
        participationCount,
        'challenge-participant',
      )
      .catch(() => {});

    // Notify challenge creator
    if (challenge.creatorId !== userId) {
      this.notificationService
        .create({
          userId: challenge.creatorId,
          type: 'CHALLENGE_JOINED',
          title: 'New Challenger!',
          body: `Someone joined your challenge "${challenge.title}"`,
          actionUrl: `/challenges/${challengeId}`,
          data: { challengeId },
        })
        .catch(() => {});
    }

    return { data: { joined: true } };
  }

  /**
   * Withdraw from a challenge
   */
  async withdraw(
    challengeId: string,
    userId: string,
  ): Promise<{ data: { withdrawn: boolean } }> {
    const participant = await this.db.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });

    if (!participant)
      throw new NotFoundException('Not registered for this challenge');
    if (participant.status === 'COMPLETED')
      throw new BadRequestException(
        'Cannot withdraw from a completed challenge',
      );

    await this.db.$transaction([
      this.db.challengeParticipant.update({
        where: { id: participant.id },
        data: { status: 'WITHDRAWN' },
      }),
      this.db.challenge.update({
        where: { id: challengeId },
        data: { participantCount: { decrement: 1 } },
      }),
    ]);

    return { data: { withdrawn: true } };
  }

  /**
   * Update participant progress
   */
  async updateProgress(
    challengeId: string,
    userId: string,
    progress: number,
  ): Promise<{ data: { progress: number; completed: boolean } }> {
    const challenge = await this.db.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true, goalValue: true, status: true, title: true },
    });

    if (!challenge) throw new NotFoundException('Challenge not found');
    if (challenge.status !== 'ACTIVE')
      throw new BadRequestException('Challenge is not active');

    const participant = await this.db.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });

    if (!participant)
      throw new NotFoundException('Not registered for this challenge');
    if (participant.status === 'COMPLETED')
      throw new BadRequestException('Already completed this challenge');
    if (participant.status === 'WITHDRAWN')
      throw new BadRequestException('Withdrawn from this challenge');

    const completed = progress >= challenge.goalValue;

    await this.db.challengeParticipant.update({
      where: { id: participant.id },
      data: {
        progress,
        status: completed ? 'COMPLETED' : 'ACTIVE',
        completedAt: completed ? new Date() : null,
      },
    });

    if (completed) {
      this.notificationService
        .create({
          userId,
          type: 'CHALLENGE_COMPLETED',
          title: 'Challenge Completed!',
          body: `You completed the "${challenge.title}" challenge!`,
          actionUrl: `/challenges/${challengeId}`,
          data: { challengeId },
        })
        .catch(() => {});
    }

    return { data: { progress, completed } };
  }

  /**
   * Get leaderboard for a challenge
   */
  async getLeaderboard(
    challengeId: string,
  ): Promise<{ data: { items: ChallengeLeaderboardEntry[] } }> {
    const challenge = await this.db.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const participants = await this.db.challengeParticipant.findMany({
      where: {
        challengeId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      select: challengeParticipantSelect,
      orderBy: [{ progress: 'desc' }, { completedAt: 'asc' }],
      take: 100,
    });

    const items: ChallengeLeaderboardEntry[] = participants.map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      displayName: p.user.profile?.displayName ?? null,
      avatarUrl: p.user.profile?.avatarUrl ?? null,
      progress: p.progress,
      completedAt: p.completedAt?.toISOString() ?? null,
    }));

    return { data: { items } };
  }

  /**
   * Get participants for a challenge
   */
  async getParticipants(
    challengeId: string,
  ): Promise<{ data: { items: ChallengeParticipantResponse[] } }> {
    const challenge = await this.db.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const participants = await this.db.challengeParticipant.findMany({
      where: { challengeId },
      select: challengeParticipantSelect,
      orderBy: { joinedAt: 'desc' },
    });

    const items: ChallengeParticipantResponse[] = participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      displayName: p.user.profile?.displayName ?? null,
      avatarUrl: p.user.profile?.avatarUrl ?? null,
      status: p.status,
      progress: p.progress,
      completedAt: p.completedAt?.toISOString() ?? null,
      joinedAt: p.joinedAt.toISOString(),
    }));

    return { data: { items } };
  }

  /**
   * Admin: List all challenges (including draft, private)
   */
  async adminFindAll(query: ChallengeQuery): Promise<{
    data: { items: ChallengeResponse[]; total: number; page: number };
  }> {
    const { page, limit, status, type, isOfficial } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (isOfficial !== undefined) where.isOfficial = isOfficial;

    const [challenges, total] = await Promise.all([
      this.db.challenge.findMany({
        where,
        select: challengeSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.challenge.count({ where }),
    ]);

    return {
      data: {
        items: challenges.map((c) => this.formatChallengeResponse(c)),
        total,
        page,
      },
    };
  }

  /**
   * Share a challenge to Elevate as a CHALLENGE post
   */
  async shareToElevate(
    userId: string,
    challengeId: string,
  ): Promise<{ postId: string }> {
    const participant = await this.db.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
      include: { challenge: true },
    });

    if (!participant) {
      throw new NotFoundException(
        'You must be a participant to share this challenge',
      );
    }

    const existing = await this.db.elevatePost.findFirst({
      where: { userId, challengeId, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException(
        'This challenge has already been shared to Elevate',
      );
    }

    const challenge = participant.challenge;
    const post = await this.db.elevatePost.create({
      data: {
        userId,
        type: 'CHALLENGE',
        content: `I joined the "${challenge.title}" challenge! Goal: ${challenge.goalValue} ${challenge.goalUnit}. ${challenge.description}`,
        images: [],
        privacy: 'PUBLIC',
        challengeId,
      },
      select: { id: true },
    });

    return { postId: post.id };
  }

  private formatChallengeResponse(challenge: any): ChallengeResponse {
    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      coverImage: challenge.coverImage,
      type: challenge.type,
      status: challenge.status,
      visibility: challenge.visibility,
      isOfficial: challenge.isOfficial,
      goalValue: challenge.goalValue,
      goalUnit: challenge.goalUnit,
      startDate: challenge.startDate.toISOString(),
      endDate: challenge.endDate.toISOString(),
      maxParticipants: challenge.maxParticipants,
      participantCount: challenge.participantCount,
      creator: {
        id: challenge.creator.id,
        displayName: challenge.creator.profile?.displayName ?? null,
        avatarUrl: challenge.creator.profile?.avatarUrl ?? null,
      },
      createdAt: challenge.createdAt.toISOString(),
    };
  }
}
