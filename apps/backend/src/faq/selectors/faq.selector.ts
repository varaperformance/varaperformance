// FAQ Category selector
export const faqCategorySelector = {
  id: true,
  name: true,
  slug: true,
  description: true,
  order: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};
export type FaqCategorySelector = typeof faqCategorySelector;

// FAQ Category with count selector (for admin list)
export const faqCategoryWithCountSelector = {
  ...faqCategorySelector,
  _count: {
    select: { faqs: true },
  },
};
export type FaqCategoryWithCountSelector = typeof faqCategoryWithCountSelector;

// FAQ Category summary selector (for FAQ includes)
export const faqCategorySummarySelector = {
  id: true,
  name: true,
  slug: true,
};
export type FaqCategorySummarySelector = typeof faqCategorySummarySelector;

// FAQ selector
export const faqSelector = {
  id: true,
  question: true,
  answer: true,
  order: true,
  isActive: true,
  isFeatured: true,
  views: true,
  createdAt: true,
  updatedAt: true,
  category: { select: faqCategorySummarySelector },
};
export type FaqSelector = typeof faqSelector;

// Public FAQ selector (minimal for public display)
export const publicFaqSelector = {
  id: true,
  question: true,
  answer: true,
  isFeatured: true,
};
export type PublicFaqSelector = typeof publicFaqSelector;

// FAQ Category with FAQs selector (for public grouped view)
export const faqCategoryWithFaqsSelector = {
  id: true,
  name: true,
  slug: true,
  description: true,
  faqs: {
    where: { isActive: true },
    orderBy: { order: 'asc' as const },
    select: publicFaqSelector,
  },
};
export type FaqCategoryWithFaqsSelector = typeof faqCategoryWithFaqsSelector;
