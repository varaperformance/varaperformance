import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { HealthDataService } from './health-data.service';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import {
  LogStepsDto,
  StepTrendQueryDto,
  LogSleepDto,
  SleepTrendQueryDto,
  LogHeartRateBatchDto,
  HeartRateQueryDto,
  SyncHealthDataDto,
  HealthLogParamsDto,
  UpdateHealthSyncPreferenceDto,
} from './dto/health-data.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('health-data')
@Controller({
  path: 'health-data',
  version: '1',
})
export class HealthDataController {
  constructor(private readonly healthDataService: HealthDataService) {}

  // ─── Steps ──────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Log daily step count' })
  @ApiOkResponse({ description: 'Step log upserted' })
  @Permissions('health:update')
  @Post('steps')
  logSteps(@Body() data: LogStepsDto, @ActiveUser() user: JwtPayload) {
    return this.healthDataService.logSteps(user.sub, data);
  }

  @ApiOperation({ summary: "Get today's step count with goal progress" })
  @ApiOkResponse({ description: 'Steps today summary' })
  @Throttle({ default: { ttl: 60000, limit: 240 } })
  @Permissions('health:read')
  @Get('steps/today')
  getStepsToday(@ActiveUser() user: JwtPayload) {
    return this.healthDataService.getStepsToday(user.sub);
  }

  @ApiOperation({ summary: 'Get daily step totals for a date range' })
  @ApiOkResponse({ description: 'Step trend data' })
  @Throttle({ default: { ttl: 60000, limit: 240 } })
  @Permissions('health:read')
  @Get('steps')
  getStepsTrend(
    @Query() query: StepTrendQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.healthDataService.getStepsTrend(user.sub, query);
  }

  @ApiOperation({ summary: 'Delete a step log entry' })
  @ApiOkResponse({ description: 'Step log deleted' })
  @Permissions('health:delete')
  @Delete('steps/:id')
  deleteStepLog(
    @Param() params: HealthLogParamsDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.healthDataService.deleteStepLog(user.sub, params.id);
  }

  // ─── Sleep ──────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Log a sleep session' })
  @ApiOkResponse({ description: 'Sleep log upserted' })
  @Permissions('health:update')
  @Post('sleep')
  logSleep(@Body() data: LogSleepDto, @ActiveUser() user: JwtPayload) {
    return this.healthDataService.logSleep(user.sub, data);
  }

  @ApiOperation({ summary: 'Get sleep trend for a date range' })
  @ApiOkResponse({ description: 'Sleep trend data' })
  @Throttle({ default: { ttl: 60000, limit: 240 } })
  @Permissions('health:read')
  @Get('sleep')
  getSleepTrend(
    @Query() query: SleepTrendQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.healthDataService.getSleepTrend(user.sub, query);
  }

  // ─── Heart Rate ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Log heart rate samples (batch)' })
  @ApiOkResponse({ description: 'Heart rate samples inserted' })
  @Permissions('health:update')
  @Post('heart-rate')
  logHeartRate(
    @Body() data: LogHeartRateBatchDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.healthDataService.logHeartRateBatch(user.sub, data);
  }

  @ApiOperation({ summary: 'Get heart rate samples for a date range' })
  @ApiOkResponse({ description: 'Heart rate data' })
  @Throttle({ default: { ttl: 60000, limit: 240 } })
  @Permissions('health:read')
  @Get('heart-rate')
  getHeartRate(
    @Query() query: HeartRateQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.healthDataService.getHeartRate(user.sub, query);
  }

  @ApiOperation({ summary: 'Get daily heart rate summaries for a date range' })
  @ApiOkResponse({ description: 'Daily heart rate aggregates' })
  @Throttle({ default: { ttl: 60000, limit: 240 } })
  @Permissions('health:read')
  @Get('heart-rate/daily-summary')
  getHeartRateDailySummary(
    @Query() query: HeartRateQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.healthDataService.getHeartRateDailySummary(user.sub, query);
  }

  // ─── Bulk Sync ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Bulk sync health data from mobile device' })
  @ApiOkResponse({ description: 'Sync results' })
  @Permissions('health:update')
  @Post('sync')
  syncHealthData(
    @Body() data: SyncHealthDataDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.healthDataService.syncHealthData(user.sub, data);
  }

  // ─── Sync Status ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get health data sync status' })
  @ApiOkResponse({ description: 'Last sync timestamps per data type' })
  @Throttle({ default: { ttl: 60000, limit: 240 } })
  @Permissions('health:read')
  @Get('sync/status')
  getSyncStatus(@ActiveUser() user: JwtPayload) {
    return this.healthDataService.getSyncStatus(user.sub);
  }

  // ─── Sync Preferences ──────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get health sync preferences' })
  @ApiOkResponse({ description: 'Current sync preferences' })
  @Throttle({ default: { ttl: 60000, limit: 240 } })
  @Permissions('health:read')
  @Get('sync/preferences')
  getSyncPreferences(@ActiveUser() user: JwtPayload) {
    return this.healthDataService.getSyncPreferences(user.sub);
  }

  @ApiOperation({ summary: 'Update health sync preferences' })
  @ApiOkResponse({ description: 'Updated sync preferences' })
  @Permissions('health:update')
  @Put('sync/preferences')
  updateSyncPreferences(
    @Body() data: UpdateHealthSyncPreferenceDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.healthDataService.updateSyncPreferences(user.sub, data);
  }
}
