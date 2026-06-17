import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailerService } from "@nestjs-modules/mailer";
import { generateUnsubscribeToken } from "./unsubscribe-token";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

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
      this.configService.get<string>("FRONTEND_URL") ||
      "https://varaperformance.com";
    const notifications = params.notifications.map((n) => ({
      ...n,
      actionUrl: n.actionUrl
        ? n.actionUrl.startsWith("http")
          ? n.actionUrl
          : `${siteUrl}${n.actionUrl}`
        : null,
    }));
    try {
      await this.mailerService.sendMail({
        to: params.email,
        subject: `You have ${params.unreadCount} unread notification${params.unreadCount === 1 ? "" : "s"}`,
        template: "notification-digest",
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
    };
  }): Promise<void> {
    const unsub = this.unsubscribeContext(params.userId);
    try {
      await this.mailerService.sendMail({
        to: params.email,
        subject: "Your Weekly Progress Report - Vara Performance",
        template: "weekly-report",
        context: {
          name: params.name || null,
          ...params.report,
          hasNutrition:
            params.report.caloriesAvg !== null ||
            params.report.proteinAvg !== null,
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

  private unsubscribeContext(userId?: string): {
    context: Record<string, string>;
    headers: Record<string, string>;
  } {
    if (!userId) return { context: {}, headers: {} };
    const secret = this.configService.get<string>("JWT_SECRET");
    if (!secret) return { context: {}, headers: {} };
    const baseUrl =
      this.configService.get<string>("FRONTEND_URL") ||
      "https://varaperformance.com";
    const token = generateUnsubscribeToken(userId, secret);
    const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
    const preferencesUrl = `${baseUrl}/elevate/studio?section=settings`;
    return {
      context: { unsubscribeUrl, preferencesUrl },
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };
  }
}
