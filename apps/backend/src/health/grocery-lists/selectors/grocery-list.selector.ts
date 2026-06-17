export const groceryListSelect = {
  id: true,
  userId: true,
  name: true,
  status: true,
  mealPlanId: true,
  mealPlan: { select: { name: true } },
  items: {
    select: {
      id: true,
      name: true,
      quantity: true,
      unit: true,
      category: true,
      isChecked: true,
      sortOrder: true,
      note: true,
      foodId: true,
    },
    orderBy: [
      { isChecked: 'asc' as const },
      { sortOrder: 'asc' as const },
      { name: 'asc' as const },
    ],
  },
  createdAt: true,
  updatedAt: true,
};
export type GroceryListSelect = typeof groceryListSelect;

export const groceryListSummarySelect = {
  id: true,
  name: true,
  status: true,
  mealPlanId: true,
  mealPlan: { select: { name: true } },
  _count: { select: { items: true } },
  items: {
    select: { isChecked: true },
  },
  createdAt: true,
  updatedAt: true,
};
export type GroceryListSummarySelect = typeof groceryListSummarySelect;
