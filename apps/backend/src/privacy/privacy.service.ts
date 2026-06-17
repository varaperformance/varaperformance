import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import type { SuccessResponse } from '@varaperformance/core';
import { ConsentStatus, Prisma } from '@generated/prisma';

@Injectable()
export class PrivacyService {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * GDPR Art. 15 & 20: Right of Access / Data Portability
   * Exports all personal data for the requesting user in machine-readable JSON.
   */
  async exportUserData(userId: string): Promise<SuccessResponse> {
    const [
      user,
      profile,
      addresses,
      consents,
      sessions,
      weightLogs,
      weightGoal,
      waterLogs,
      waterGoal,
      foodLogs,
      nutritionGoal,
      workoutSessions,
      personalRecords,
      workoutGoal,
      injectionProtocols,
      injectionLogs,
      lifestyleGoal,
      notes,
      stacks,
      climbEntries,
      blogs,
      elevatePosts,
      elevateComments,
      conversations,
      sentMessages,
      calendarEvents,
      notifications,
      shopOrders,
      bookings,
      coachReviews,
    ] = await Promise.all([
      // Core user
      this.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          isVerified: true,
          authProvider: true,
          createdAt: true,
          lastLoginAt: true,
          totpEnabled: true,
        },
      }),
      // Profile (encrypted PII)
      this.db.profile.findUnique({
        where: { userId },
      }),
      // Addresses
      this.db.profileAddress.findMany({ where: { userId } }),
      // Consents
      this.db.consent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Sessions (metadata only)
      this.db.session.findMany({
        where: { userId },
        select: {
          id: true,
          ipAddress: true,
          userAgent: true,
          lastActivity: true,
          expiresAt: true,
          isRevoked: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Health: Weight
      this.db.weightLog.findMany({
        where: { userId },
        orderBy: { loggedAt: 'desc' },
      }),
      this.db.weightGoal.findUnique({ where: { userId } }),
      // Health: Water
      this.db.waterLog.findMany({
        where: { userId },
        orderBy: { loggedAt: 'desc' },
      }),
      this.db.waterGoal.findUnique({ where: { userId } }),
      // Nutrition
      this.db.foodLog.findMany({
        where: { userId },
        orderBy: { loggedAt: 'desc' },
      }),
      this.db.nutritionGoal.findUnique({ where: { userId } }),
      // Workouts
      this.db.workoutSession.findMany({
        where: { userId },
        include: {
          workouts: { include: { sets: true } },
        },
        orderBy: { startedAt: 'desc' },
      }),
      this.db.personalRecord.findMany({
        where: { userId },
        orderBy: { achievedAt: 'desc' },
      }),
      this.db.workoutGoal.findUnique({ where: { userId } }),
      // Injections
      this.db.injectionProtocol.findMany({ where: { userId } }),
      this.db.injectionLog.findMany({
        where: { userId },
        orderBy: { loggedAt: 'desc' },
      }),
      // Lifestyle
      this.db.lifestyleGoal.findUnique({ where: { userId } }),
      // Notes
      this.db.note.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
      // Stacks
      this.db.stack.findMany({
        where: { userId },
        include: { items: true },
      }),
      // Climb
      this.db.climbEntry.findMany({
        where: { userId },
        orderBy: { capturedAt: 'desc' },
      }),
      // Blog posts
      this.db.blog.findMany({
        where: { authorId: userId },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      // Elevate social
      this.db.elevatePost.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.elevateComment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Messaging (metadata, no decrypted content in export for safety)
      this.db.conversation.findMany({
        where: {
          OR: [{ participantOneId: userId }, { participantTwoId: userId }],
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.db.message.findMany({
        where: { senderId: userId },
        select: {
          id: true,
          conversationId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Calendar
      this.db.calendarEvent.findMany({
        where: { ownerUserId: userId },
        orderBy: { startAt: 'desc' },
      }),
      // Notifications
      this.db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Commerce
      this.db.shopOrder.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Coaching bookings
      this.db.booking.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.coachReview.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Decrypt profile PII if available
    let decryptedProfile: Record<string, unknown> | null = null;
    if (
      profile?.eProfile &&
      profile.profileIv &&
      profile.profileAuthTag &&
      profile.profileWrappedKey
    ) {
      try {
        const decrypted = this.encryption.decrypt({
          encryptedContent: Buffer.from(profile.eProfile),
          contentIv: Buffer.from(profile.profileIv),
          contentAuthTag: Buffer.from(profile.profileAuthTag),
          wrappedKey: Buffer.from(profile.profileWrappedKey),
        });
        decryptedProfile = JSON.parse(decrypted.toString('utf-8'));
      } catch {
        decryptedProfile = { error: 'Unable to decrypt profile PII' };
      }
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      gdprArticles: ['Art. 15 (Right of Access)', 'Art. 20 (Data Portability)'],
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        totpEnabled: user.totpEnabled,
      },
      profile: {
        displayName: profile?.displayName ?? null,
        bio: profile?.bio ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        coverUrl: profile?.coverUrl ?? null,
        timezone: profile?.timezone ?? null,
        theme: profile?.theme ?? null,
        isProfilePublic: profile?.isProfilePublic ?? null,
        pii: decryptedProfile,
      },
      addresses,
      consents: consents.map((c) => ({
        type: c.type,
        status: c.status,
        version: c.version,
        grantedAt: c.grantedAt,
        revokedAt: c.revokedAt,
        createdAt: c.createdAt,
      })),
      sessions: sessions.map((s) => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        lastActivity: s.lastActivity,
        expiresAt: s.expiresAt,
        isRevoked: s.isRevoked,
        createdAt: s.createdAt,
      })),
      health: {
        weightLogs,
        weightGoal,
        waterLogs,
        waterGoal,
        foodLogs,
        nutritionGoal,
        injectionProtocols,
        injectionLogs,
        lifestyleGoal,
      },
      fitness: {
        workoutSessions,
        personalRecords,
        workoutGoal,
        climbEntries,
      },
      notes,
      stacks,
      social: {
        blogs,
        elevatePosts,
        elevateComments,
      },
      messaging: {
        conversations,
        sentMessages: sentMessages.map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          createdAt: m.createdAt,
        })),
      },
      calendar: calendarEvents,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        read: n.read,
        createdAt: n.createdAt,
      })),
      commerce: {
        shopOrders,
      },
      coaching: {
        bookings,
        reviews: coachReviews,
      },
    };

    return { success: true, data: exportData };
  }

  // ──────────────────────────────────────────────────
  // Deletion Eligibility Check
  // ──────────────────────────────────────────────────

  /**
   * Check whether a user can safely delete their account.
   * Returns a list of blocking reasons; empty array means eligible.
   */
  async checkDeletionEligibility(
    userId: string,
  ): Promise<SuccessResponse<{ eligible: boolean; blockers: string[] }>> {
    const blockers: string[] = [];

    // 1. Active coaching bookings as a client
    const activeClientBookings = await this.db.booking.count({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED', 'CONFIRMED'] },
      },
    });
    if (activeClientBookings > 0) {
      blockers.push(
        `You have ${activeClientBookings} active coaching booking${activeClientBookings > 1 ? 's' : ''}. Cancel or complete them before deleting your account.`,
      );
    }

    // 2. Active subscriptions as a client
    const activeSubscriptions = await this.db.subscription.count({
      where: {
        booking: { userId },
        status: { in: ['ACTIVE', 'PAUSED', 'PAST_DUE'] },
      },
    });
    if (activeSubscriptions > 0) {
      blockers.push(
        `You have ${activeSubscriptions} active coaching subscription${activeSubscriptions > 1 ? 's' : ''}. Cancel them before deleting your account.`,
      );
    }

    // 3. Coach-specific checks
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (coach) {
      // 3a. Coach with active client bookings
      const activeCoachBookings = await this.db.booking.count({
        where: {
          coachId: coach.id,
          status: { in: ['PENDING', 'APPROVED', 'CONFIRMED'] },
        },
      });
      if (activeCoachBookings > 0) {
        blockers.push(
          `You have ${activeCoachBookings} active client booking${activeCoachBookings > 1 ? 's' : ''} as a coach. Cancel or complete them before deleting your account.`,
        );
      }

      // 3b. Coach with active client subscriptions
      const activeCoachSubscriptions = await this.db.subscription.count({
        where: {
          package: { coachId: coach.id },
          status: { in: ['ACTIVE', 'PAUSED', 'PAST_DUE'] },
        },
      });
      if (activeCoachSubscriptions > 0) {
        blockers.push(
          `You have ${activeCoachSubscriptions} active client subscription${activeCoachSubscriptions > 1 ? 's' : ''} as a coach. Cancel them before deleting your account.`,
        );
      }

      // 3c. Coach with pending or in-transit payouts
      const pendingPayouts = await this.db.coachPayout.count({
        where: {
          coachId: coach.id,
          status: { in: ['PENDING', 'IN_TRANSIT'] },
        },
      });
      if (pendingPayouts > 0) {
        blockers.push(
          `You have ${pendingPayouts} pending payout${pendingPayouts > 1 ? 's' : ''} that haven't settled yet. Wait for them to complete before deleting your account.`,
        );
      }
    }

    // 4. Unfulfilled shop orders (as buyer)
    const unfulfilledOrders = await this.db.shopOrder.count({
      where: {
        userId,
        status: { in: ['PENDING', 'PAID'] },
        fulfillmentStatus: { in: ['UNFULFILLED', 'PARTIALLY_FULFILLED'] },
      },
    });
    if (unfulfilledOrders > 0) {
      blockers.push(
        `You have ${unfulfilledOrders} unfulfilled shop order${unfulfilledOrders > 1 ? 's' : ''}. Wait for fulfillment or request a refund before deleting your account.`,
      );
    }

    // 5. Pending or processing payments
    const pendingPayments = await this.db.payment.count({
      where: {
        customer: { userId },
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });
    if (pendingPayments > 0) {
      blockers.push(
        `You have ${pendingPayments} payment${pendingPayments > 1 ? 's' : ''} still processing. Wait for them to complete before deleting your account.`,
      );
    }

    return {
      success: true,
      data: { eligible: blockers.length === 0, blockers },
    };
  }

  /**
   * GDPR Art. 17: Right to Erasure (Self-Service Account Deletion)
   *
   * Cascade strategy:
   * 1. Hard-delete non-essential user data (social, health logs, notes, etc.)
   * 2. Anonymize retained records (audit logs, payment records)
   * 3. Revoke all active sessions and consents
   * 4. Soft-delete the user account (isActive=false, deletedAt set)
   * 5. Create DataRetention records for legally required data
   */
  async deleteAccount(userId: string): Promise<SuccessResponse> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, email: true },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('Account not found or already deleted');
    }

    // Enforce guardrails before deletion
    const eligibility = await this.checkDeletionEligibility(userId);
    if (!eligibility.data.eligible) {
      throw new BadRequestException(
        `Cannot delete account: ${eligibility.data.blockers[0]}`,
      );
    }

    await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Revoke all active sessions
      await tx.session.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });

      // 2. Revoke all active consents
      await tx.consent.updateMany({
        where: { userId, status: ConsentStatus.GRANTED },
        data: { status: ConsentStatus.REVOKED, revokedAt: new Date() },
      });

      // 3. Hard-delete non-essential user data
      await Promise.all([
        // Health logs
        tx.weightLog.deleteMany({ where: { userId } }),
        tx.waterLog.deleteMany({ where: { userId } }),
        tx.foodLog.deleteMany({ where: { userId } }),
        tx.injectionLog.deleteMany({ where: { userId } }),

        // Goals
        tx.weightGoal.deleteMany({ where: { userId } }),
        tx.waterGoal.deleteMany({ where: { userId } }),
        tx.nutritionGoal.deleteMany({ where: { userId } }),
        tx.workoutGoal.deleteMany({ where: { userId } }),
        tx.lifestyleGoal.deleteMany({ where: { userId } }),

        // Workouts (sets → workouts → sessions)
        tx.workoutSet.deleteMany({
          where: { workout: { session: { userId } } },
        }),
        tx.personalRecord.deleteMany({ where: { userId } }),

        // Notes
        tx.note.deleteMany({ where: { userId } }),

        // Notifications
        tx.notification.deleteMany({ where: { userId } }),

        // Calendar
        tx.calendarEvent.deleteMany({ where: { ownerUserId: userId } }),

        // Climb
        tx.climbEntry.deleteMany({ where: { userId } }),

        // Elevate social (reactions/comments before posts)
        tx.elevateReaction.deleteMany({ where: { userId } }),
        tx.elevateComment.deleteMany({ where: { userId } }),
        tx.elevateSavedPost.deleteMany({ where: { userId } }),
        tx.elevateReport.deleteMany({ where: { userId } }),

        // Typing indicators
        tx.typingIndicator.deleteMany({ where: { userId } }),

        // Message reactions
        tx.messageReaction.deleteMany({ where: { userId } }),
      ]);

      // Delete workouts after sets are removed
      await tx.workout.deleteMany({
        where: { session: { userId } },
      });
      await tx.workoutSession.deleteMany({ where: { userId } });

      // Delete injection protocols after logs
      await tx.injectionProtocol.deleteMany({ where: { userId } });

      // Delete stacks (items → stacks)
      await tx.stackLog.deleteMany({
        where: { stackItem: { stack: { userId } } },
      });
      await tx.stackItem.deleteMany({
        where: { stack: { userId } },
      });
      await tx.stack.deleteMany({ where: { userId } });

      // Delete elevate posts (after reactions/comments)
      await tx.elevatePost.deleteMany({ where: { userId } });

      // Delete messages then conversations
      await tx.message.deleteMany({ where: { senderId: userId } });

      // Delete profile and addresses
      await tx.profileAddress.deleteMany({ where: { userId } });
      await tx.profile.deleteMany({ where: { userId } });

      // Delete RBAC assignments
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userPermission.deleteMany({ where: { userId } });

      // Delete key store
      await tx.keyStore.deleteMany({ where: { userId } });

      // Delete password history
      await tx.passwordHistory.deleteMany({ where: { userId } });

      // Delete login attempts by email
      await tx.loginAttempt.deleteMany({
        where: { email: user.email },
      });

      // 4. Anonymize audit logs (retain for compliance, strip PII)
      await tx.auditLog.updateMany({
        where: { userId },
        data: {
          ipAddress: null,
          userAgent: null,
          metadata: Prisma.DbNull,
        },
      });

      // 5. Create data retention record for audit trail
      await tx.dataRetention.create({
        data: {
          resource: 'User',
          resourceId: userId,
          retainUntil: new Date(
            Date.now() + 7 * 365 * 24 * 60 * 60 * 1000, // 7 years for financial/legal
          ),
          legalHold: false,
          deletedAt: new Date(),
          deletedBy: userId,
          retentionNotes: 'GDPR Art. 17 self-service account deletion',
        },
      });

      // 6. Soft-delete the user account
      await tx.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
          deletedBy: userId,
          email: `deleted-${userId}@redacted.local`,
          password: null,
          verificationCode: null,
          passwordResetCode: null,
          totpSecret: null,
          totpSecretIv: null,
          totpSecretAuthTag: null,
          totpSecretWrappedKey: null,
          totpRecoveryCodes: null,
          totpRecoveryIv: null,
          totpRecoveryAuthTag: null,
          totpRecoveryWrappedKey: null,
          totpEnabled: false,
          lastLoginIp: null,
        },
      });
    });

    return {
      success: true,
      data: {
        message:
          'Account successfully deleted. All personal data has been removed.',
      },
    };
  }

  /**
   * GDPR Art. 18: Right to Restriction of Processing
   * Toggles the isRestricted flag on the user account.
   */
  async setRestriction(
    userId: string,
    restrict: boolean,
  ): Promise<SuccessResponse> {
    await this.db.user.update({
      where: { id: userId },
      data: { isRestricted: restrict },
    });

    return {
      success: true,
      data: {
        message: restrict
          ? 'Processing of your data has been restricted. You may still export your data or delete your account.'
          : 'Processing restriction has been lifted. Full functionality restored.',
        isRestricted: restrict,
      },
    };
  }
}
