/**
 * Blog author profile (public info only)
 */
export interface BlogAuthorProfile {
  displayName: string | null;
  bio: string | null;
}

/**
 * Blog author with profile
 */
export interface BlogAuthor {
  profile: BlogAuthorProfile | null;
  roles: string[];
}

/**
 * Blog category
 */
export interface BlogCategory {
  name: string;
  slug: string;
}

/**
 * Blog tag
 */
export interface BlogTag {
  name: string;
  slug: string;
}

/**
 * Blog response returned from API
 */
export interface BlogResponse {
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
  author: BlogAuthor;
  category: BlogCategory;
  tags: BlogTag[];
}

/**
 * Paginated blogs list response (offset-based)
 */
export interface BlogsListData {
  items: BlogResponse[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Slug check response
 */
export interface SlugCheckData {
  slugTaken: boolean;
  slug: string;
}

/**
 * Blog deletion response
 */
export interface BlogDeleteData {
  message: string;
}
