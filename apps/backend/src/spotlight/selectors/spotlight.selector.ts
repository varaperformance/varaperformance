export const spotlightSelector = {
  id: true,
  slug: true,
  name: true,
  username: true,
  imageUrl: true,
  videoUrl: true,
  tagline: true,
  story: true,
  achievements: true,
  sport: true,
  memberSince: true,
  quote: true,
  twitterUrl: true,
  instagramUrl: true,
  featured: true,
  status: true,
  isActive: true,
  submitterUserId: true,
  submitterEmail: true,
  reviewNotes: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
};

export type SpotlightSelector = typeof spotlightSelector;

export const publicSpotlightSelector = {
  id: true,
  slug: true,
  name: true,
  username: true,
  imageUrl: true,
  videoUrl: true,
  tagline: true,
  story: true,
  achievements: true,
  sport: true,
  memberSince: true,
  quote: true,
  twitterUrl: true,
  instagramUrl: true,
  featured: true,
  publishedAt: true,
};

export type PublicSpotlightSelector = typeof publicSpotlightSelector;
