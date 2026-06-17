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
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { WorkoutPlansService } from './workout-plans.service';
import {
  CreateWorkoutPlanDto,
  UpdateWorkoutPlanDto,
  WorkoutPlanQueryDto,
  CreateWorkoutPlanDayDto,
  UpdateWorkoutPlanDayDto,
  CreateWorkoutPlanExerciseDto,
  UpdateWorkoutPlanExerciseDto,
  CreateExerciseSetDto,
  UpdateExerciseSetDto,
  AssignWorkoutPlanDto,
  UpdateAssignmentStatusDto,
  WorkoutPlanAssignmentQueryDto,
  PlanParamsDto,
  DayParamsDto,
  ExerciseParamsDto,
  SetParamsDto,
  AssignmentParamsDto,
  StartPlanWorkoutDto,
  CompletePlanDayDto,
} from './dto/workout-plan.dto';

@ApiTags('workout-plans')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@ApiBearerAuth('access-token')
@Controller({
  path: 'workout-plans',
  version: '1',
})
export class WorkoutPlansController {
  constructor(private readonly workoutPlansService: WorkoutPlansService) {}

  // ============================================
  // User Workout Plans
  // ============================================

  @ApiOperation({ summary: 'Get all workout plans (public + own)' })
  @ApiOkResponse({ description: 'Paginated list of workout plans' })
  @Permissions('workout:read')
  @Get()
  findAll(
    @ActiveUser('sub') userId: string,
    @Query() query: WorkoutPlanQueryDto,
  ) {
    return this.workoutPlansService.findAll(userId, query);
  }

  @ApiOperation({ summary: 'Get my workout plans' })
  @ApiOkResponse({ description: 'User own plans' })
  @Permissions('workout:read')
  @Get('me')
  findMyPlans(
    @ActiveUser('sub') userId: string,
    @Query() query: WorkoutPlanQueryDto,
  ) {
    return this.workoutPlansService.findMyPlans(userId, query);
  }

  @ApiOperation({ summary: 'Get my plan assignments' })
  @ApiOkResponse({ description: 'Plans assigned to me' })
  @Permissions('workout:read')
  @Get('me/assignments')
  getMyAssignments(
    @ActiveUser('sub') userId: string,
    @Query() query: WorkoutPlanAssignmentQueryDto,
  ) {
    return this.workoutPlansService.getMyAssignments(userId, query);
  }

  @ApiOperation({ summary: 'Start a workout from an assigned plan day' })
  @ApiOkResponse({
    description: 'New workout session created with exercises from plan',
  })
  @Permissions('workout:create')
  @Post('start-workout')
  startPlanWorkout(
    @ActiveUser('sub') userId: string,
    @Body() data: StartPlanWorkoutDto,
  ) {
    return this.workoutPlansService.startPlanWorkout(userId, data);
  }

  @ApiOperation({ summary: 'Mark a plan day as completed' })
  @ApiOkResponse({ description: 'Plan day marked complete' })
  @Permissions('workout:update')
  @Post('complete-day')
  completePlanDay(
    @ActiveUser('sub') userId: string,
    @Body() data: CompletePlanDayDto,
  ) {
    return this.workoutPlansService.completePlanDay(userId, data);
  }

  @ApiOperation({ summary: 'Get a single workout plan' })
  @ApiOkResponse({ description: 'Workout plan details' })
  @Permissions('workout:read')
  @Get(':planId')
  findOne(@ActiveUser('sub') userId: string, @Param() params: PlanParamsDto) {
    return this.workoutPlansService.findOne(userId, params.planId);
  }

  @ApiOperation({ summary: 'Create a workout plan' })
  @ApiOkResponse({ description: 'Created workout plan' })
  @Permissions('workout:create')
  @Post()
  create(
    @ActiveUser('sub') userId: string,
    @Body() data: CreateWorkoutPlanDto,
  ) {
    return this.workoutPlansService.create(userId, data);
  }

  @ApiOperation({ summary: 'Update a workout plan' })
  @ApiOkResponse({ description: 'Updated workout plan' })
  @Permissions('workout:update')
  @Patch(':planId')
  update(
    @ActiveUser('sub') userId: string,
    @Param() params: PlanParamsDto,
    @Body() data: UpdateWorkoutPlanDto,
  ) {
    return this.workoutPlansService.update(userId, params.planId, data);
  }

