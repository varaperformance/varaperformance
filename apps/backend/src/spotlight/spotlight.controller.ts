import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/idm/decorators/public.decorator';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { SkipAudit } from '@app/common/audit';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { SpotlightService } from './spotlight.service';
import {
  CreateSpotlightDto,
  PublicSpotlightQueryDto,
  SpotlightQueryDto,
  SubmitSpotlightDto,
  UpdateSpotlightDto,
} from './dto/spotlight.dto';

@ApiTags('spotlight')
@Controller({
  version: '1',
  path: 'spotlight',
})
export class SpotlightController {
  constructor(private readonly spotlightService: SpotlightService) {}

  @ApiOperation({ summary: 'Get spotlight stories for public page' })
  @ApiOkResponse({ description: 'Published spotlight stories' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('public')
  getPublicSpotlights(@Query() query: PublicSpotlightQueryDto) {
    return this.spotlightService.getPublicSpotlights(query);
  }

  @ApiOperation({ summary: 'Get one public spotlight story by slug' })
  @ApiOkResponse({ description: 'Public spotlight story' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('public/:slug')
  getPublicSpotlightBySlug(@Param('slug') slug: string) {
    return this.spotlightService.getPublicSpotlightBySlug(slug);
  }

  @ApiOperation({ summary: 'Submit a spotlight story (authenticated users)' })
  @ApiOkResponse({ description: 'Spotlight story submitted for review' })
  @Post('submit')
  submitSpotlight(
    @Body() data: SubmitSpotlightDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.spotlightService.submitSpotlight(data, user);
  }

  @ApiOperation({ summary: 'Get spotlight stories (admin)' })
  @ApiOkResponse({ description: 'Paginated spotlight stories' })
  @Permissions('spotlight:read')
  @Get()
  getSpotlights(@Query() query: SpotlightQueryDto) {
    return this.spotlightService.getSpotlights(query);
  }

  @ApiOperation({ summary: 'Get spotlight story by id (admin)' })
  @ApiOkResponse({ description: 'Spotlight story' })
  @Permissions('spotlight:read')
  @Get(':id')
  getSpotlight(@Param('id') id: string) {
    return this.spotlightService.getSpotlight(id);
  }

  @ApiOperation({ summary: 'Create spotlight story (admin)' })
  @ApiOkResponse({ description: 'Spotlight story created' })
  @Permissions('spotlight:create')
  @Post()
  createSpotlight(@Body() data: CreateSpotlightDto) {
    return this.spotlightService.createSpotlight(data);
  }

  @ApiOperation({ summary: 'Update spotlight story (admin)' })
  @ApiOkResponse({ description: 'Spotlight story updated' })
  @Permissions('spotlight:update')
  @Patch(':id')
  updateSpotlight(@Param('id') id: string, @Body() data: UpdateSpotlightDto) {
    return this.spotlightService.updateSpotlight(id, data);
  }

  @ApiOperation({ summary: 'Delete spotlight story (admin)' })
  @ApiOkResponse({ description: 'Spotlight story deleted' })
  @Permissions('spotlight:delete')
  @Delete(':id')
  deleteSpotlight(@Param('id') id: string) {
    return this.spotlightService.deleteSpotlight(id);
  }
}
