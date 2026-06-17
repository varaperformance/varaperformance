import { z } from 'zod';

export const AchievementCategorySchema = z.enum([
  'WORKOUT',
  'NUTRITION',
  'STREAK',
  'SOCIAL',
  'COACHING',
  'COMMERCE',
]);

// Response types
export interface AchievementResponse {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: z.infer<typeof AchievementCategorySchema>;
  sortOrder: number;
}

export interface UserAchievementResponse {
  id: string;
  achievement: AchievementResponse;
  unlockedAt: string;
}

// Inferred types
export type AchievementCategory = z.infer<typeof AchievementCategorySchema>;
