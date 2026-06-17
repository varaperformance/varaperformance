/**
 * Prisma select for stack - basic info without items
 */
export const stackListSelect = {
  id: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { items: true },
  },
};
export type StackListSelect = typeof stackListSelect;

/**
 * Prisma select for stack with items
 */
export const stackSelect = {
  id: true,
  userId: true,
  name: true,
  isActive: true,
  tips: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      stackId: true,
      name: true,
      dosage: true,
      timeSlot: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ timeSlot: 'asc' as const }, { createdAt: 'asc' as const }],
  },
};
export type StackSelect = typeof stackSelect;

/**
 * Prisma select for stack item
 */
export const stackItemSelect = {
  id: true,
  stackId: true,
  name: true,
  dosage: true,
  timeSlot: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};
export type StackItemSelect = typeof stackItemSelect;

/**
 * Prisma select for stack log
 */
export const stackLogSelect = {
  id: true,
  stackItemId: true,
  date: true,
  taken: true,
  createdAt: true,
};
export type StackLogSelect = typeof stackLogSelect;
