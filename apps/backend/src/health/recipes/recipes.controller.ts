import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { SkipThrottle } from '@nestjs/throttler';
import { StorageService } from '@app/common/storage';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import { RecipesService } from './recipes.service';
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  SearchRecipesDto,
  RecipeParamsDto,
  LogRecipeDto,
} from './dto/recipes.dto';

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('recipes')
@Controller({
  path: 'recipes',
  version: '1',
})
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly storageService: StorageService,
  ) {}

  @ApiOperation({ summary: 'Upload recipe image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ description: 'Recipe image uploaded' })
  @Permissions('health:create')
  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @UploadedFile() file: MulterFile,
    @ActiveUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPEG, PNG, WebP',
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File too large. Maximum 10MB');
    }

    const uploaded = await this.storageService.uploadBuffer({
      folder: `recipes/${user.sub}`,
      originalName: file.originalname,
      contentType: file.mimetype,
      body: file.buffer,
      allowedMimeTypes,
    });

    return {
      success: true,
      data: { url: uploaded.url },
      message: 'Recipe image uploaded',
    };
  }

  @ApiOperation({ summary: 'Create recipe' })
  @ApiOkResponse({ description: 'Recipe created' })
  @Permissions('health:create')
  @Post()
  create(@Body() data: CreateRecipeDto, @ActiveUser() user: JwtPayload) {
    return this.recipesService.create(user.sub, data);
  }

  @ApiOperation({ summary: 'Search recipes' })
  @ApiOkResponse({ description: 'Recipe list' })
  @SkipThrottle()
  @Permissions('health:read')
  @Get()
  search(@Query() query: SearchRecipesDto, @ActiveUser() user: JwtPayload) {
    return this.recipesService.search(user.sub, query);
  }

  // ==================== Admin Endpoints ====================

  @ApiOperation({ summary: 'List all recipes (admin)' })
  @ApiOkResponse({ description: 'Recipe list' })
  @Permissions('recipe:read')
  @Get('admin/list')
  adminList(@Query() query: SearchRecipesDto) {
    return this.recipesService.adminList(query);
  }

  @ApiOperation({ summary: 'Toggle recipe verified status (admin)' })
  @ApiOkResponse({ description: 'Recipe verification toggled' })
  @Permissions('recipe:update')
  @Patch('admin/:id/verify')
  toggleVerify(@Param() params: RecipeParamsDto) {
    return this.recipesService.toggleVerify(params.id);
  }

  @ApiOperation({ summary: 'Get recipe by id' })
  @ApiOkResponse({ description: 'Recipe detail' })
  @Permissions('health:read')
  @Get(':id')
  findOne(@Param() params: RecipeParamsDto, @ActiveUser() user: JwtPayload) {
    return this.recipesService.findOne(user.sub, params.id);
  }

  @ApiOperation({ summary: 'Update recipe' })
  @ApiOkResponse({ description: 'Recipe updated' })
  @Permissions('health:update')
  @Patch(':id')
  update(
    @Param() params: RecipeParamsDto,
    @Body() data: UpdateRecipeDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.recipesService.update(user.sub, params.id, data);
  }

  @ApiOperation({ summary: 'Delete recipe' })
  @ApiOkResponse({ description: 'Recipe deleted' })
  @Permissions('health:delete')
  @Delete(':id')
  remove(@Param() params: RecipeParamsDto, @ActiveUser() user: JwtPayload) {
    return this.recipesService.remove(user.sub, params.id);
  }

  @ApiOperation({ summary: 'Save a public recipe' })
  @ApiOkResponse({ description: 'Recipe saved' })
  @Permissions('health:create')
  @Post(':id/save')
  save(@Param() params: RecipeParamsDto, @ActiveUser() user: JwtPayload) {
    return this.recipesService.save(user.sub, params.id);
  }

  @ApiOperation({ summary: 'Unsave recipe' })
  @ApiOkResponse({ description: 'Recipe unsaved' })
  @Permissions('health:delete')
  @Delete(':id/save')
  unsave(@Param() params: RecipeParamsDto, @ActiveUser() user: JwtPayload) {
    return this.recipesService.unsave(user.sub, params.id);
  }

  @ApiOperation({ summary: 'Log recipe serving to food diary' })
  @ApiOkResponse({ description: 'Recipe logged as meal' })
  @Permissions('health:create')
  @Post(':id/log')
  logToDiary(
    @Param() params: RecipeParamsDto,
    @Body() data: LogRecipeDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.recipesService.logToDiary(user.sub, params.id, data);
  }
}
