import {
  Controller,
  Get,
  Header,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TagsService } from './tags.service';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { Public } from 'src/idm/decorators/public.decorator';
import { SkipAudit } from '@app/common/audit';
import {
  CreateTagDto,
  UpdateTagDto,
  TagParamsDto,
  TagQueryDto,
} from './dto/tag.dto';

@ApiTags('tags')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@Controller({
  path: 'tags',
  version: '1',
})
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  // ==================== Public Endpoints ====================

  @ApiOperation({ summary: 'Get all tags (public)' })
  @ApiOkResponse({ description: 'Paginated list of tags' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get()
  getTags(@Query() query: TagQueryDto) {
    return this.tagsService.getTags(query);
  }

  // ==================== Admin Endpoints ====================

  @ApiOperation({ summary: 'Get a single tag by ID' })
  @ApiOkResponse({ description: 'Tag details' })
  @Permissions('blog:read')
  @Get(':id')
  getTag(@Param() params: TagParamsDto) {
    return this.tagsService.getTag(params.id);
  }

  @ApiOperation({ summary: 'Create a new tag' })
  @ApiOkResponse({ description: 'Created tag' })
  @Permissions('blog:create')
  @Post()
  createTag(@Body() data: CreateTagDto) {
    return this.tagsService.createTag(data);
  }

  @ApiOperation({ summary: 'Update a tag' })
  @ApiOkResponse({ description: 'Updated tag' })
  @Permissions('blog:update')
  @Patch(':id')
  updateTag(@Param() params: TagParamsDto, @Body() data: UpdateTagDto) {
    return this.tagsService.updateTag(params.id, data);
  }

  @ApiOperation({ summary: 'Delete a tag' })
  @ApiOkResponse({ description: 'Deleted tag ID' })
  @Permissions('blog:delete')
  @Delete(':id')
  deleteTag(@Param() params: TagParamsDto) {
    return this.tagsService.deleteTag(params.id);
  }

  @ApiOperation({ summary: 'Check if a slug is available' })
  @ApiOkResponse({ description: 'Slug availability' })
  @ApiQuery({ name: 'excludeId', required: false })
  @Permissions('blog:read')
  @Get('slug/:slug/check')
  checkSlug(
    @Param('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.tagsService.checkSlug(slug, excludeId);
  }
}
