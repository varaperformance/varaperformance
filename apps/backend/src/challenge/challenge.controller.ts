import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { ChallengeService } from './challenge.service';
import {
  CreateChallengeDto,
  UpdateChallengeDto,
  UpdateChallengeProgressDto,
  ChallengeQueryDto,
} from './dto/challenge.dto';

@ApiTags('challenges')
@Controller({
  path: 'challenges',
  version: '1',
})
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Post()
  @Permissions('challenge:create')
  @ApiOperation({ summary: 'Create a community challenge' })
  async create(
    @ActiveUser() user: JwtPayload,
    @Body() dto: CreateChallengeDto,
  ) {
    return this.challengeService.create(user.sub, dto);
  }

  @Get()
  @Permissions('challenge:read')
  @ApiOperation({ summary: 'List public challenges' })
  async findAll(
    @ActiveUser() user: JwtPayload,
    @Query() query: ChallengeQueryDto,
  ) {
    return this.challengeService.findAll(query, user.sub);
  }

  @Get('me')
  @Permissions('challenge:read')
  @ApiOperation({ summary: 'Get my created and joined challenges' })
  async findMyChallenges(@ActiveUser() user: JwtPayload) {
    return this.challengeService.findMyChallenges(user.sub);
  }

  @Get(':id')
  @Permissions('challenge:read')
  @ApiOperation({ summary: 'Get challenge details' })
  async findOne(@Param('id') id: string, @ActiveUser() user: JwtPayload) {
    return this.challengeService.findOne(id, user.sub);
  }

  @Put(':id')
  @Permissions('challenge:update')
  @ApiOperation({ summary: 'Update own challenge' })
  async update(
    @Param('id') id: string,
    @ActiveUser() user: JwtPayload,
    @Body() dto: UpdateChallengeDto,
  ) {
    return this.challengeService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @Permissions('challenge:delete')
  @ApiOperation({ summary: 'Delete own challenge' })
  async remove(@Param('id') id: string, @ActiveUser() user: JwtPayload) {
    await this.challengeService.remove(id, user.sub);
    return { data: { deleted: true } };
  }

  @Post(':id/join')
  @Permissions('challenge:create')
  @ApiOperation({ summary: 'Join a challenge' })
  async join(@Param('id') id: string, @ActiveUser() user: JwtPayload) {
    return this.challengeService.join(id, user.sub);
  }

  @Post(':id/withdraw')
  @Permissions('challenge:update')
  @ApiOperation({ summary: 'Withdraw from a challenge' })
  async withdraw(@Param('id') id: string, @ActiveUser() user: JwtPayload) {
    return this.challengeService.withdraw(id, user.sub);
  }

  @Patch(':id/progress')
  @Permissions('challenge:update')
  @ApiOperation({ summary: 'Update my progress in a challenge' })
  async updateProgress(
    @Param('id') id: string,
    @ActiveUser() user: JwtPayload,
    @Body() dto: UpdateChallengeProgressDto,
  ) {
    return this.challengeService.updateProgress(id, user.sub, dto.progress);
  }

  @Get(':id/leaderboard')
  @Permissions('challenge:read')
  @ApiOperation({ summary: 'Get challenge leaderboard' })
  async getLeaderboard(@Param('id') id: string) {
    return this.challengeService.getLeaderboard(id);
  }

  @Get(':id/participants')
  @Permissions('challenge:read')
  @ApiOperation({ summary: 'Get challenge participants' })
  async getParticipants(@Param('id') id: string) {
    return this.challengeService.getParticipants(id);
  }

  @Post(':id/share')
  @Permissions('challenge:create')
  @ApiOperation({ summary: 'Share a joined challenge to Elevate feed' })
  async shareToElevate(
    @Param('id') id: string,
    @ActiveUser() user: JwtPayload,
  ) {
    const result = await this.challengeService.shareToElevate(user.sub, id);
    return { data: result };
  }
}
