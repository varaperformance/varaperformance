import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export function StrengthProgressCard() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-4 w-4 text-chart-3"
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
          Strength Progress (1RM)
        </CardTitle>
        <CardDescription>Big 3 lifts over 6 months</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
          <p className="text-sm font-medium">No 1RM history available</p>
          <p className="text-xs text-muted-foreground">
            Track max attempts to unlock your strength trend.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
