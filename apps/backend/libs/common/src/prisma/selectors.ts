// Prisma Selector for User Authentication
export const userAuthSelector = {
  id: true,
  email: true,
  password: true,
  roles: true,
};
export type UserAuthSelector = typeof userAuthSelector;

// Prisma Selector for User Registration (excludes sensitive fields)
export const userPublicSelector = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
};
export type UserPublicSelector = typeof userPublicSelector;
