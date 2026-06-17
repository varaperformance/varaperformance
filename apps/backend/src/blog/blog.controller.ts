import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Get,
  Header,
  Query,
  Param,
  Delete,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { StorageService } from '@app/common/storage';
import { BlogService } from './blog.service';
import {
  BlogSlugParamsDto,
  CreateBlogDto,
  PaginationDto,
  UpdateBlogDto,
} from './dto/blog.dto';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import { Public } from 'src/idm/decorators/public.decorator';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { SkipAudit } from '@app/common/audit';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('blogs')
@Controller({
  version: '1',
  path: 'blogs',
})
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private readonly storageService: StorageService,
  ) {}

  @ApiOperation({ summary: 'Upload blog cover image' })
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
  @ApiOkResponse({ description: 'Blog cover image uploaded' })
  @Permissions('blog:create')
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
      folder: `blogs/${user.sub}`,
      originalName: file.originalname,
      contentType: file.mimetype,
      body: file.buffer,
      allowedMimeTypes,
    });

    return {
      success: true,
      data: { url: uploaded.url },
      message: 'Blog cover image uploaded',
    };
  }

  @ApiOperation({ summary: 'Create a blog post' })
  @ApiOkResponse({ description: 'Blog post created' })
  @Permissions('blog:create')
  @Post('create')
  async createBlog(
    @Body() createBlogDto: CreateBlogDto,
    @ActiveUser('sub') authorId: string,
  ) {
    return this.blogService.createBlog(authorId, createBlogDto);
  }

  @ApiOperation({ summary: 'Check if a slug is available' })
  @ApiOkResponse({ description: 'Slug availability status' })
  @Permissions('blog:create')
  @Get('slug/:slug')
  async checkSlug(@Param() params: BlogSlugParamsDto) {
    return this.blogService.checkSlug(params.slug);
  }

  @ApiOperation({ summary: 'Delete a blog post by slug' })
  @ApiOkResponse({ description: 'Blog post deleted' })
  @Permissions('blog:delete')
  @Delete(':slug')
  async deleteBlogBySlug(@Param() params: BlogSlugParamsDto) {
    return this.blogService.deleteBlogBySlug(params.slug);
  }

  @ApiOperation({ summary: 'Update a blog post by slug' })
  @ApiOkResponse({ description: 'Updated blog post' })
  @Permissions('blog:update')
  @Patch(':slug')
  async updateBlogBySlug(
    @Param() params: BlogSlugParamsDto,
    @Body() updateBlogDto: UpdateBlogDto,
  ) {
    return this.blogService.updateBlogBySlug(params.slug, updateBlogDto);
  }

  @ApiOperation({ summary: 'Get all blogs for admin management' })
  @ApiOkResponse({ description: 'Blog list with status' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiBearerAuth()
  @Permissions('blog:read')
  @Get('admin')
  async getBlogsAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.blogService.getBlogsAdmin(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @ApiOperation({ summary: 'Get a blog post by slug' })
  @ApiOkResponse({ description: 'Blog post detail' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get(':slug')
  async getBlogBySlug(@Param() params: BlogSlugParamsDto) {
    return this.blogService.getBlogBySlug(params.slug);
  }

  @ApiOperation({ summary: 'List blog posts' })
  @ApiOkResponse({ description: 'Paginated blog posts' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get()
  async getBlogs(@Query() pagination: PaginationDto) {
    return this.blogService.getBlogs(pagination);
  }
}
