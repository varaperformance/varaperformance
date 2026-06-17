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
import { WaterService } from './water.service';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import {
  CreateWaterLogDto,
  UpdateWaterGoalDto,
  WaterLogQueryDto,
  WaterLogParamsDto,
} from './dto/water.dto';

@ApiTags('water')
@Controller({
  path: 'water',
  version: '1',
})
export class WaterController {
  constructor(private readonly waterService: WaterService) {}

  @ApiOperation({ summary: 'Log water intake' })
  @ApiOkResponse({ description: 'Water logged' })
  @Permissions('health:create')
  @Post()
  logWater(@Body() data: CreateWaterLogDto, @ActiveUser() user: JwtPayload) {
    return this.waterService.logWater(user.sub, data);
  }

  @ApiOperation({ summary: 'Get daily water summary' })
  @ApiOkResponse({ description: 'Daily water intake summary with progress' })
  @Permissions('health:read')
  @Get()
  getDailySummary(
    @Query() query: WaterLogQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.waterService.getDailySummary(user.sub, query);
  }

  @ApiOperation({ summary: 'Get water goal' })
  @ApiOkResponse({ description: 'User water goal' })
  @Permissions('health:read')
  @Get('goal')
  getGoal(@ActiveUser() user: JwtPayload) {
    return this.waterService.getGoal(user.sub);
  }

  @ApiOperation({ summary: 'Get daily water totals over a date range' })
  @ApiOkResponse({ description: 'Water intake history for trend charts' })
  @Permissions('health:read')
  @Get('history')
  getHistory(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.waterService.getHistory(user.sub, startDate, endDate);
  }

  @ApiOperation({ summary: 'Update water goal' })
  @ApiOkResponse({ description: 'Updated water goal' })
  @Permissions('health:update')
  @Patch('goal')
  updateGoal(@Body() data: UpdateWaterGoalDto, @ActiveUser() user: JwtPayload) {
    return this.waterService.updateGoal(user.sub, data);
  }

  @ApiOperation({ summary: 'Delete a water log' })
  @ApiOkResponse({ description: 'Water log deleted' })
  @Permissions('health:delete')
  @Delete(':id')
  removeLog(
    @Param() params: WaterLogParamsDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.waterService.removeLog(user.sub, params.id);
  }
}
