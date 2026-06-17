import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { generateUnsubscribeToken } from '../../../../src/consent/unsubscribe-token';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send email verification code
   */
  async sendVerificationEmail(
    email: string,
    code: string,
    name?: string,
    userId?: string,
  ): Promise<void> {
    const unsub = this.unsubscribeContext(userId);
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Verify your email - Vara Performance',
        template: 'verification',
        context: {
          name: name || 'there',
          code,
          year: new Date().getFullYear(),
          ...unsub.context,
        },
        headers: unsub.headers,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  /**
   * Send password reset code
   */
  async sendPasswordResetEmail(
    email: string,
    code: string,
    name?: string,
    userId?: string,
  ): Promise<void> {
    const unsub = this.unsubscribeContext(userId);
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset your password - Vara Performance',
        template: 'password-reset',
        context: {
          name: name || 'there',
          code,
          expiresIn: '15 minutes',
          year: new Date().getFullYear(),
          ...unsub.context,
        },
        headers: unsub.headers,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send welcome email after registration
   */
  async sendWelcomeEmail(
    email: string,
    name?: string,
    userId?: string,
  ): Promise<void> {
    const unsub = this.unsubscribeContext(userId);
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to Vara Performance!',
        template: 'welcome',
        context: {
          name: name || 'there',
          year: new Date().getFullYear(),
          ...unsub.context,
        },
        headers: unsub.headers,
      });
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error);
      throw error;
    }
  }

  /**
   * Send password changed confirmation
   */
  async sendPasswordChangedEmail(
    email: string,
    name?: string,
    userId?: string,
  ): Promise<void> {
    const unsub = this.unsubscribeContext(userId);
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password changed - Vara Performance',
        template: 'password-changed',
        context: {
          name: name || 'there',
          year: new Date().getFullYear(),
          ...unsub.context,
        },
        headers: unsub.headers,
      });
      this.logger.log(`Password changed email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password changed email to ${email}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send contact form submission to support
   */
  async sendContactFormEmail(params: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
    const to = process.env.CONTACT_EMAIL || 'support@varaperformance.com';

    try {
      await this.mailerService.sendMail({
        to,
        replyTo: params.email,
        subject: `Contact form: ${params.subject}`,
        template: 'contact-form',
        context: {
          name: params.name,
          email: params.email,
          subject: params.subject,
          message: params.message,
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`Contact form email sent (from ${params.email})`);
    } catch (error) {
      this.logger.error(
        `Failed to send contact form email from ${params.email}`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  /**
   * Send booking approval notification
   */
  async sendBookingApprovedEmail(params: {
    email: string;
    name?: string;
    coachName: string;
    coachTitle?: string;
    coachAvatarUrl?: string;
    packageName: string;
    packagePrice: string;
    bookingId: string;
    userId?: string;
  }): Promise<void> {
    const siteUrl = process.env.FRONTEND_URL || 'https://varaperformance.com';
    const paymentUrl = `${siteUrl}/my-coaching?pay=${params.bookingId}`;
    const unsub = this.unsubscribeContext(params.userId);

    try {
      await this.mailerService.sendMail({
        to: params.email,
        subject: `Your coaching request with ${params.coachName} is approved!`,
        template: 'booking-approved',
        context: {
          name: params.name || 'there',
          coachName: params.coachName,
          coachTitle: params.coachTitle || 'Coach',
          coachAvatarUrl: params.coachAvatarUrl,
          packageName: params.packageName,
          packagePrice: params.packagePrice,
          paymentUrl,
          siteUrl,
          year: new Date().getFullYear(),
          ...unsub.context,
        },
        headers: unsub.headers,
      });
      this.logger.log(`Booking approved email sent to ${params.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send booking approved email to ${params.email}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send a notification digest email summarizing unread notifications.
   */
  async sendNotificationDigestEmail(params: {
    email: string;
    name?: string;
    userId: string;
    unreadCount: number;
    notifications: Array<{
      title: string;
      body: string;
      actionUrl?: string | null;
    }>;
  }): Promise<void> {
    const unsub = this.unsubscribeContext(params.userId);
    const siteUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://varaperformance.com';

    // Make action URLs absolute
    const notifications = params.notifications.map((n) => ({
      ...n,
      actionUrl: n.actionUrl
        ? n.actionUrl.startsWith('http')
          ? n.actionUrl
          : `${siteUrl}${n.actionUrl}`
        : null,
    }));

    try {
      await this.mailerService.sendMail({
        to: params.email,
        subject: `You have ${params.unreadCount} unread notification${params.unreadCount === 1 ? '' : 's'}`,
        template: 'notification-digest',
        context: {
          name: params.name || null,
          unreadCount: params.unreadCount,
          pluralize: params.unreadCount !== 1,
          notifications,
          year: new Date().getFullYear(),
          ...unsub.context,
        },
        headers: unsub.headers,
      });
      this.logger.log(`Digest email sent to ${params.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send digest email to ${params.email}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send weekly progress report email
   */
  async sendWeeklyReportEmail(params: {
    email: string;
    name?: string;
    userId: string;
    report: {
      workoutsLogged: number;
      personalRecords: number;
      waterGoalDaysHit: number;
      habitsCompleted: number;
      currentHabitStreak: number;
      caloriesAvg: number | null;
      proteinAvg: number | null;
      carbsAvg: number | null;
      fatsAvg: number | null;
      nutritionLoggedDays: number;
      workoutDurationMinutes: number;
      totalVolume: number;
      muscleGroupsTrained: number;
      habitCompletionPercent: number | null;
      measurementDeltas: {
        waist: number | null;
        chest: number | null;
        hips: number | null;
      } | null;
      achievementsEarned: number;
      activeChallenges: number;
      avgDailySteps: number | null;
      stepGoalDaysHit: number;
    };
  }): Promise<void> {
    const unsub = this.unsubscribeContext(params.userId);
    const motivationalQuote = this.getWeeklyQuote();

    const report = params.report;
    const hasMeasurementDeltas =
      report.measurementDeltas !== null &&
      (report.measurementDeltas.waist !== null ||
        report.measurementDeltas.chest !== null ||
        report.measurementDeltas.hips !== null);

    try {
      await this.mailerService.sendMail({
        to: params.email,
        subject: 'Your Weekly Progress Report - Vara Performance',
        template: 'weekly-report',
        context: {
          name: params.name || null,
          ...report,
          hasNutrition:
            report.caloriesAvg !== null || report.proteinAvg !== null,
          hasWorkoutSummary:
            report.workoutDurationMinutes > 0 || report.totalVolume > 0,
          hasMeasurementDeltas,
          waistDelta: report.measurementDeltas?.waist,
          chestDelta: report.measurementDeltas?.chest,
          hipsDelta: report.measurementDeltas?.hips,
          hasSteps: report.avgDailySteps !== null && report.avgDailySteps > 0,
          hasAchievements: report.achievementsEarned > 0,
          hasChallenges: report.activeChallenges > 0,
          totalVolumeFormatted: report.totalVolume.toLocaleString(),
          motivationalQuote,
          year: new Date().getFullYear(),
          ...unsub.context,
        },
        headers: unsub.headers,
      });
      this.logger.log(`Weekly report email sent to ${params.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send weekly report email to ${params.email}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send a newsletter email to a subscriber.
   */
  async sendNewsletterEmail(params: {
    email: string;
    name?: string;
    userId: string;
    subject: string;
    content: string;
  }): Promise<void> {
    const unsub = this.unsubscribeContext(params.userId);
    try {
      await this.mailerService.sendMail({
        to: params.email,
        subject: params.subject,
        template: 'newsletter',
        context: {
          name: params.name || null,
          content: params.content,
          year: new Date().getFullYear(),
          ...unsub.context,
        },
        headers: unsub.headers,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send newsletter to ${params.email}`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  private static readonly WEEKLY_QUOTES = [
    'Keep pushing forward — consistency beats perfection. See you next week!',
    'Small daily improvements over time lead to stunning results.',
    "You don't have to be extreme, just consistent.",
    'Progress is progress, no matter how small. Keep showing up!',
    "The only bad workout is the one that didn't happen.",
    'Discipline is choosing between what you want now and what you want most.',
    "Your body can stand almost anything. It's your mind you have to convince.",
    "Success isn't always about greatness. It's about consistency.",
    'Every rep counts. Every glass of water counts. Every habit check-in counts.',
    "The secret of getting ahead is getting started. You've got this!",
  ];

  private getWeeklyQuote(): string {
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    return MailService.WEEKLY_QUOTES[
      weekNumber % MailService.WEEKLY_QUOTES.length
    ];
  }

  /**
   * Build unsubscribe URL and List-Unsubscribe headers for a user.
   * Returns empty object when userId is not provided (e.g. admin emails).
   */
  private unsubscribeContext(userId?: string): {
    context: Record<string, string>;
    headers: Record<string, string>;
  } {
    if (!userId) return { context: {}, headers: {} };

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) return { context: {}, headers: {} };

    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://varaperformance.com';
    const token = generateUnsubscribeToken(userId, secret);
    const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
    const preferencesUrl = `${baseUrl}/elevate/studio?section=settings`;

    return {
      context: { unsubscribeUrl, preferencesUrl },
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };
  }

  // GDPR Art. 33 — Internal alert to the admin team when a breach is recorded.
  async sendBreachAlertEmail(params: {
    email: string;
    breachId: string;
    severity: string;
    description: string;
    dataCategories: string[];
    detectedAt: Date;
    frontendUrl: string;
  }): Promise<void> {
    const detectedAtFormatted = params.detectedAt.toUTCString();
    const dpaDeadline = new Date(
      params.detectedAt.getTime() + 72 * 60 * 60 * 1000,
    );
    try {
      await this.mailerService.sendMail({
        to: params.email,
        subject: `[ACTION REQUIRED] Data Breach Recorded — Severity: ${params.severity}`,
        template: 'breach-alert',
        context: {
          breachId: params.breachId,
          severity: params.severity,
          severityClass: params.severity.toLowerCase(),
          description: params.description,
          dataCategories: params.dataCategories.join(', '),
          detectedAtFormatted,
          dpaDeadlineFormatted: dpaDeadline.toUTCString(),
          adminUrl: `${params.frontendUrl}/admin/breach/${params.breachId}`,
          year: new Date().getFullYear(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to send breach alert email', error);
      throw error;
    }
  }

  // GDPR Art. 34 — User-facing breach notification email.
  async sendBreachNotificationEmail(params: {
    email: string;
    detectedAt: Date;
    dataCategories: string[];
    frontendUrl: string;
  }): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: params.email,
        subject: 'Important: Security Notice from Vara Performance',
        template: 'breach-notification',
        context: {
          detectedAtFormatted: params.detectedAt.toUTCString(),
          dataCategories: params.dataCategories,
          frontendUrl: params.frontendUrl,
          year: new Date().getFullYear(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send breach notification to ${params.email}`,
        error,
      );
      throw error;
    }
  }
}
