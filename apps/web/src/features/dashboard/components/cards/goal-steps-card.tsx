import { GoalWidget } from '../shared/goal-widget';

interface StepsData {
  steps: number;
  goal: number;
  percent: number;
}

export function GoalStepsCard({
  stepsToday,
  isLoading,
}: {
  stepsToday: StepsData | undefined;
  isLoading: boolean;
}) {
  return (
    <GoalWidget
      title="Steps"
      progress={stepsToday?.percent ?? 0}
      current={stepsToday?.steps ?? 0}
      target={stepsToday?.goal ?? 10000}
      unit=" steps"
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
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      }
    />
  );
}
