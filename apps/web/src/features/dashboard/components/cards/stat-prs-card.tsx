import { StatCard } from '../shared/stat-card';

export interface StatPrsCardProps {
  prs: { items?: Array<{ exercise?: { name?: string } }> } | undefined;
}

export function StatPrsCard({ prs }: StatPrsCardProps) {
  return (
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
  );
}
