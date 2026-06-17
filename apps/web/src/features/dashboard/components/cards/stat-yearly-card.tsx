import { StatCard } from '../shared/stat-card';

export function StatYearlyCard({
  totalWorkoutsThisYear,
}: {
  totalWorkoutsThisYear: number;
}) {
  return (
    <StatCard
      title="This Year"
      value={totalWorkoutsThisYear}
      unit="workouts"
      change="+12% YoY"
      trend="up"
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
