import { GoalWidget } from '../shared/goal-widget';

interface NutritionData {
  progress?: { calories?: number };
  totals?: { calories?: number };
  goal?: { targetCalories?: number } | null;
}

export function GoalCaloriesCard({
  nutrition,
  isLoading,
}: {
  nutrition: NutritionData | undefined;
  isLoading: boolean;
}) {
  return (
    <GoalWidget
      title="Calories"
      progress={nutrition?.progress?.calories ?? 0}
      current={nutrition?.totals?.calories ?? 0}
      target={nutrition?.goal?.targetCalories ?? 2000}
      unit=" kcal"
      isLoading={isLoading}
      icon={
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
          />
        </svg>
      }
    />
  );
}
