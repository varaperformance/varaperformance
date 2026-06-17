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
import { CategoriesService } from './categories.service';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { Public } from 'src/idm/decorators/public.decorator';
import { SkipAudit } from '@app/common/audit';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryParamsDto,
  CategoryQueryDto,
} from './dto/category.dto';

@ApiTags('categories')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@Controller({
  path: 'categories',
  version: '1',
})
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ==================== Public Endpoints ====================

  @ApiOperation({ summary: 'Get all categories (public)' })
  @ApiOkResponse({ description: 'Paginated list of categories' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get()
  getCategories(@Query() query: CategoryQueryDto) {
    return this.categoriesService.getCategories(query);
  }

  // ==================== Admin Endpoints ====================

  @ApiOperation({ summary: 'Get a single category by ID' })
  @ApiOkResponse({ description: 'Category details' })
  @Permissions('blog:read')
  @Get(':id')
  getCategory(@Param() params: CategoryParamsDto) {
    return this.categoriesService.getCategory(params.id);
  }

  @ApiOperation({ summary: 'Create a new category' })
  @ApiOkResponse({ description: 'Created category' })
  @Permissions('blog:create')
  @Post()
  createCategory(@Body() data: CreateCategoryDto) {
    return this.categoriesService.createCategory(data);
  }

  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({ description: 'Updated category' })
  @Permissions('blog:update')
  @Patch(':id')
  updateCategory(
    @Param() params: CategoryParamsDto,
    @Body() data: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(params.id, data);
  }

  @ApiOperation({ summary: 'Delete a category' })
  @ApiOkResponse({ description: 'Deleted category ID' })
  @Permissions('blog:delete')
  @Delete(':id')
  deleteCategory(@Param() params: CategoryParamsDto) {
    return this.categoriesService.deleteCategory(params.id);
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
    return this.categoriesService.checkSlug(slug, excludeId);
  }
}
