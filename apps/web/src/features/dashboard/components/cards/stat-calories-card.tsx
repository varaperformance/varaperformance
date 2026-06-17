import { StatCard } from '../shared/stat-card';

export function StatCaloriesCard({
  totalCaloriesThisYear,
}: {
  totalCaloriesThisYear: number;
}) {
  return (
    <StatCard
      title="Calories Burned"
      value={totalCaloriesThisYear.toLocaleString()}
      unit="kcal"
      change="Avg 320/workout"
      trend="neutral"
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
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      }
    />
  );
}
