import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { HabitsService } from './habits.service';
import {
  CreateHabitDto,
  UpdateHabitDto,
  LogHabitDto,
  HabitQueryDto,
  HabitLogQueryDto,
  HabitParamsDto,
} from './dto/habit.dto';

@ApiTags('habits')
@Controller({
  path: 'habits',
  version: '1',
})
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Get()
  @Permissions('health:read')
  @ApiOperation({ summary: 'List all habits' })
  @ApiOkResponse({ description: 'List of habits with streak info' })
  findAll(@ActiveUser() user: JwtPayload, @Query() query: HabitQueryDto) {
    return this.habitsService.findAll(user.sub, query.includeInactive);
  }

  @Post()
  @Permissions('health:create')
  @ApiOperation({ summary: 'Create a habit' })
  @ApiOkResponse({ description: 'Habit created' })
  create(@ActiveUser() user: JwtPayload, @Body() dto: CreateHabitDto) {
    return this.habitsService.create(user.sub, dto);
  }

  @Patch(':id')
  @Permissions('health:update')
  @ApiOperation({ summary: 'Update a habit' })
  @ApiOkResponse({ description: 'Habit updated' })
  update(
    @ActiveUser() user: JwtPayload,
    @Param() params: HabitParamsDto,
    @Body() dto: UpdateHabitDto,
  ) {
    return this.habitsService.update(user.sub, params.id, dto);
  }

  @Delete(':id')
  @Permissions('health:delete')
  @ApiOperation({ summary: 'Delete a habit' })
  @ApiOkResponse({ description: 'Habit deleted' })
  remove(@ActiveUser() user: JwtPayload, @Param() params: HabitParamsDto) {
    return this.habitsService.remove(user.sub, params.id);
  }

  @Post(':id/toggle')
  @Permissions('health:create')
  @ApiOperation({ summary: 'Toggle habit completion for a date' })
  @ApiOkResponse({ description: 'Habit toggled' })
  toggle(
    @ActiveUser() user: JwtPayload,
    @Param() params: HabitParamsDto,
    @Body() dto: LogHabitDto,
  ) {
    return this.habitsService.toggleLog(user.sub, params.id, dto.date);
  }

  @Get('heatmap')
  @Permissions('health:read')
  @ApiOperation({ summary: 'Get habit completion heatmap' })
  @ApiOkResponse({ description: 'Heatmap data by date' })
  heatmap(@ActiveUser() user: JwtPayload, @Query() query: HabitLogQueryDto) {
    return this.habitsService.getHeatmap(user.sub, query.from, query.to);
  }

  @Get(':id/logs')
  @Permissions('health:read')
  @ApiOperation({ summary: 'Get logs for a specific habit' })
  @ApiOkResponse({ description: 'Habit logs in date range' })
  getLogs(
    @ActiveUser() user: JwtPayload,
    @Param() params: HabitParamsDto,
    @Query() query: HabitLogQueryDto,
  ) {
    return this.habitsService.getHabitLogs(
      user.sub,
      params.id,
      query.from,
      query.to,
    );
  }
}
