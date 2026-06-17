import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { MailService } from '@app/common/mailer';
import { ConfigService } from '@nestjs/config';
import { BreachStatus, BreachSeverity } from '@generated/prisma';
import type { RecordBreachDto, UpdateBreachDto } from './dto/breach.dto';

// GDPR Art. 33: supervisory authority must be notified within 72 hours
const DPA_NOTIFY_DEADLINE_MS = 72 * 60 * 60 * 1000;

@Injectable()
export class BreachService {
  private readonly logger = new Logger(BreachService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async recordBreach(adminUserId: string, dto: RecordBreachDto) {
    const breach = await this.db.breachNotification.create({
      data: {
        reportedBy: adminUserId,
        severity: dto.severity,
        description: dto.description,
        dataCategories: dto.dataCategories,
        affectedCount: dto.affectedCount ?? null,
        detectedAt: new Date(dto.detectedAt),
        internalNotes: dto.internalNotes ?? null,
        status: BreachStatus.DETECTED,
      },
    });

    // Alert admin team immediately
    await this.notifyAdminTeam(breach);

    this.logger.warn(
      `[BREACH] New breach recorded id=${breach.id} severity=${breach.severity}`,
    );

    return { data: breach };
  }

  async updateBreach(id: string, dto: UpdateBreachDto) {
    const existing = await this.db.breachNotification.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Breach record not found');

    const updated = await this.db.breachNotification.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.internalNotes !== undefined && {
          internalNotes: dto.internalNotes,
        }),
        ...(dto.affectedCount !== undefined && {
          affectedCount: dto.affectedCount,
        }),
        ...(dto.containedAt !== undefined && {
          containedAt: new Date(dto.containedAt),
        }),
        ...(dto.dpaReference !== undefined && {
          dpaReference: dto.dpaReference,
        }),
      },
    });

    return { data: updated };
  }

  // Mark DPA notified — records the timestamp for the 72 h audit trail.
  async markDpaNotified(id: string) {
    const breach = await this.db.breachNotification.findUnique({
      where: { id },
    });
    if (!breach) throw new NotFoundException('Breach record not found');

    const hoursElapsed =
      (Date.now() - breach.detectedAt.getTime()) / (1000 * 60 * 60);

    const updated = await this.db.breachNotification.update({
      where: { id },
      data: {
        dpaNotifiedAt: new Date(),
        status: BreachStatus.NOTIFIED_DPA,
      },
    });

    if (hoursElapsed > 72) {
      this.logger.error(
        `[BREACH] DPA notified LATE for breach id=${id} — ${hoursElapsed.toFixed(1)}h after detection (72h limit exceeded)`,
      );
    }

    return { data: updated, hoursElapsed: Math.round(hoursElapsed) };
  }

  // Send breach notification emails to affected users and mark users notified.
  async notifyAffectedUsers(id: string, emails: string[]) {
    const breach = await this.db.breachNotification.findUnique({
      where: { id },
    });
    if (!breach) throw new NotFoundException('Breach record not found');
    if (emails.length === 0)
      throw new BadRequestException('No email addresses provided');

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'https://varaperformance.com';

    const failures: string[] = [];
    for (const email of emails) {
      try {
        await this.mail.sendBreachNotificationEmail({
          email,
          detectedAt: breach.detectedAt,
          dataCategories: breach.dataCategories,
          frontendUrl,
        });
      } catch (err) {
        this.logger.error(`Failed to send breach email to ${email}`, err);
        failures.push(email);
      }
    }

    if (failures.length < emails.length) {
      await this.db.breachNotification.update({
        where: { id },
        data: {
          usersNotifiedAt: new Date(),
          status: BreachStatus.NOTIFIED_USERS,
        },
      });
    }

    return {
      data: {
        sent: emails.length - failures.length,
        failed: failures.length,
        failedEmails: failures,
      },
    };
  }

  async listBreaches(filters?: {
    status?: BreachStatus;
    severity?: BreachSeverity;
    limit?: number;
  }) {
    const limit = Math.min(filters?.limit ?? 50, 100);
    const breaches = await this.db.breachNotification.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.severity && { severity: filters.severity }),
      },
      orderBy: { detectedAt: 'desc' },
      take: limit,
    });

    // Flag any breaches that are overdue for DPA notification
    const now = Date.now();
    const enriched = breaches.map((b) => ({
      ...b,
      dpaOverdue:
        !b.dpaNotifiedAt &&
        b.status !== BreachStatus.RESOLVED &&
        now - b.detectedAt.getTime() > DPA_NOTIFY_DEADLINE_MS,
      hoursUntilDpaDeadline: b.dpaNotifiedAt
        ? null
        : Math.max(
            0,
            Math.round(
              (DPA_NOTIFY_DEADLINE_MS - (now - b.detectedAt.getTime())) /
                (1000 * 60 * 60),
            ),
          ),
    }));

    return { data: enriched };
  }

  async getBreachById(id: string) {
    const breach = await this.db.breachNotification.findUnique({
      where: { id },
    });
    if (!breach) throw new NotFoundException('Breach record not found');

    const hoursElapsed =
      (Date.now() - breach.detectedAt.getTime()) / (1000 * 60 * 60);

    return {
      data: {
        ...breach,
        dpaOverdue: !breach.dpaNotifiedAt && hoursElapsed > 72,
        hoursElapsed: Math.round(hoursElapsed),
        hoursUntilDpaDeadline: breach.dpaNotifiedAt
          ? null
          : Math.max(0, Math.round(72 - hoursElapsed)),
      },
    };
  }

  private async notifyAdminTeam(breach: {
    id: string;
    severity: BreachSeverity;
    description: string;
    dataCategories: string[];
    detectedAt: Date;
  }) {
    const adminEmail = this.config.get<string>('ADMIN_ALERT_EMAIL');
    if (!adminEmail) return;

    try {
      await this.mail.sendBreachAlertEmail({
        email: adminEmail,
        breachId: breach.id,
        severity: breach.severity,
        description: breach.description,
        dataCategories: breach.dataCategories,
        detectedAt: breach.detectedAt,
        frontendUrl:
          this.config.get<string>('FRONTEND_URL') ??
          'https://varaperformance.com',
      });
    } catch (err) {
      this.logger.error('Failed to send breach alert to admin team', err);
    }
  }
}
