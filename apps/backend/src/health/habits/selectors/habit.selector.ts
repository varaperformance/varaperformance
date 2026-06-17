export const habitSelect = {
  id: true,
  userId: true,
  name: true,
  icon: true,
  color: true,
  isActive: true,
  sortOrder: true,
  linkedModule: true,
  currentStreak: true,
  longestStreak: true,
  lastCompletedDate: true,
  createdAt: true,
} as const;

export const habitLogSelect = {
  id: true,
  habitId: true,
  date: true,
  completed: true,
  createdAt: true,
} as const;
