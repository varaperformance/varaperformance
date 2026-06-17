import { Prisma } from '@generated/prisma';

export const categorySelector = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CategorySelect;

export const categoryWithCountSelector = {
  ...categorySelector,
  _count: {
    select: {
      posts: true,
    },
  },
} satisfies Prisma.CategorySelect;

export type CategorySelect = Prisma.CategoryGetPayload<{
  select: typeof categorySelector;
}>;

export type CategoryWithCountSelect = Prisma.CategoryGetPayload<{
  select: typeof categoryWithCountSelector;
}>;
