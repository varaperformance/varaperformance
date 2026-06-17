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
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/ui/chart';
import type { ChartColors } from '../../lib/types';

export function StepTrendCard({
  data,
  goal,
  isLoading,
  chartColors,
}: {
  data: Array<{ date: string; steps: number }> | undefined;
  goal: number;
  isLoading: boolean;
  chartColors: ChartColors;
}) {
  const hasData = data && data.length > 0;

  const coloredData = data?.map((d) => {
    const percent = goal > 0 ? d.steps / goal : 0;
    let fill: string;
    if (percent >= 1)
      fill = chartColors.chart2; // green — met goal
    else if (percent >= 0.7)
      fill = chartColors.chart3; // amber — close
    else fill = chartColors.chart1; // red — below
    return { ...d, fill };
  });

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
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          Step Trend
        </CardTitle>
        <CardDescription>Daily steps over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : hasData ? (
          <ChartContainer className="flex-1 min-h-0">
            <BarChart data={coloredData}>
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
                stroke={chartColors.mutedForeground}
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={chartColors.mutedForeground}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartColors.background,
                  border: `1px solid ${chartColors.border}`,
                  borderRadius: '8px',
                }}
                formatter={(value: number | undefined) => [
                  (value ?? 0).toLocaleString(),
                  'Steps',
                ]}
                labelFormatter={(label) => {
                  const parsed = new Date(`${label}T00:00:00Z`);
                  return parsed.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });
                }}
              />
              <ReferenceLine
                y={goal}
                stroke={chartColors.mutedForeground}
                strokeDasharray="3 3"
                label={{
                  value: `Goal: ${goal.toLocaleString()}`,
                  position: 'right',
                  fontSize: 10,
                  fill: chartColors.mutedForeground,
                }}
              />
              <Bar dataKey="steps" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">No step data yet</p>
            <p className="text-xs text-muted-foreground">
              Sync a wearable or log steps manually to see your trend.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
