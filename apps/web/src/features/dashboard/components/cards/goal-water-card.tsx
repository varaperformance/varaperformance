import { GoalWidget } from '../shared/goal-widget';

interface WaterData {
  progress?: number;
  totalOz?: number;
  goal?: { targetAmount: number; targetUnit: string } | null;
}

export function GoalWaterCard({
  water,
  isLoading,
}: {
  water: WaterData | undefined;
  isLoading: boolean;
}) {
  return (
    <GoalWidget
      title="Water"
      progress={water?.progress ?? 0}
      current={water?.totalOz ?? 0}
      target={water?.goal?.targetAmount ?? 128}
      unit=" oz"
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
