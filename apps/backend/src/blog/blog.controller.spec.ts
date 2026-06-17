import { Test, TestingModule } from '@nestjs/testing';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { StorageService } from '@app/common/storage';

describe('BlogController', () => {
  let controller: BlogController;
  const blogService = {
    createBlog: jest.fn(),
    checkSlug: jest.fn(),
    deleteBlogBySlug: jest.fn(),
    updateBlogBySlug: jest.fn(),
    getBlogBySlug: jest.fn(),
    getBlogs: jest.fn(),
  } as const;
  const storageService = {
    uploadBuffer: jest.fn(),
  } as const;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogController],
      providers: [
        { provide: BlogService, useValue: blogService },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    controller = module.get<BlogController>(BlogController);
  });

  it('creates a blog for active user', async () => {
    const dto = { title: 'Hello' } as any;
    blogService.createBlog.mockResolvedValue({ success: true });

    const result = await controller.createBlog(dto, 'author-1');

    expect(result).toEqual({ success: true });
    expect(blogService.createBlog).toHaveBeenCalledWith('author-1', dto);
  });

  it('checks slug availability', async () => {
    blogService.checkSlug.mockResolvedValue({ success: true, data: {} });

    await controller.checkSlug({ slug: 'my-slug' } as any);

    expect(blogService.checkSlug).toHaveBeenCalledWith('my-slug');
  });

  it('deletes a blog by slug', async () => {
    blogService.deleteBlogBySlug.mockResolvedValue({ success: true });

    await controller.deleteBlogBySlug({ slug: 'hello' } as any);

    expect(blogService.deleteBlogBySlug).toHaveBeenCalledWith('hello');
  });

  it('updates a blog by slug', async () => {
    blogService.updateBlogBySlug.mockResolvedValue({ success: true });
    const dto = { title: 'New' } as any;

    await controller.updateBlogBySlug({ slug: 'hello' } as any, dto);

    expect(blogService.updateBlogBySlug).toHaveBeenCalledWith('hello', dto);
  });

  it('returns blog by slug', async () => {
    blogService.getBlogBySlug.mockResolvedValue({ success: true });

    await controller.getBlogBySlug({ slug: 'hello' } as any);

    expect(blogService.getBlogBySlug).toHaveBeenCalledWith('hello');
  });

  it('returns paginated blogs', async () => {
    blogService.getBlogs.mockResolvedValue({ success: true });
    const pagination = { limit: 5, offset: 0 } as any;

    await controller.getBlogs(pagination);

    expect(blogService.getBlogs).toHaveBeenCalledWith(pagination);
  });
});
