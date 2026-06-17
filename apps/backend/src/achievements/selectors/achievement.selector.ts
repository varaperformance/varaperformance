export const achievementSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  icon: true,
  category: true,
  sortOrder: true,
} as const;

export const userAchievementSelect = {
  id: true,
  unlockedAt: true,
  achievement: {
    select: achievementSelect,
  },
} as const;
