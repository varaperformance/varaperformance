import { DatabaseService } from '@app/database';
import { Injectable } from '@nestjs/common';
import { CreateBlogDto, UpdateBlogDto } from './dto/blog.dto';
import {
  ErrorResponse,
  SuccessResponse,
  BlogResponse,
  BlogsListData,
  SlugCheckData,
  BlogDeleteData,
} from '@varaperformance/core';
import type { Pagination } from '@varaperformance/core';
import { blogSelector } from './selectors/blog.selector';

@Injectable()
export class BlogService {
  constructor(private readonly prismaService: DatabaseService) {}

  async createBlog(
    authorId: string,
    createBlogDto: CreateBlogDto,
  ): Promise<SuccessResponse | ErrorResponse> {
    const {
      title,
      excerpt,
      content,
      coverImage,
      readTime,
      featured,
      status,
      publishedAt,
      categoryId,
      tags,
    } = createBlogDto;
    const slug = this.slugify(title);
    const existingSlug = await this.checkSlug(title);
    if (existingSlug.data.slugTaken) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Slug already exists. Please choose a different title.',
          details: { slug },
        },
      };
    }

    let tagConnect: { id: string }[] = [];
    if (tags && tags.length > 0) {
      const tagEntities = await this.findOrCreateTags(tags);
      tagConnect = tagEntities.map((tag) => ({ id: tag.id }));
    }
    const newBlog = await this.prismaService.blog.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        coverImage,
        readTime,
        featured,
        status,
        publishedAt,
        authorId,
        categoryId,
        tags: {
          connect: tagConnect,
        },
      },
    });
    return { success: true, data: newBlog };
  }

  async getBlogs(
    pagination?: Pagination,
  ): Promise<SuccessResponse<BlogsListData>> {
    const limit = pagination?.limit ?? 10; // override schema default to 10
    const offset = pagination?.offset ?? 0;
    const now = new Date();
    const where = {
      status: 'PUBLISHED' as const,
      publishedAt: {
        not: null,
        lte: now,
      },
    };

    const [items, total] = await Promise.all([
      this.prismaService.blog.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: blogSelector,
      }),
      this.prismaService.blog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: items.map((b) => this.formatBlog(b)),
        total,
        limit,
        offset,
      },
    };
  }

  /**
   * Get all blogs for admin management with status filtering
   */
  async getBlogsAdmin(
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<
    SuccessResponse<{
      items: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasMore: boolean;
    }>
  > {
    const skip = (page - 1) * limit;

    const where: NonNullable<
      Parameters<typeof this.prismaService.blog.findMany>[0]
    >['where'] = {};
    if (status) {
      where.status = status as any;
    }

    const [blogs, total] = await Promise.all([
      this.prismaService.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          featured: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
          category: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prismaService.blog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: blogs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + blogs.length < total,
      },
    };
  }

  async getBlogBySlug(
    slug: string,
  ): Promise<SuccessResponse<BlogResponse> | ErrorResponse> {
    const blog = await this.prismaService.blog.findUnique({
      where: { slug },
      select: blogSelector,
    });
    if (!blog) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Blog not found',
        },
      };
    }
    return { success: true, data: this.formatBlog(blog) };
  }

  async updateBlogBySlug(
    slug: string,
    updateData: UpdateBlogDto,
  ): Promise<SuccessResponse | ErrorResponse> {
    const existingBlog = await this.prismaService.blog.findUnique({
      where: { slug },
    });
    if (!existingBlog) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Blog not found',
        },
      };
    }

    const { tags, categoryId, ...rest } = updateData;

    let tagConnect: { id: string }[] | undefined;
    if (tags && tags.length > 0) {
      const tagEntities = await this.findOrCreateTags(tags);
      tagConnect = tagEntities.map((tag) => ({ id: tag.id }));
    }

    const updatedBlog = await this.prismaService.blog.update({
      where: { slug },
      data: {
        ...rest,
        ...(categoryId && { category: { connect: { id: categoryId } } }),
        ...(tagConnect && { tags: { set: [], connect: tagConnect } }),
      },
      select: blogSelector,
    });
    return { success: true, data: updatedBlog };
  }

  async deleteBlogBySlug(
    slug: string,
  ): Promise<SuccessResponse<BlogDeleteData> | ErrorResponse> {
    const existingBlog = await this.prismaService.blog.findUnique({
      where: { slug },
    });
    if (!existingBlog) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Blog not found',
        },
      };
    }
    await this.prismaService.blog.delete({
      where: { slug },
    });
    return { success: true, data: { message: 'Blog deleted successfully' } };
  }

  async checkSlug(slug: string): Promise<SuccessResponse<SlugCheckData>> {
    const slugTaken = await this.prismaService.blog.findUnique({
      where: { slug },
    });
    return { success: true, data: { slugTaken: !!slugTaken, slug } };
  }

  private slugify(title: string): string {
    return title
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
  }

  private async findOrCreateTags(tags: string[]) {
    const existing = await this.prismaService.tag.findMany({
      where: { name: { in: tags } },
    });
    const existingMap = new Map(existing.map((t) => [t.name, t]));

    const missing = tags.filter((name) => !existingMap.has(name));
    if (missing.length > 0) {
      await this.prismaService.tag.createMany({
        data: missing.map((name) => ({ name, slug: this.slugify(name) })),
        skipDuplicates: true,
      });
      const created = await this.prismaService.tag.findMany({
        where: { name: { in: missing } },
      });
      for (const t of created) {
        existingMap.set(t.name, t);
      }
    }

    const result = tags
      .map((name) => existingMap.get(name))
      .filter((tag): tag is (typeof existing)[number] => tag !== undefined);

    if (result.length !== tags.length) {
      throw new Error(
        `Failed to find or create all tags. Expected ${tags.length}, got ${result.length}`,
      );
    }

    return result;
  }

  private formatBlog(blog: {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    coverImage: string;
    readTime: string;
    featured: boolean;
    status: string;
    views: number;
    likes: number;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    author: {
      profile: { displayName: string | null; bio: string | null } | null;
      roles?: { role: { name: string } }[];
    };
    category: { name: string; slug: string };
    tags: { name: string; slug: string }[];
  }): BlogResponse {
    return {
      ...blog,
      status: blog.status as BlogResponse['status'],
      publishedAt: blog.publishedAt?.toISOString() ?? null,
      createdAt: blog.createdAt.toISOString(),
      updatedAt: blog.updatedAt.toISOString(),
      author: {
        ...blog.author,
        roles: (blog.author.roles ?? []).map((userRole) => userRole.role.name),
      },
    };
  }
}
