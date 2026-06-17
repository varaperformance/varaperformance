import { StatCard } from '../shared/stat-card';

export interface StatsGridCardProps {
  currentStreak: number;
  totalWorkoutsThisYear: number;
  totalCaloriesThisYear: number;
  prs: { items?: Array<{ exercise?: { name?: string } }> } | undefined;
}

export function StatsGridCard({
  currentStreak,
  totalWorkoutsThisYear,
  totalCaloriesThisYear,
  prs,
}: StatsGridCardProps) {
  return (
    <div className="grid h-full grid-cols-2 gap-3 md:grid-cols-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
      <StatCard
        title="Current Streak"
        value={currentStreak}
        unit="days"
        change="Best: 45 days"
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
              d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
            />
          </svg>
        }
      />
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
      <StatCard
        title="Personal Records"
        value={prs?.items?.length ?? 0}
        unit="PRs"
        change={
          prs?.items?.length
            ? `Latest: ${prs.items[0]?.exercise?.name ?? 'N/A'}`
            : 'None recorded'
        }
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
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        }
      />
    </div>
  );
}
