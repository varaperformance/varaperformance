export const recipeCategoryListSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { recipes: true },
  },
} as const;

export const recipeCategorySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;
