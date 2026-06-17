import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import { Public } from 'src/idm/decorators/public.decorator';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { AvailabilityService } from './availability.service';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
  AvailabilityParamsDto,
  AvailabilityQueryDto,
} from './dto/availability.dto';

@ApiTags('availability')
@Controller({
  path: 'coaching/availability',
  version: '1',
})
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * Public: Get a coach's active availability
   */
  @Get()
  @Public()
  @ApiOperation({ summary: "Get a coach's availability slots" })
  @ApiOkResponse({ description: 'List of availability slots' })
  async getCoachAvailability(@Query() query: AvailabilityQueryDto) {
    const items = await this.availabilityService.getCoachAvailability(
      query.coachId,
    );
    return { data: { items } };
  }

  /**
   * Coach: Get own availability (including inactive)
   */
  @Get('me')
  @Permissions('coaching:read')
  @ApiOperation({ summary: 'Get my availability' })
  @ApiOkResponse({ description: 'My availability slots' })
  async getMyAvailability(@ActiveUser() user: JwtPayload) {
    const items = await this.availabilityService.getMyAvailability(user.sub);
    return { data: { items } };
  }

  /**
   * Coach: Create availability slot
   */
  @Post()
  @Permissions('coaching:create')
  @ApiOperation({ summary: 'Create availability slot' })
  @ApiOkResponse({ description: 'Created slot' })
  async createSlot(
    @ActiveUser() user: JwtPayload,
    @Body() body: CreateAvailabilityDto,
  ) {
    const slot = await this.availabilityService.createSlot(user.sub, body);
    return { data: slot };
  }

  /**
   * Coach: Update availability slot
   */
  @Patch(':id')
  @Permissions('coaching:update')
  @ApiOperation({ summary: 'Update availability slot' })
  @ApiOkResponse({ description: 'Updated slot' })
  async updateSlot(
    @ActiveUser() user: JwtPayload,
    @Param() params: AvailabilityParamsDto,
    @Body() body: UpdateAvailabilityDto,
  ) {
    const slot = await this.availabilityService.updateSlot(
      user.sub,
      params.id,
      body,
    );
    return { data: slot };
  }

  /**
   * Coach: Delete availability slot
   */
  @Delete(':id')
  @Permissions('coaching:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete availability slot' })
  async deleteSlot(
    @ActiveUser() user: JwtPayload,
    @Param() params: AvailabilityParamsDto,
  ) {
    await this.availabilityService.deleteSlot(user.sub, params.id);
  }
}
