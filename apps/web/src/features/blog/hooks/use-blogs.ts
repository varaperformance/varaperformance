import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000';

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
}

// API Response Types
export interface ApiBlogAuthor {
  profile: {
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
  } | null;
  roles: string[];
}

export interface ApiBlogCategory {
  name: string;
  slug: string;
}

export interface ApiBlogTag {
  name: string;
  slug: string;
}

export interface ApiBlog {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  readTime: string;
  featured: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  views: number;
  likes: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: ApiBlogAuthor;
  category: ApiBlogCategory;
  tags: ApiBlogTag[];
}

export interface ApiBlogsResponse {
  success: boolean;
  data: {
    items: ApiBlog[];
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ApiBlogResponse {
  success: boolean;
  data: ApiBlog;
}

// Transformed blog type for UI
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  likes: number;
  category: string;
  categorySlug: string;
  tags: string[];
  author: {
    name: string;
    role: string;
    avatar: string;
    bio: string;
  };
  date: string;
  readTime: string;
  image: string;
  featured: boolean;
}

// Transform API response to UI format
function transformBlog(blog: ApiBlog): BlogPost {
  const authorName = blog.author.profile?.displayName ?? 'Anonymous';
  const avatarUrl = resolveMediaUrl(blog.author.profile?.avatarUrl);
  const roleNames = (blog.author.roles ?? []).filter(
    (role) => role.toUpperCase() !== 'USER',
  );
  const authorRole =
    roleNames.length > 0
      ? roleNames
          .map((role) =>
            role
              .toLowerCase()
              .split('_')
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(' '),
          )
          .join(' • ')
      : 'Author';
  return {
    id: blog.id,
    slug: blog.slug,
    title: blog.title,
    excerpt: blog.excerpt,
    content: blog.content,
    likes: blog.likes,
    category: blog.category.name,
    categorySlug: blog.category.slug,
    tags: blog.tags.map((t) => t.name),
    author: {
      name: authorName,
      role: authorRole,
      avatar:
        avatarUrl ??
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authorName)}`,
      bio: blog.author.profile?.bio ?? '',
    },
    date: blog.publishedAt
      ? new Date(blog.publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '',
    readTime: blog.readTime,
    image: resolveMediaUrl(blog.coverImage) ?? blog.coverImage,
    featured: blog.featured,
  };
}

export const blogKeys = {
  all: ['blogs'] as const,
  list: (limit: number, offset: number) =>
    [...blogKeys.all, limit, offset] as const,
  infinite: (limit: number) => [...blogKeys.all, 'infinite', limit] as const,
  detail: (slug: string | undefined) => ['blog', slug] as const,
};

// Fetch blogs hook
export function useBlogs(limit = 10, offset = 0) {
  return useQuery({
    queryKey: blogKeys.list(limit, offset),
    queryFn: async () => {
      const response = await api.get<ApiBlogsResponse>('blogs', {
        params: { limit, offset },
      });
      return {
        items: response.data.data.items.map(transformBlog),
        total: response.data.data.total,
        limit: response.data.data.limit,
        offset: response.data.data.offset,
      };
    },
    staleTime: 0,
  });
}

// Get featured and regular posts from the data
export function useBlogPosts(limit = 10, offset = 0) {
  const { data, isLoading, error } = useBlogs(limit, offset);

  const featuredPost = data?.items.find((post) => post.featured);
  // Exclude only the displayed featured post, not all featured posts
  const regularPosts =
    data?.items.filter((post) => post.id !== featuredPost?.id) ?? [];

  return {
    featuredPost,
    regularPosts,
    total: data?.total ?? 0,
    isLoading,
    error,
  };
}

// Infinite scroll hook for blogs
export function useBlogsInfinite(limit = 10) {
  return useInfiniteQuery({
    queryKey: blogKeys.infinite(limit),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get<ApiBlogsResponse>('blogs', {
        params: { limit, offset: pageParam },
      });
      return {
        items: response.data.data.items.map(transformBlog),
        total: response.data.data.total,
        limit: response.data.data.limit,
        offset: response.data.data.offset,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
  });
}

// Infinite scroll with featured/regular split
export function useBlogPostsInfinite(limit = 10) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useBlogsInfinite(limit);

  // Flatten all pages into single array
  const allPosts = data?.pages.flatMap((page) => page.items) ?? [];

  const featuredPost = allPosts.find((post) => post.featured);
  const regularPosts = allPosts.filter((post) => post.id !== featuredPost?.id);

  return {
    featuredPost,
    regularPosts,
    total: data?.pages[0]?.total ?? 0,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    error,
  };
}

// Fetch single blog by slug
export function useBlog(slug: string | undefined) {
  return useQuery({
    queryKey: blogKeys.detail(slug),
    queryFn: async () => {
      if (!slug) throw new Error('Slug is required');
      const response = await api.get<ApiBlogResponse>(`blogs/${slug}`);
      return transformBlog(response.data.data);
    },
    enabled: !!slug,
  });
}

// Fetch related blogs by category (excluding current blog)
export function useRelatedBlogs(
  categorySlug: string | undefined,
  excludeId: string | undefined,
  limit = 3,
) {
  // Fetch more posts to have enough after filtering
  const { data, isLoading, error } = useBlogs(20, 0);

  // Filter by category slug and exclude current blog
  const relatedPosts =
    data?.items
      .filter(
        (post) => post.id !== excludeId && post.categorySlug === categorySlug,
      )
      .slice(0, limit) ?? [];

  return {
    relatedPosts,
    isLoading,
    error,
  };
}
