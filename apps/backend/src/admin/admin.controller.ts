import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('admin')
@Throttle({ default: { ttl: 1000, limit: 10 } })
@Controller({
  path: 'admin',
  version: '1',
})
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== Dashboard ====================

  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiOkResponse({ description: 'Dashboard statistics' })
  @Permissions('admin:read')
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @ApiOperation({ summary: 'Get daily active users for the last N days' })
  @ApiOkResponse({ description: 'Daily active user counts' })
  @Permissions('admin:read')
  @Get('dau')
  getDailyActiveUsers(@Query('days') days?: string) {
    return this.adminService.getDailyActiveUsers(days);
  }

  @ApiOperation({
    summary: "Get today's active users (up to 10) with display names",
  })
  @ApiOkResponse({ description: "Today's active users" })
  @Permissions('admin:read')
  @Get('dau/today')
  getTodayActiveUsers() {
    return this.adminService.getTodayActiveUsers();
  }

  @ApiOperation({ summary: 'Get audit logs for admin review' })
  @ApiOkResponse({ description: 'Paginated audit logs' })
  @Permissions('admin:read')
  @Get('audit-logs')
  getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getAuditLogs({
      page,
      limit,
      action,
      resource,
      userId,
      search,
      from,
      to,
    });
  }
}
