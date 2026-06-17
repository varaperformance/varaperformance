import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { MeasurementsService } from './measurements.service';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import {
  CreateBodyMeasurementDto,
  BodyMeasurementQueryDto,
  BodyMeasurementParamsDto,
} from './dto/measurement.dto';

@ApiTags('measurements')
@Controller({
  path: 'measurements',
  version: '1',
})
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @ApiOperation({ summary: 'Log body measurements' })
  @ApiOkResponse({ description: 'Measurements logged' })
  @Permissions('health:create')
  @Post()
  create(
    @Body() data: CreateBodyMeasurementDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.measurementsService.create(user.sub, data);
  }

  @ApiOperation({ summary: 'Get body measurement history' })
  @ApiOkResponse({ description: 'Body measurement log history' })
  @Permissions('health:read')
  @Get()
  findAll(
    @Query() query: BodyMeasurementQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.measurementsService.findAll(user.sub, query);
  }

  @ApiOperation({ summary: 'Get a body measurement by ID' })
  @ApiOkResponse({ description: 'Body measurement detail' })
  @Permissions('health:read')
  @Get(':id')
  findOne(
    @Param() params: BodyMeasurementParamsDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.measurementsService.findOne(user.sub, params.id);
  }

  @ApiOperation({ summary: 'Delete a body measurement' })
  @ApiOkResponse({ description: 'Body measurement deleted' })
  @Permissions('health:delete')
  @Delete(':id')
  remove(
    @Param() params: BodyMeasurementParamsDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.measurementsService.remove(user.sub, params.id);
  }
}