  @ApiOperation({ summary: 'Delete a workout plan' })
  @ApiOkResponse({ description: 'Deleted' })
  @Permissions('workout:delete')
  @Delete(':planId')
  delete(@ActiveUser('sub') userId: string, @Param() params: PlanParamsDto) {
    return this.workoutPlansService.delete(userId, params.planId);
  }

  @ApiOperation({ summary: 'Copy a workout plan' })
  @ApiOkResponse({ description: 'Copied workout plan' })
  @Permissions('workout:create')
  @Post(':planId/copy')
  copyPlan(@ActiveUser('sub') userId: string, @Param() params: PlanParamsDto) {
    return this.workoutPlansService.copyPlan(userId, params.planId);
  }

  @ApiOperation({ summary: 'Follow a workout plan (self-assign)' })
  @ApiOkResponse({ description: 'Assignment created' })
  @Permissions('workout:create')
  @Post(':planId/follow')
  followPlan(
    @ActiveUser('sub') userId: string,
    @Param() params: PlanParamsDto,
  ) {
    return this.workoutPlansService.selfAssign(userId, params.planId);
  }

  // ============================================
  // Day Management
  // ============================================

  @ApiOperation({ summary: 'Add a day to a plan' })
  @ApiOkResponse({ description: 'Updated plan with new day' })
  @Permissions('workout:update')
  @Post(':planId/days')
  addDay(
    @ActiveUser('sub') userId: string,
    @Param() params: PlanParamsDto,
    @Body() data: CreateWorkoutPlanDayDto,
  ) {
    return this.workoutPlansService.addDay(userId, params.planId, data);
  }

  @ApiOperation({ summary: 'Update a day' })
  @ApiOkResponse({ description: 'Updated plan' })
  @Permissions('workout:update')
  @Patch(':planId/days/:dayId')
  updateDay(
    @ActiveUser('sub') userId: string,
    @Param() params: DayParamsDto,
    @Body() data: UpdateWorkoutPlanDayDto,
  ) {
    return this.workoutPlansService.updateDay(
      userId,
      params.planId,
      params.dayId,
      data,
    );
  }

  @ApiOperation({ summary: 'Delete a day' })
  @ApiOkResponse({ description: 'Updated plan' })
  @Permissions('workout:delete')
  @Delete(':planId/days/:dayId')
  deleteDay(@ActiveUser('sub') userId: string, @Param() params: DayParamsDto) {
    return this.workoutPlansService.deleteDay(
      userId,
      params.planId,
      params.dayId,
    );
  }

  // ============================================
  // Exercise Management
  // ============================================

  @ApiOperation({ summary: 'Add an exercise to a day' })
  @ApiOkResponse({ description: 'Updated plan' })
  @Permissions('workout:update')
  @Post(':planId/days/:dayId/exercises')
  addExercise(
    @ActiveUser('sub') userId: string,
    @Param() params: DayParamsDto,
    @Body() data: CreateWorkoutPlanExerciseDto,
  ) {
    return this.workoutPlansService.addExercise(
      userId,
      params.planId,
      params.dayId,
      data,
    );
  }

  @ApiOperation({ summary: 'Update an exercise' })
  @ApiOkResponse({ description: 'Updated plan' })
  @Permissions('workout:update')
  @Patch(':planId/days/:dayId/exercises/:exerciseId')
  updateExercise(
    @ActiveUser('sub') userId: string,
    @Param() params: ExerciseParamsDto,
    @Body() data: UpdateWorkoutPlanExerciseDto,
  ) {
    return this.workoutPlansService.updateExercise(
      userId,
      params.planId,
      params.dayId,
      params.exerciseId,
      data,
    );
  }

  @ApiOperation({ summary: 'Delete an exercise' })
  @ApiOkResponse({ description: 'Updated plan' })
  @Permissions('workout:delete')
  @Delete(':planId/days/:dayId/exercises/:exerciseId')
  deleteExercise(
    @ActiveUser('sub') userId: string,
    @Param() params: ExerciseParamsDto,
  ) {
    return this.workoutPlansService.deleteExercise(
      userId,
      params.planId,
      params.dayId,
      params.exerciseId,
    );
  }

  // ============================================
  // Exercise Set Management
  // ============================================

