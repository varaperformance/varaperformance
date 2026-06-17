/**
 * Prisma select for water log
 */
export const waterLogSelect = {
  id: true,
  userId: true,
  amount: true,
  unit: true,
  loggedAt: true,
  createdAt: true,
};
export type WaterLogSelect = typeof waterLogSelect;

/**
 * Prisma select for water goal
 */
export const waterGoalSelect = {
  id: true,
  userId: true,
  targetAmount: true,
  targetUnit: true,
  createdAt: true,
  updatedAt: true,
};
export type WaterGoalSelect = typeof waterGoalSelect;
