import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/ui/chart';
import type { ChartColors } from '../../lib/types';

export interface LifestyleInsights {
  adherenceScore: number;
  adherenceTarget: number;
  recoveryScore: number;
  recoveryTrend: 'up' | 'down' | 'stable' | 'neutral';
  trend: Array<{ date: string; recoveryScore: number; adherenceScore: number }>;
  currentWeek: {
    workoutDays: number;
    workoutTarget: number;
    nutritionDays: number;
  };
}

export function SleepRecoveryCard({
  lifestyleInsights,
  isLoading,
  hasTrendData,
  chartColors,
}: {
  lifestyleInsights: LifestyleInsights | undefined;
  isLoading: boolean;
  hasTrendData: boolean;
  chartColors: ChartColors;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-4 w-4 text-chart-4"
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
          Sleep & Recovery
        </CardTitle>
        <CardDescription>
          Adherence score and 14-day recovery trend
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : hasTrendData && lifestyleInsights ? (
          <>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Adherence</p>
                <p className="text-2xl font-semibold leading-none">
                  {lifestyleInsights.adherenceScore}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Target {lifestyleInsights.adherenceTarget}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Recovery</p>
                <p className="text-lg font-semibold leading-none">
                  {Math.round(lifestyleInsights.recoveryScore)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lifestyleInsights.recoveryTrend === 'up'
                    ? 'Improving'
                    : lifestyleInsights.recoveryTrend === 'down'
                      ? 'Declining'
                      : 'Stable'}
                </p>
              </div>
            </div>
            <ChartContainer className="flex-1 min-h-0">
              <AreaChart data={lifestyleInsights.trend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.border}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const parsed = new Date(`${value}T00:00:00Z`);
                    return `${parsed.getUTCMonth() + 1}/${parsed.getUTCDate()}`;
                  }}
                  interval={3}
                  stroke={chartColors.mutedForeground}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke={chartColors.mutedForeground}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.background,
                    border: `1px solid ${chartColors.border}`,
                    borderRadius: '8px',
                  }}
                />
                <Area
                  dataKey="recoveryScore"
                  type="monotone"
                  stroke={chartColors.chart4}
                  fill={chartColors.chart4}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  name="Recovery"
                />
                <Area
                  dataKey="adherenceScore"
                  type="monotone"
                  stroke={chartColors.chart2}
                  fill={chartColors.chart2}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name="Adherence"
                />
              </AreaChart>
            </ChartContainer>
            <p className="mt-2 text-xs text-muted-foreground">
              Workouts {lifestyleInsights.currentWeek.workoutDays}/
              {lifestyleInsights.currentWeek.workoutTarget} this week, nutrition
              logged on {lifestyleInsights.currentWeek.nutritionDays} days.
            </p>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">No recovery trend data</p>
            <p className="text-xs text-muted-foreground">
              Log workouts, meals, and water intake this week to unlock
              adherence and recovery insights.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
