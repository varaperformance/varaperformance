import {
  Controller,
  Get,
  Param,
  Query,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { DatabaseService } from '@app/database';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { WeeklyReportService } from './weekly-report.service';

@ApiTags('weekly-report')
@Controller({
  path: 'weekly-report',
  version: '1',
})
export class WeeklyReportController {
  constructor(
    private readonly weeklyReportService: WeeklyReportService,
    private readonly db: DatabaseService,
  ) {}

  @Get()
  @Permissions('health:read')
  @ApiOperation({ summary: 'Get current weekly progress report' })
  @ApiOkResponse({ description: 'Weekly progress report data' })
  async getWeeklyReport(
    @ActiveUser() user: JwtPayload,
    @Query('days') days?: string,
  ) {
    const numDays = days ? parseInt(days, 10) : 7;
    const safeDays =
      Number.isFinite(numDays) && numDays >= 1 && numDays <= 90 ? numDays : 7;
    const report = await this.weeklyReportService.getReport(user.sub, safeDays);
    return { data: report };
  }

  @Get('client/:bookingId')
  @Permissions('coaching:read')
  @ApiOperation({ summary: "Get a client's weekly report (coach only)" })
  @ApiOkResponse({ description: "Client's weekly progress report data" })
  async getClientWeeklyReport(
    @ActiveUser() user: JwtPayload,
    @Param('bookingId') bookingId: string,
    @Query('days') days?: string,
  ) {
    const coach = await this.db.coach.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });

    if (!coach) {
      throw new ForbiddenException('You are not registered as a coach');
    }

    const booking = await this.db.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true, coachId: true, status: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.coachId !== coach.id) {
      throw new ForbiddenException('This client is not assigned to you');
    }

    if (!['CONFIRMED', 'APPROVED'].includes(booking.status)) {
      throw new ForbiddenException('Booking is not active');
    }

    const numDays = days ? parseInt(days, 10) : 7;
    const safeDays =
      Number.isFinite(numDays) && numDays >= 1 && numDays <= 90 ? numDays : 7;
    const report = await this.weeklyReportService.getReport(
      booking.userId,
      safeDays,
    );
    return { data: report };
  }
}
