import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { WorkoutSessionsService } from './workout-sessions.service';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import {
  CreateWorkoutSessionDto,
  UpdateWorkoutSessionDto,
  CreateWorkoutDto,
  AddWorkoutSetDto,
  UpdateWorkoutSetDto,
  WorkoutSessionQueryDto,
  StartSessionDto,
  EndSessionDto,
  UpdateWorkoutInSessionDto,
} from './dto/workout.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('workout-sessions')
@Controller({
  path: 'workout-sessions',
  version: '1',
})
export class WorkoutSessionsController {
  constructor(private readonly sessionsService: WorkoutSessionsService) {}

  // ============================================================================
  // NEW: Active Session Endpoints
  // ============================================================================

  @ApiOperation({ summary: 'Get active session (if any)' })
  @ApiOkResponse({ description: 'Active session or null' })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Permissions('health:read')
  @Get('active')
  getActive(@ActiveUser() user: JwtPayload) {
    return this.sessionsService.getActiveSession(user.sub);
  }

  @ApiOperation({ summary: 'Start a new workout session' })
  @ApiOkResponse({ description: 'Session started' })
  @Permissions('health:create')
  @Post('start')
  startSession(@Body() data: StartSessionDto, @ActiveUser() user: JwtPayload) {
    return this.sessionsService.startSession(user.sub, data);
  }

  @ApiOperation({ summary: 'End an active session' })
  @ApiOkResponse({ description: 'Session ended' })
  @Permissions('health:update')
  @Post(':sessionId/end')
  endSession(
    @Param('sessionId') sessionId: string,
    @Body() data: EndSessionDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.endSession(user.sub, sessionId, data);
  }

  // ============================================================================
  // Original Endpoints
  // ============================================================================

  @ApiOperation({ summary: 'Create a workout session' })
  @ApiOkResponse({ description: 'Session created' })
  @Permissions('health:create')
  @Post()
  create(
    @Body() data: CreateWorkoutSessionDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.create(user.sub, data);
  }

  @ApiOperation({ summary: 'Get workout sessions' })
  @ApiOkResponse({ description: 'Session list' })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Permissions('health:read')
  @Get()
  findAll(
    @Query() query: WorkoutSessionQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.findAll(user.sub, query);
  }

  @ApiOperation({ summary: 'Get workout stats' })
  @ApiOkResponse({ description: 'User workout statistics' })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Permissions('health:read')
  @Get('stats')
  getStats(@ActiveUser() user: JwtPayload) {
    return this.sessionsService.getStats(user.sub);
  }

  @ApiOperation({ summary: 'Get frequently used exercise IDs' })
  @ApiOkResponse({ description: 'Top exercise IDs by usage' })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Permissions('health:read')
  @Get('frequent-exercises')
  getFrequentExercises(@ActiveUser() user: JwtPayload) {
    return this.sessionsService.getFrequentExercises(user.sub);
  }

  @ApiOperation({ summary: 'Get daily activity data for heat map / graph' })
  @ApiOkResponse({ description: 'Activity data by date' })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Permissions('health:read')
  @Get('activity')
  getActivityData(
    @Query('days') days: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.getActivityData(user.sub, {
      days: days ? parseInt(days, 10) : 365,
      startDate,
      endDate,
    });
  }

  @ApiOperation({ summary: 'Get workout breakdown by muscle group' })
  @ApiOkResponse({ description: 'Muscle group breakdown' })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Permissions('health:read')
  @Get('muscle-breakdown')
  getMuscleBreakdown(
    @Query('days') days: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.getMuscleBreakdown(user.sub, {
      days: days ? parseInt(days, 10) : undefined,
      startDate,
      endDate,
    });
  }

  @ApiOperation({ summary: 'Get recent workouts summary' })
  @ApiOkResponse({ description: 'Recent workouts for dashboard' })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Permissions('health:read')
  @Get('recent')
  getRecentWorkouts(
    @Query('limit') limit: string | undefined,
    @Query('excludeShared') excludeShared: string | undefined,
    @Query('shareableOnly') shareableOnly: string | undefined,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.getRecentWorkouts(
      user.sub,
      limit ? parseInt(limit, 10) : 5,
      excludeShared === 'true',
      shareableOnly === 'true',
    );
  }

