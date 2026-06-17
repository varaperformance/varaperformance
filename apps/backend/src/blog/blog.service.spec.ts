import { BlogService } from './blog.service';
import type { SuccessResponse, ErrorResponse } from '@varaperformance/core';

const mockPrisma = {
  blog: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  tag: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
  },
};

describe('BlogService', () => {
  let service: BlogService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new BlogService(mockPrisma as any);
  });

  describe('createBlog', () => {
    it('returns conflict when slug already exists', async () => {
      mockPrisma.blog.findUnique.mockResolvedValueOnce({ id: 'existing' });

      const result = (await service.createBlog('author-1', {
        title: 'My Title',
        excerpt: 'x',
        content: 'c',
        coverImage: 'img',
        readTime: '5 min',
        featured: false,
        status: 'DRAFT',
        categoryId: 'cat-1',
        tags: [],
      })) as ErrorResponse;

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFLICT');
      expect(mockPrisma.blog.create).not.toHaveBeenCalled();
    });

    it('creates blog and tags when slug is free', async () => {
      mockPrisma.blog.findUnique.mockResolvedValueOnce(null); // checkSlug
      mockPrisma.tag.findMany
        .mockResolvedValueOnce([{ id: 'tag-2', name: 'news', slug: 'news' }]) // existing lookup
        .mockResolvedValueOnce([{ id: 'tag-1', name: 'tech', slug: 'tech' }]); // created lookup
      mockPrisma.tag.createMany.mockResolvedValueOnce({ count: 1 });
      const now = new Date();
      mockPrisma.blog.create.mockResolvedValue({
        id: 'blog-1',
        title: 'My Title',
        slug: 'my-title',
        excerpt: 'x',
        content: 'c',
        coverImage: 'img',
        readTime: '5 min',
        featured: false,
        status: 'DRAFT',
        publishedAt: null,
        authorId: 'author-1',
        categoryId: 'cat-1',
        createdAt: now,
        updatedAt: now,
      });

      const result = (await service.createBlog('author-1', {
        title: 'My Title',
        excerpt: 'x',
        content: 'c',
        coverImage: 'img',
        readTime: '5 min',
        featured: false,
        status: 'DRAFT',
        categoryId: 'cat-1',
        tags: ['tech', 'news'],
      })) as SuccessResponse;

      expect(result.success).toBe(true);
      expect(mockPrisma.tag.createMany).toHaveBeenCalledWith({
        data: [{ name: 'tech', slug: 'tech' }],
        skipDuplicates: true,
      });
      expect(mockPrisma.blog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'My Title',
          slug: 'my-title',
          authorId: 'author-1',
          categoryId: 'cat-1',
        }),
      });
    });
  });

  it('returns formatted blogs list with pagination', async () => {
    const now = new Date();
    mockPrisma.blog.findMany.mockResolvedValue([
      {
        id: 'b1',
        slug: 'hello',
        title: 'Hello',
        excerpt: 'e',
        content: 'c',
        coverImage: 'img',
        readTime: '5 min',
        featured: true,
        status: 'PUBLISHED',
        views: 1,
        likes: 2,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
        author: { profile: { displayName: 'A', bio: null } },
        category: { name: 'Cat', slug: 'cat' },
        tags: [{ name: 'tech', slug: 'tech' }],
      },
    ]);
    mockPrisma.blog.count.mockResolvedValue(1);

    const result = (await service.getBlogs({ limit: 5, offset: 0 })).data;

    expect(result.total).toBe(1);
    expect(result.items[0].createdAt).toBe(now.toISOString());
    expect(result.items[0].status).toBe('PUBLISHED');
  });

  it('getBlogBySlug returns not found when missing', async () => {
    mockPrisma.blog.findUnique.mockResolvedValueOnce(null);

    const result = (await service.getBlogBySlug('missing')) as ErrorResponse;

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('updateBlogBySlug returns not found when blog missing', async () => {
    mockPrisma.blog.findUnique.mockResolvedValueOnce(null);

    const result = (await service.updateBlogBySlug('missing', {
      title: 'New',
    })) as ErrorResponse;

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('updateBlogBySlug updates tags and category', async () => {
    mockPrisma.blog.findUnique
      .mockResolvedValueOnce({ id: 'b1' })
      .mockResolvedValueOnce(null);
    mockPrisma.tag.findMany
      .mockResolvedValueOnce([]) // existing lookup: none found
      .mockResolvedValueOnce([{ id: 't1', name: 'Tech', slug: 'tech' }]); // created lookup
    mockPrisma.tag.createMany.mockResolvedValueOnce({ count: 1 });
    const now = new Date();
    mockPrisma.blog.update.mockResolvedValue({
      id: 'b1',
      slug: 'hello',
      title: 'Hello',
      excerpt: 'e',
      content: 'c',
      coverImage: 'img',
      readTime: '5 min',
      featured: false,
      status: 'DRAFT',
      views: 0,
      likes: 0,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      author: { profile: { displayName: 'A', bio: null } },
      category: { name: 'Cat', slug: 'cat' },
      tags: [{ name: 'Tech', slug: 'tech' }],
    });

    const result = (await service.updateBlogBySlug('hello', {
      title: 'Hello',
      tags: ['Tech'],
      categoryId: 'cat-1',
    })) as SuccessResponse;

    expect(result.success).toBe(true);
    expect(mockPrisma.blog.update).toHaveBeenCalledWith({
      where: { slug: 'hello' },
      data: expect.objectContaining({ title: 'Hello' }),
      select: expect.any(Object),
    });
  });

  it('deleteBlogBySlug returns not found when missing', async () => {
    mockPrisma.blog.findUnique.mockResolvedValueOnce(null);

    const result = (await service.deleteBlogBySlug('missing')) as ErrorResponse;

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('deleteBlogBySlug deletes when exists', async () => {
    mockPrisma.blog.findUnique.mockResolvedValueOnce({ id: 'b1' });
    mockPrisma.blog.delete.mockResolvedValueOnce(undefined);

    const result = (await service.deleteBlogBySlug('hello')) as SuccessResponse;

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ message: 'Blog deleted successfully' });
  });

  it('checkSlug returns availability', async () => {
    mockPrisma.blog.findUnique.mockResolvedValueOnce(null);

    const result = await service.checkSlug('slug');

    expect(result.data.slugTaken).toBe(false);
    expect(result.data.slug).toBe('slug');
  });
});
