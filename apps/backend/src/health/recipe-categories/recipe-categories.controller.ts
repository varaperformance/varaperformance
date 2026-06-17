import {
  Controller,
  Get,
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
import { RecipeCategoriesService } from './recipe-categories.service';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import { Public } from '../../idm/decorators/public.decorator';
import { SkipAudit } from '@app/common/audit';
import {
  CreateRecipeCategoryDto,
  UpdateRecipeCategoryDto,
  RecipeCategoryParamsDto,
  RecipeCategoryQueryDto,
} from './dto/recipe-category.dto';

@ApiTags('recipe-categories')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@Controller({
  path: 'recipe-categories',
  version: '1',
})
export class RecipeCategoriesController {
  constructor(
    private readonly recipeCategoriesService: RecipeCategoriesService,
  ) {}

  // ==================== Public Endpoints ====================

  @ApiOperation({ summary: 'Get all recipe categories (public)' })
  @ApiOkResponse({ description: 'Paginated list of recipe categories' })
  @Public()
  @SkipAudit()
  @Get()
  getCategories(@Query() query: RecipeCategoryQueryDto) {
    return this.recipeCategoriesService.getCategories(query);
  }

  // ==================== Admin Endpoints ====================

  @ApiOperation({ summary: 'Get a single recipe category by ID' })
  @ApiOkResponse({ description: 'Recipe category details' })
  @Permissions('recipe:read')
  @Get(':id')
  getCategory(@Param() params: RecipeCategoryParamsDto) {
    return this.recipeCategoriesService.getCategory(params.id);
  }

  @ApiOperation({ summary: 'Create a new recipe category' })
  @ApiOkResponse({ description: 'Created recipe category' })
  @Permissions('recipe:create')
  @Post()
  createCategory(@Body() data: CreateRecipeCategoryDto) {
    return this.recipeCategoriesService.createCategory(data);
  }

  @ApiOperation({ summary: 'Update a recipe category' })
  @ApiOkResponse({ description: 'Updated recipe category' })
  @Permissions('recipe:update')
  @Patch(':id')
  updateCategory(
    @Param() params: RecipeCategoryParamsDto,
    @Body() data: UpdateRecipeCategoryDto,
  ) {
    return this.recipeCategoriesService.updateCategory(params.id, data);
  }

  @ApiOperation({ summary: 'Delete a recipe category' })
  @ApiOkResponse({ description: 'Deleted recipe category ID' })
  @Permissions('recipe:delete')
  @Delete(':id')
  deleteCategory(@Param() params: RecipeCategoryParamsDto) {
    return this.recipeCategoriesService.deleteCategory(params.id);
  }

  @ApiOperation({ summary: 'Check if a slug is available' })
  @ApiOkResponse({ description: 'Slug availability' })
  @ApiQuery({ name: 'excludeId', required: false })
  @Permissions('recipe:read')
  @Get('slug/:slug/check')
  checkSlug(
    @Param('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.recipeCategoriesService.checkSlug(slug, excludeId);
  }
}
