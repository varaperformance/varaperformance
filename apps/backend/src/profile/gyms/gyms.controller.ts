import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { GymsService } from './gyms.service';
import {
  CreateGymDto,
  UpdateGymDto,
  GymParamsDto,
  GymQueryDto,
  CreateGymLocationDto,
  UpdateGymLocationDto,
  GymLocationParamsDto,
  GymLocationQueryDto,
} from './dto/gyms.dto';
import { Permissions } from '../../idm/decorators/permissions.decorator';

@ApiTags('gyms')
@Controller({
  path: 'gyms',
  version: '1',
})
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  // ==================== GYM ENDPOINTS ====================

  @Permissions('gym:create')
  @ApiOperation({ summary: 'Create a gym' })
  @ApiOkResponse({ description: 'Gym created' })
  @Post()
  create(@Body() data: CreateGymDto) {
    return this.gymsService.create(data);
  }

  @ApiOperation({ summary: 'List gyms' })
  @ApiOkResponse({ description: 'Paginated list of gyms' })
  @Get()
  findAll(@Query() query: GymQueryDto) {
    return this.gymsService.findAll(query);
  }

  @ApiOperation({ summary: 'Get a gym by ID' })
  @ApiOkResponse({ description: 'Gym detail' })
  @Get(':id')
  findOne(@Param() params: GymParamsDto) {
    return this.gymsService.findOne(params.id);
  }

  @Permissions('gym:update')
  @ApiOperation({ summary: 'Update a gym' })
  @ApiOkResponse({ description: 'Updated gym' })
  @Patch(':id')
  update(@Param() params: GymParamsDto, @Body() data: UpdateGymDto) {
    return this.gymsService.update(params.id, data);
  }

  @Permissions('gym:delete')
  @ApiOperation({ summary: 'Delete a gym' })
  @ApiOkResponse({ description: 'Gym deleted' })
  @Delete(':id')
  remove(@Param() params: GymParamsDto) {
    return this.gymsService.remove(params.id);
  }

  // ==================== GYM LOCATION ENDPOINTS ====================

  @Permissions('gym:create')
  @ApiOperation({ summary: 'Create a gym location' })
  @ApiOkResponse({ description: 'Gym location created' })
  @Post(':gymId/locations')
  createLocation(
    @Param('gymId') gymId: string,
    @Body() data: CreateGymLocationDto,
  ) {
    return this.gymsService.createLocation(gymId, data);
  }

  @ApiOperation({ summary: 'List gym locations' })
  @ApiOkResponse({ description: 'Paginated list of gym locations' })
  @Get(':gymId/locations')
  findAllLocations(
    @Param('gymId') gymId: string,
    @Query() query: GymLocationQueryDto,
  ) {
    return this.gymsService.findAllLocations(gymId, query);
  }

  @ApiOperation({ summary: 'Get a gym location by ID' })
  @ApiOkResponse({ description: 'Gym location detail' })
  @Get(':gymId/locations/:locationId')
  findOneLocation(@Param() params: GymLocationParamsDto) {
    return this.gymsService.findOneLocation(params.gymId, params.locationId);
  }

  @Permissions('gym:update')
  @ApiOperation({ summary: 'Update a gym location' })
  @ApiOkResponse({ description: 'Updated gym location' })
  @Patch(':gymId/locations/:locationId')
  updateLocation(
    @Param() params: GymLocationParamsDto,
    @Body() data: UpdateGymLocationDto,
  ) {
    return this.gymsService.updateLocation(
      params.gymId,
      params.locationId,
      data,
    );
  }

  @Permissions('gym:delete')
  @ApiOperation({ summary: 'Delete a gym location' })
  @ApiOkResponse({ description: 'Gym location deleted' })
  @Delete(':gymId/locations/:locationId')
  removeLocation(@Param() params: GymLocationParamsDto) {
    return this.gymsService.removeLocation(params.gymId, params.locationId);
  }
}
