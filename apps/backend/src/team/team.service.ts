import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { NotificationService } from '../notification/notification.service';
import {
  ApplyAmbassadorDto,
  CreateTeamMemberDto,
  UpdateTeamMemberDto,
} from './dto/team.dto';
import {
  publicTeamMemberSelect,
  adminTeamMemberSelect,
  adminAmbassadorApplicationSelect,
  ambassadorApprovalLookupSelect,
} from './selectors/team.selector';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationService: NotificationService,
  ) {}

  // ── Public ──

  async getTeamMembers() {
    const members = await this.db.teamMember.findMany({
      where: { isVisible: true },
      orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
      select: publicTeamMemberSelect,
    });

    const core = members.filter((m) => m.role === 'CORE');
    const ambassadors = members.filter((m) => m.role === 'AMBASSADOR');

    return { success: true, data: { core, ambassadors } };
  }

  // ── Ambassador Application ──

  async applyAsAmbassador(userId: string, dto: ApplyAmbassadorDto) {
    // Check for existing pending application
    const existing = await this.db.ambassadorApplication.findFirst({
      where: { userId, status: 'PENDING' },
    });
    if (existing) {
      throw new ConflictException('You already have a pending application');
    }

    const application = await this.db.ambassadorApplication.create({
      data: {
        userId,
        reason: dto.reason,
        contribution: dto.contribution,
        audience: dto.audience,
      },
    });

    this.logger.log(`Ambassador application created: ${application.id}`);
    return { success: true, data: application };
  }

  // ── Admin: Team Members ──

  async getAdminTeamMembers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.db.teamMember.findMany({
        skip,
        take: limit,
        orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
        select: adminTeamMemberSelect,
      }),
      this.db.teamMember.count(),
    ]);

    return {
      success: true,
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createTeamMember(dto: CreateTeamMemberDto) {
    const existing = await this.db.teamMember.findUnique({
      where: { userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException('This user is already a team member');
    }

    const member = await this.db.teamMember.create({
      data: {
        userId: dto.userId,
        role: dto.role,
        title: dto.title,
        bio: dto.bio,
        photoUrl: dto.photoUrl,
        sortOrder: dto.sortOrder ?? 0,
        isVisible: dto.isVisible ?? true,
      },
      select: adminTeamMemberSelect,
    });

    this.logger.log(`Team member created: ${member.id} (${dto.role})`);
    return { success: true, data: member };
  }

  async updateTeamMember(id: string, dto: UpdateTeamMemberDto) {
    const member = await this.db.teamMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Team member not found');

    const updated = await this.db.teamMember.update({
      where: { id },
      data: dto,
      select: adminTeamMemberSelect,
    });

    return { success: true, data: updated };
  }

  async deleteTeamMember(id: string) {
    const member = await this.db.teamMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Team member not found');

    await this.db.teamMember.delete({ where: { id } });
    this.logger.log(`Team member deleted: ${id}`);
    return { success: true, data: { id } };
  }

  // ── Admin: Ambassador Applications ──

  async getAdminApplications(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;

    const where = status
      ? { status: status as 'PENDING' | 'APPROVED' | 'DENIED' }
      : {};

    const [items, total] = await Promise.all([
      this.db.ambassadorApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: adminAmbassadorApplicationSelect,
      }),
      this.db.ambassadorApplication.count({ where }),
    ]);

    return {
      success: true,
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async approveApplication(id: string, reviewerId: string) {
    const app = await this.db.ambassadorApplication.findUnique({
      where: { id },
      select: ambassadorApprovalLookupSelect,
    });
    if (!app) throw new NotFoundException('Application not found');

    // Update application status
    const updated = await this.db.ambassadorApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    // Create team member entry as ambassador
    const displayName = app.user?.profile?.displayName || 'Ambassador';
    await this.db.teamMember.upsert({
      where: { userId: app.userId },
      create: {
        userId: app.userId,
        role: 'AMBASSADOR',
        title: 'Ambassador',
        isVisible: true,
      },
      update: {
        role: 'AMBASSADOR',
        isVisible: true,
      },
    });

    this.logger.log(`Ambassador application approved: ${id} (${displayName})`);

    // Notify the applicant
    void this.notificationService.create({
      userId: app.userId,
      type: 'AMBASSADOR_APPLICATION_APPROVED',
      title: 'Ambassador application approved',
      body: 'Congratulations! Your ambassador application has been approved.',
      actionUrl: '/team',
    });

    return { success: true, data: updated };
  }

  async denyApplication(id: string, reviewerId: string, reason?: string) {
    const app = await this.db.ambassadorApplication.findUnique({
      where: { id },
    });
    if (!app) throw new NotFoundException('Application not found');

    const updated = await this.db.ambassadorApplication.update({
      where: { id },
      data: {
        status: 'DENIED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        denyReason: reason,
      },
    });

    this.logger.log(`Ambassador application denied: ${id}`);

    // Notify the applicant
    void this.notificationService.create({
      userId: app.userId,
      type: 'AMBASSADOR_APPLICATION_DENIED',
      title: 'Ambassador application update',
      body: 'Your ambassador application was not approved at this time.',
      actionUrl: '/team',
    });

    return { success: true, data: updated };
  }

  async deleteApplication(id: string) {
    const app = await this.db.ambassadorApplication.findUnique({
      where: { id },
    });
    if (!app) throw new NotFoundException('Application not found');

    await this.db.ambassadorApplication.delete({ where: { id } });
    this.logger.log(`Ambassador application deleted: ${id}`);
    return { success: true, data: { id } };
  }
}
