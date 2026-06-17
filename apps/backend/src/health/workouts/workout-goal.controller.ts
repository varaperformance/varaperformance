import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { WorkoutGoalService } from './workout-goal.service';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import { UpsertWorkoutGoalDto } from './dto/workout.dto';

@ApiTags('workout-goal')
@Controller({
  path: 'workout-goal',
  version: '1',
})
export class WorkoutGoalController {
  constructor(private readonly goalService: WorkoutGoalService) {}

  @ApiOperation({ summary: 'Get workout goal' })
  @ApiOkResponse({ description: 'Workout goal' })
  @Permissions('health:read')
  @Get()
  getGoal(@ActiveUser() user: JwtPayload) {
    return this.goalService.getGoal(user.sub);
  }

  @ApiOperation({ summary: 'Get workout goal with defaults' })
  @ApiOkResponse({ description: 'Workout goal with defaults if not set' })
  @Permissions('health:read')
  @Get('defaults')
  getGoalOrDefaults(@ActiveUser() user: JwtPayload) {
    return this.goalService.getGoalOrDefaults(user.sub);
  }

  @ApiOperation({ summary: 'Set or update workout goal' })
  @ApiOkResponse({ description: 'Workout goal updated' })
  @Permissions('health:update')
  @Post()
  upsertGoal(
    @Body() data: UpsertWorkoutGoalDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.goalService.upsertGoal(user.sub, data);
  }
}
