import { GoalWidget } from '../shared/goal-widget';

interface NutritionData {
  progress?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    water?: number;
  };
  totals?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  goal?: {
    targetCalories?: number;
    targetProtein?: number;
    targetCarbs?: number;
    targetFat?: number;
  } | null;
}

interface WaterData {
  progress?: number;
  totalOz?: number;
  goal?: { targetAmount: number; targetUnit: string } | null;
}

export function DailyGoalsCard({
  weeklyWorkouts,
  nutrition,
  water,
  isLoadingNutrition,
  isLoadingWater,
}: {
  weeklyWorkouts: number;
  nutrition: NutritionData | undefined;
  water: WaterData | undefined;
  isLoadingNutrition: boolean;
  isLoadingWater: boolean;
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
      <GoalWidget
        title="Workouts"
        progress={weeklyWorkouts >= 5 ? 100 : (weeklyWorkouts / 5) * 100}
        current={weeklyWorkouts}
        target={5}
        unit=" this week"
        isLoading={false}
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
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        }
      />
      <GoalWidget
        title="Calories"
        progress={nutrition?.progress?.calories ?? 0}
        current={nutrition?.totals?.calories ?? 0}
        target={nutrition?.goal?.targetCalories ?? 2000}
        unit=" kcal"
        isLoading={isLoadingNutrition}
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
      <GoalWidget
        title="Protein"
        progress={nutrition?.progress?.protein ?? 0}
        current={nutrition?.totals?.protein ?? 0}
        target={nutrition?.goal?.targetProtein ?? 150}
        unit="g"
        isLoading={isLoadingNutrition}
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        }
      />
      <GoalWidget
        title="Carbs"
        progress={nutrition?.progress?.carbs ?? 0}
        current={nutrition?.totals?.carbs ?? 0}
        target={nutrition?.goal?.targetCarbs ?? 250}
        unit="g"
        isLoading={isLoadingNutrition}
        icon={
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        }
      />
      <GoalWidget
        title="Fats"
        progress={nutrition?.progress?.fat ?? 0}
        current={nutrition?.totals?.fat ?? 0}
        target={nutrition?.goal?.targetFat ?? 65}
        unit="g"
        isLoading={isLoadingNutrition}
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
              d="M12 3c-1.2 0-4.6 5.4-4.6 9.6a4.6 4.6 0 009.2 0C16.6 8.4 13.2 3 12 3z"
            />
          </svg>
        }
      />
      <GoalWidget
        title="Water"
        progress={water?.progress ?? 0}
        current={water?.totalOz ?? 0}
        target={water?.goal?.targetAmount ?? 128}
        unit=" oz"
        isLoading={isLoadingWater}
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
              d="M12 3c-1.2 0-4.6 5.4-4.6 9.6a4.6 4.6 0 009.2 0C16.6 8.4 13.2 3 12 3z"
            />
          </svg>
        }
      />
    </div>
  );
}
