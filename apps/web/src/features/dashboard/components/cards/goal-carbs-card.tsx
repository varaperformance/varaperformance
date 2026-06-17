import { GoalWidget } from '../shared/goal-widget';

interface NutritionData {
  progress?: { carbs?: number };
  totals?: { carbs?: number };
  goal?: { targetCarbs?: number } | null;
}

export function GoalCarbsCard({
  nutrition,
  isLoading,
}: {
  nutrition: NutritionData | undefined;
  isLoading: boolean;
}) {
  return (
    <GoalWidget
      title="Carbs"
      progress={nutrition?.progress?.carbs ?? 0}
      current={nutrition?.totals?.carbs ?? 0}
      target={nutrition?.goal?.targetCarbs ?? 250}
      unit="g"
      isLoading={isLoading}
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
  );
}
