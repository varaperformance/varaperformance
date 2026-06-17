import { GoalWidget } from '../shared/goal-widget';

interface SleepData {
  hours: number;
  goal: number;
  percent: number;
}

export function GoalSleepCard({
  sleepToday,
  isLoading,
}: {
  sleepToday: SleepData | undefined;
  isLoading: boolean;
}) {
  return (
    <GoalWidget
      title="Sleep"
      progress={sleepToday?.percent ?? 0}
      current={sleepToday?.hours ?? 0}
      target={sleepToday?.goal ?? 8}
      unit=" hrs"
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
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      }
    />
  );
}
