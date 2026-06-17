import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface LifestyleAdherenceData {
  adherenceScore: number;
  adherenceTarget: number;
  adherenceTrend: 'up' | 'down' | 'stable' | 'neutral';
  adherenceDelta: number;
  recoveryScore: number;
  currentWeek: {
    workoutDays: number;
    workoutTarget: number;
    nutritionDays: number;
  };
}

export function LifestyleAdherenceCard({
  lifestyleInsights,
  isLoading,
}: {
  lifestyleInsights: LifestyleAdherenceData | undefined;
  isLoading: boolean;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-4 w-4 text-chart-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Lifestyle Adherence
        </CardTitle>
        <CardDescription>Weekly adherence & recovery score</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : lifestyleInsights ? (
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-semibold">
                  {lifestyleInsights.adherenceScore}%
                </p>
                <p className="text-xs text-muted-foreground">Adherence score</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">
                  {Math.round(lifestyleInsights.recoveryScore)}
                </p>
                <p className="text-xs text-muted-foreground">Recovery</p>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-chart-2"
                style={{
                  width: `${Math.min(100, lifestyleInsights.adherenceScore)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {lifestyleInsights.adherenceTrend === 'up'
                  ? '↑'
                  : lifestyleInsights.adherenceTrend === 'down'
                    ? '↓'
                    : '→'}{' '}
                {lifestyleInsights.adherenceDelta > 0 ? '+' : ''}
                {lifestyleInsights.adherenceDelta}% vs last week
              </span>
              <span>Target: {lifestyleInsights.adherenceTarget}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Workouts {lifestyleInsights.currentWeek.workoutDays}/
              {lifestyleInsights.currentWeek.workoutTarget}, Nutrition{' '}
              {lifestyleInsights.currentWeek.nutritionDays}/7 days
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">No adherence data</p>
            <p className="text-xs text-muted-foreground">
              Log workouts and meals to track lifestyle adherence.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
