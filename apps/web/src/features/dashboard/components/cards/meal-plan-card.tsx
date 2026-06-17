import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export interface MealPlanStatus {
  name: string;
  itemCount: number;
  groceryProgress: {
    checked: number;
    total: number;
    percent: number;
  } | null;
}

export function MealPlanCard({
  mealPlanStatus,
}: {
  mealPlanStatus: MealPlanStatus | null;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-4 w-4 text-chart-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          Meal Plan
        </CardTitle>
        <CardDescription>Current plan & grocery progress</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {mealPlanStatus ? (
          <div className="space-y-3">
            <div>
              <p className="text-lg font-semibold">{mealPlanStatus.name}</p>
              <p className="text-xs text-muted-foreground">
                {mealPlanStatus.itemCount} meal items planned
              </p>
            </div>
            {mealPlanStatus.groceryProgress ? (
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Grocery List</span>
                  <span>
                    {mealPlanStatus.groceryProgress.checked}/
                    {mealPlanStatus.groceryProgress.total} items
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-chart-3"
                    style={{
                      width: `${mealPlanStatus.groceryProgress.percent}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mealPlanStatus.groceryProgress.percent}% complete
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No active grocery list for this plan.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">No active meal plan</p>
            <p className="text-xs text-muted-foreground">
              Create a meal plan to see your weekly nutrition schedule.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
