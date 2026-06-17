import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { Public } from 'src/idm/decorators/public.decorator';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { AchievementsService } from './achievements.service';

@ApiTags('achievements')
@Controller({
  path: 'achievements',
  version: '1',
})
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  @Permissions('achievement:read')
  @ApiOperation({ summary: 'List all available achievements' })
  @ApiOkResponse({ description: 'List of achievements' })
  async findAll() {
    const items = await this.achievementsService.findAll();
    return { data: { items } };
  }

  @Get('me')
  @Permissions('achievement:read')
  @ApiOperation({ summary: 'Get current user unlocked achievements' })
  @ApiOkResponse({ description: 'List of user achievements' })
  async getMyAchievements(@ActiveUser() user: JwtPayload) {
    const items = await this.achievementsService.getUserAchievements(user.sub);
    return { data: { items } };
  }

  @Get('user/:userId')
  @Public()
  @ApiOperation({ summary: 'Get achievements unlocked by a user (public)' })
  @ApiOkResponse({ description: 'List of user achievements' })
  async getUserAchievements(@Param('userId') userId: string) {
    const items = await this.achievementsService.getUserAchievements(userId);
    return { data: { items } };
  }

  @Post(':achievementId/share')
  @Permissions('achievement:create')
  @ApiOperation({ summary: 'Share an unlocked achievement to Elevate feed' })
  @ApiOkResponse({ description: 'Creates an Elevate post for the achievement' })
  async shareToElevate(
    @ActiveUser() user: JwtPayload,
    @Param('achievementId') achievementId: string,
  ) {
    const result = await this.achievementsService.shareToElevate(
      user.sub,
      achievementId,
    );
    return { data: result };
  }
}
