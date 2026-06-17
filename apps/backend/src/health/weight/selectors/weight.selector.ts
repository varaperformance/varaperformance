/**
 * Prisma select for weight log - includes encryption fields
 */
export const weightLogSelect = {
  id: true,
  userId: true,
  encryptedData: true,
  dataIv: true,
  dataAuthTag: true,
  wrappedKey: true,
  loggedAt: true,
  encryptedNote: true,
  noteIv: true,
  noteAuthTag: true,
  noteWrappedKey: true,
  createdAt: true,
  updatedAt: true,
};
export type WeightLogSelect = typeof weightLogSelect;

/**
 * Prisma select for weight goal - includes encryption fields
 */
export const weightGoalSelect = {
  id: true,
  userId: true,
  encryptedTargetWeight: true,
  targetWeightIv: true,
  targetWeightAuthTag: true,
  targetWeightWrappedKey: true,
  goalType: true,
  weeklyRateLb: true,
  createdAt: true,
  updatedAt: true,
};
export type WeightGoalSelect = typeof weightGoalSelect;
