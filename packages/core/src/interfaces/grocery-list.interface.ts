export interface GroceryListItemResponse {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  isChecked: boolean;
  sortOrder: number;
  note: string | null;
  foodId: string | null;
}

export interface GroceryListDetailResponse {
  id: string;
  name: string;
  status: string;
  mealPlanId: string | null;
  mealPlanName: string | null;
  items: GroceryListItemResponse[];
  checkedCount: number;
  totalCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroceryListSummary {
  id: string;
  name: string;
  status: string;
  mealPlanName: string | null;
  checkedCount: number;
  totalCount: number;
  createdAt: string;
  updatedAt: string;
}
