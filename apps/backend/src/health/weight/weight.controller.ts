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
import { WeightService } from './weight.service';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import {
  CreateWeightLogDto,
  UpdateWeightGoalDto,
  WeightLogQueryDto,
  WeightLogParamsDto,
} from './dto/weight.dto';

@ApiTags('weight')
@Controller({
  path: 'weight',
  version: '1',
})
export class WeightController {
  constructor(private readonly weightService: WeightService) {}

  @ApiOperation({ summary: 'Log weight' })
  @ApiOkResponse({ description: 'Weight logged' })
  @Permissions('health:create')
  @Post()
  create(@Body() data: CreateWeightLogDto, @ActiveUser() user: JwtPayload) {
    return this.weightService.create(user.sub, data);
  }

  @ApiOperation({ summary: 'Get weight logs' })
  @ApiOkResponse({ description: 'Weight log history' })
  @Permissions('health:read')
  @Get()
  findAll(@Query() query: WeightLogQueryDto, @ActiveUser() user: JwtPayload) {
    return this.weightService.findAll(user.sub, query);
  }

  @ApiOperation({ summary: 'Get weight goal' })
  @ApiOkResponse({ description: 'User weight goal' })
  @Permissions('health:read')
  @Get('goal')
  getGoal(@ActiveUser() user: JwtPayload) {
    return this.weightService.getGoal(user.sub);
  }

  @ApiOperation({ summary: 'Update weight goal' })
  @ApiOkResponse({ description: 'Updated weight goal' })
  @Permissions('health:update')
  @Patch('goal')
  updateGoal(
    @Body() data: UpdateWeightGoalDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.weightService.updateGoal(user.sub, data);
  }

  @ApiOperation({ summary: 'Get a weight log by ID' })
  @ApiOkResponse({ description: 'Weight log detail' })
  @Permissions('health:read')
  @Get(':id')
  findOne(@Param() params: WeightLogParamsDto, @ActiveUser() user: JwtPayload) {
    return this.weightService.findOne(user.sub, params.id);
  }

  @ApiOperation({ summary: 'Delete a weight log' })
  @ApiOkResponse({ description: 'Weight log deleted' })
  @Permissions('health:delete')
  @Delete(':id')
  remove(@Param() params: WeightLogParamsDto, @ActiveUser() user: JwtPayload) {
    return this.weightService.remove(user.sub, params.id);
  }
}
