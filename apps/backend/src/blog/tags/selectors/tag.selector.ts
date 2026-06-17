import { Prisma } from '@generated/prisma';

export const tagSelector = {
  id: true,
  name: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TagSelect;

export const tagWithCountSelector = {
  ...tagSelector,
  _count: {
    select: {
      posts: true,
    },
  },
} satisfies Prisma.TagSelect;

export type TagSelect = Prisma.TagGetPayload<{
  select: typeof tagSelector;
}>;

export type TagWithCountSelect = Prisma.TagGetPayload<{
  select: typeof tagWithCountSelector;
}>;
