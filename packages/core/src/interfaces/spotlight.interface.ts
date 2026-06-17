import type { Published } from '../schemas/blog.schema';

export interface SpotlightStory {
  id: string;
  slug: string;
  name: string;
  username: string | null;
  imageUrl: string;
  videoUrl: string | null;
  tagline: string;
  story: string;
  achievements: string[];
  sport: string;
  memberSince: string | null;
  quote: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  featured: boolean;
  status: Published;
  isActive: boolean;
  submitterUserId: string | null;
  submitterEmail: string | null;
  reviewNotes: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSpotlightStory {
  id: string;
  slug: string;
  name: string;
  username: string | null;
  imageUrl: string;
  videoUrl: string | null;
  tagline: string;
  story: string;
  achievements: string[];
  sport: string;
  memberSince: string | null;
  quote: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  featured: boolean;
  publishedAt: string | null;
}
