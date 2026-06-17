import { GoalWidget } from '../shared/goal-widget';

interface NutritionData {
  progress?: { protein?: number };
  totals?: { protein?: number };
  goal?: { targetProtein?: number } | null;
}

export function GoalProteinCard({
  nutrition,
  isLoading,
}: {
  nutrition: NutritionData | undefined;
  isLoading: boolean;
}) {
  return (
    <GoalWidget
      title="Protein"
      progress={nutrition?.progress?.protein ?? 0}
      current={nutrition?.totals?.protein ?? 0}
      target={nutrition?.goal?.targetProtein ?? 150}
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      }
    />
  );
}
