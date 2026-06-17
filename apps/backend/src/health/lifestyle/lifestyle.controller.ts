import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import { UpdateLifestyleGoalDto } from './dto/lifestyle.dto';
import { LifestyleService } from './lifestyle.service';

@ApiTags('lifestyle-goal')
@Controller({
  path: 'lifestyle-goal',
  version: '1',
})
export class LifestyleController {
  constructor(private readonly lifestyleService: LifestyleService) {}

  @ApiOperation({ summary: 'Get lifestyle goal' })
  @ApiOkResponse({ description: 'Lifestyle goal' })
  @Permissions('health:read')
  @Get()
  getGoal(@ActiveUser() user: JwtPayload) {
    return this.lifestyleService.getGoal(user.sub);
  }

  @ApiOperation({ summary: 'Get lifestyle goal with defaults' })
  @ApiOkResponse({ description: 'Lifestyle goal with defaults if not set' })
  @Permissions('health:read')
  @Get('defaults')
  getGoalOrDefaults(@ActiveUser() user: JwtPayload) {
    return this.lifestyleService.getGoalOrDefaults(user.sub);
  }

  @ApiOperation({ summary: 'Get adherence and recovery insights' })
  @ApiOkResponse({ description: 'Lifestyle adherence and recovery analytics' })
  @Permissions('health:read')
  @Get('insights')
  getInsights(@ActiveUser() user: JwtPayload) {
    return this.lifestyleService.getInsights(user.sub);
  }

  @ApiOperation({ summary: 'Set or update lifestyle goal' })
  @ApiOkResponse({ description: 'Lifestyle goal updated' })
  @Permissions('health:update')
  @Post()
  upsertGoal(
    @Body() data: UpdateLifestyleGoalDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.lifestyleService.upsertGoal(user.sub, data);
  }
}
