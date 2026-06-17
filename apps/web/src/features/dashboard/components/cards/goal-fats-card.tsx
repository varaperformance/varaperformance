import { GoalWidget } from '../shared/goal-widget';

interface NutritionData {
  progress?: { fat?: number };
  totals?: { fat?: number };
  goal?: { targetFat?: number } | null;
}

export function GoalFatsCard({
  nutrition,
  isLoading,
}: {
  nutrition: NutritionData | undefined;
  isLoading: boolean;
}) {
  return (
    <GoalWidget
      title="Fats"
      progress={nutrition?.progress?.fat ?? 0}
      current={nutrition?.totals?.fat ?? 0}
      target={nutrition?.goal?.targetFat ?? 65}
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3c-1.2 0-4.6 5.4-4.6 9.6a4.6 4.6 0 009.2 0C16.6 8.4 13.2 3 12 3z"
          />
        </svg>
      }
    />
  );
}
