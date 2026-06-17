import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { Throttle } from '@nestjs/throttler';
import { ChallengeService } from './challenge.service';
import {
  CreateChallengeDto,
  AdminUpdateChallengeDto,
  ChallengeQueryDto,
} from './dto/challenge.dto';

@ApiTags('admin/challenges')
@Throttle({ default: { ttl: 1000, limit: 10 } })
@Controller({
  path: 'admin/challenges',
  version: '1',
})
export class AdminChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Post()
  @Permissions('challenge:create')
  @ApiOperation({ summary: 'Create an official Vara challenge' })
  async create(
    @ActiveUser() user: JwtPayload,
    @Body() dto: CreateChallengeDto,
  ) {
    return this.challengeService.create(user.sub, dto, true);
  }

  @Get()
  @Permissions('challenge:read')
  @ApiOperation({ summary: 'List all challenges (admin view)' })
  async findAll(@Query() query: ChallengeQueryDto) {
    return this.challengeService.adminFindAll(query);
  }

  @Get(':id')
  @Permissions('challenge:read')
  @ApiOperation({ summary: 'Get any challenge by ID' })
  async findOne(@Param('id') id: string) {
    return this.challengeService.findOne(id);
  }

  @Put(':id')
  @Permissions('challenge:update')
  @ApiOperation({ summary: 'Admin update any challenge' })
  async update(@Param('id') id: string, @Body() dto: AdminUpdateChallengeDto) {
    return this.challengeService.adminUpdate(id, dto);
  }

  @Delete(':id')
  @Permissions('challenge:delete')
  @ApiOperation({ summary: 'Admin delete any challenge' })
  async remove(@Param('id') id: string, @ActiveUser() user: JwtPayload) {
    await this.challengeService.remove(id, user.sub, true);
    return { data: { deleted: true } };
  }

  @Get(':id/participants')
  @Permissions('challenge:read')
  @ApiOperation({ summary: 'Get challenge participants (admin)' })
  async getParticipants(@Param('id') id: string) {
    return this.challengeService.getParticipants(id);
  }
}