  @ApiOperation({ summary: 'Get motivational workout quote' })
  @ApiOkResponse({ description: 'Latest workout motivation quote' })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Permissions('health:read')
  @Get('motivation-quote')
  getMotivationQuote() {
    return this.sessionsService.getMotivationQuote();
  }

  @ApiOperation({ summary: 'Get a session by ID' })
  @ApiOkResponse({ description: 'Session detail' })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Permissions('health:read')
  @Get(':sessionId')
  findOne(
    @Param('sessionId') sessionId: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.findOne(user.sub, sessionId);
  }

  @ApiOperation({ summary: 'Update a session' })
  @ApiOkResponse({ description: 'Session updated' })
  @Permissions('health:update')
  @Patch(':sessionId')
  update(
    @Param('sessionId') sessionId: string,
    @Body() data: UpdateWorkoutSessionDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.update(user.sub, sessionId, data);
  }

  @ApiOperation({ summary: 'Delete a session' })
  @ApiOkResponse({ description: 'Session deleted' })
  @Permissions('health:delete')
  @Delete(':sessionId')
  remove(
    @Param('sessionId') sessionId: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.remove(user.sub, sessionId);
  }

  // Workout endpoints (within session)
  @ApiOperation({ summary: 'Add a workout to session' })
  @ApiOkResponse({ description: 'Workout added' })
  @Permissions('health:create')
  @Post(':sessionId/workouts')
  addWorkout(
    @Param('sessionId') sessionId: string,
    @Body() data: CreateWorkoutDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.addWorkout(user.sub, sessionId, data);
  }

  @ApiOperation({ summary: 'Remove a workout from session' })
  @ApiOkResponse({ description: 'Workout removed' })
  @Permissions('health:delete')
  @Delete(':sessionId/workouts/:workoutId')
  removeWorkout(
    @Param('sessionId') sessionId: string,
    @Param('workoutId') workoutId: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.removeWorkout(user.sub, sessionId, workoutId);
  }

  @ApiOperation({ summary: 'Update a workout (mark complete)' })
  @ApiOkResponse({ description: 'Workout updated' })
  @Permissions('health:update')
  @Patch(':sessionId/workouts/:workoutId')
  updateWorkout(
    @Param('sessionId') sessionId: string,
    @Param('workoutId') workoutId: string,
    @Body() data: UpdateWorkoutInSessionDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.updateWorkout(
      user.sub,
      sessionId,
      workoutId,
      data,
    );
  }

  // Set endpoints (within workout)
  @ApiOperation({ summary: 'Add a set to a workout' })
  @ApiOkResponse({ description: 'Set added' })
  @Permissions('health:create')
  @Post(':sessionId/workouts/:workoutId/sets')
  addSet(
    @Param('sessionId') sessionId: string,
    @Param('workoutId') workoutId: string,
    @Body() data: AddWorkoutSetDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.addSet(user.sub, sessionId, workoutId, data);
  }

  @ApiOperation({ summary: 'Update a set' })
  @ApiOkResponse({ description: 'Set updated' })
  @Permissions('health:update')
  @Patch(':sessionId/workouts/:workoutId/sets/:setId')
  updateSet(
    @Param('sessionId') sessionId: string,
    @Param('workoutId') workoutId: string,
    @Param('setId') setId: string,
    @Body() data: UpdateWorkoutSetDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.updateSet(
      user.sub,
      sessionId,
      workoutId,
      setId,
      data,
    );
  }

  @ApiOperation({ summary: 'Delete a set' })
  @ApiOkResponse({ description: 'Set deleted' })
  @Permissions('health:delete')
  @Delete(':sessionId/workouts/:workoutId/sets/:setId')
  removeSet(
    @Param('sessionId') sessionId: string,
    @Param('workoutId') workoutId: string,
    @Param('setId') setId: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.sessionsService.removeSet(
      user.sub,
      sessionId,
      workoutId,
      setId,
    );
  }
}
