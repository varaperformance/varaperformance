// Profile selector limited to public fields needed for blog pages
export const blogProfileSelector = {
  displayName: true,
  bio: true,
  avatarUrl: true,
};
export type BlogProfileSelector = typeof blogProfileSelector;

// Category selector for blogs
export const blogCategorySelector = {
  name: true,
  slug: true,
};
export type BlogCategorySelector = typeof blogCategorySelector;

// Tag selector for blogs
export const blogTagSelector = {
  name: true,
  slug: true,
};
export type BlogTagSelector = typeof blogTagSelector;

// Author selector - includes profile with displayName
export const blogAuthorSelector = {
  profile: { select: blogProfileSelector },
  roles: {
    select: {
      role: {
        select: {
          name: true,
        },
      },
    },
  },
};
export type BlogAuthorSelector = typeof blogAuthorSelector;

// Prisma Selector for Blogs (with category, tags, author public info)
export const blogSelector = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  content: true,
  coverImage: true,
  readTime: true,
  featured: true,
  status: true,
  views: true,
  likes: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  // Only expose public author profile fields
  author: { select: blogAuthorSelector },
  category: { select: blogCategorySelector },
  tags: { select: blogTagSelector },
};
export type BlogSelector = typeof blogSelector;