  @ApiOperation({ summary: 'Add a set to an exercise' })
  @ApiOkResponse({ description: 'Updated plan' })
  @Permissions('workout:update')
  @Post(':planId/days/:dayId/exercises/:exerciseId/sets')
  addSet(
    @ActiveUser('sub') userId: string,
    @Param() params: ExerciseParamsDto,
    @Body() data: CreateExerciseSetDto,
  ) {
    return this.workoutPlansService.addSet(
      userId,
      params.planId,
      params.dayId,
      params.exerciseId,
      data,
    );
  }

  @ApiOperation({ summary: 'Update a set' })
  @ApiOkResponse({ description: 'Updated plan' })
  @Permissions('workout:update')
  @Patch(':planId/days/:dayId/exercises/:exerciseId/sets/:setId')
  updateSet(
    @ActiveUser('sub') userId: string,
    @Param() params: SetParamsDto,
    @Body() data: UpdateExerciseSetDto,
  ) {
    return this.workoutPlansService.updateSet(
      userId,
      params.planId,
      params.dayId,
      params.exerciseId,
      params.setId,
      data,
    );
  }

  @ApiOperation({ summary: 'Delete a set' })
  @ApiOkResponse({ description: 'Updated plan' })
  @Permissions('workout:delete')
  @Delete(':planId/days/:dayId/exercises/:exerciseId/sets/:setId')
  deleteSet(@ActiveUser('sub') userId: string, @Param() params: SetParamsDto) {
    return this.workoutPlansService.deleteSet(
      userId,
      params.planId,
      params.dayId,
      params.exerciseId,
      params.setId,
    );
  }

  // ============================================
  // Assignment Management
  // ============================================

  @ApiOperation({ summary: 'Get a single assignment' })
  @ApiOkResponse({ description: 'Assignment details' })
  @Permissions('workout:read')
  @Get('assignments/:assignmentId')
  getAssignment(
    @ActiveUser('sub') userId: string,
    @Param() params: AssignmentParamsDto,
  ) {
    return this.workoutPlansService.getAssignment(userId, params.assignmentId);
  }

  @ApiOperation({ summary: 'Update assignment status' })
  @ApiOkResponse({ description: 'Updated assignment' })
  @Permissions('workout:update')
  @Patch('assignments/:assignmentId/status')
  updateAssignmentStatus(
    @ActiveUser('sub') userId: string,
    @Param() params: AssignmentParamsDto,
    @Body() data: UpdateAssignmentStatusDto,
  ) {
    return this.workoutPlansService.updateAssignmentStatus(
      userId,
      params.assignmentId,
      data.status,
    );
  }
}

// ============================================
// Coach-specific Controller
// ============================================

@ApiTags('coach-workout-plans')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@ApiBearerAuth('access-token')
@Controller({
  path: 'coaches/me/workout-plans',
  version: '1',
})
export class CoachWorkoutPlansController {
  constructor(private readonly workoutPlansService: WorkoutPlansService) {}

  @ApiOperation({ summary: 'Get coach workout plans' })
  @ApiOkResponse({ description: 'Coach plans' })
  @Permissions('coaching:read')
  @Get()
  getCoachPlans(
    @ActiveUser('sub') userId: string,
    @Query() query: WorkoutPlanQueryDto,
  ) {
    return this.workoutPlansService.getCoachPlans(userId, query);
  }

  @ApiOperation({ summary: 'Create a coach workout plan' })
  @ApiOkResponse({ description: 'Created plan' })
  @Permissions('coaching:create')
  @Post()
  createCoachPlan(
    @ActiveUser('sub') userId: string,
    @Body() data: CreateWorkoutPlanDto,
  ) {
    return this.workoutPlansService.createCoachPlan(userId, data);
  }

  @ApiOperation({ summary: 'Assign plan to client' })
  @ApiOkResponse({ description: 'Assignment created' })
  @Permissions('coaching:update')
  @Post('assign')
  assignPlan(
    @ActiveUser('sub') userId: string,
    @Body() data: AssignWorkoutPlanDto,
  ) {
    return this.workoutPlansService.assignPlan(userId, data);
  }

  @ApiOperation({ summary: 'Get assignments made by coach' })
  @ApiOkResponse({ description: 'List of assignments' })
  @Permissions('coaching:read')
  @Get('assignments')
  getCoachAssignments(
    @ActiveUser('sub') userId: string,
    @Query() query: WorkoutPlanAssignmentQueryDto,
  ) {
    return this.workoutPlansService.getCoachAssignments(userId, query);
  }
}
