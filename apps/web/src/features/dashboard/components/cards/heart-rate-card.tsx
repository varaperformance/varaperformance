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
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/ui/chart';
import type { ChartColors } from '../../lib/types';

interface HeartRateDay {
  date: string;
  restingBpm: number | null;
  avgBpm: number | null;
  maxBpm: number | null;
}

export function HeartRateCard({
  data,
  isLoading,
  chartColors,
}: {
  data?: HeartRateDay[];
  isLoading?: boolean;
  chartColors?: ChartColors;
}) {
  const hasData = data && data.some((d) => d.avgBpm !== null);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-4 w-4 text-chart-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          Heart Rate
        </CardTitle>
        <CardDescription>Daily resting & average BPM</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : hasData && chartColors ? (
          <ChartContainer className="flex-1 min-h-0">
            <BarChart data={data}>
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
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartColors.background,
                  border: `1px solid ${chartColors.border}`,
                  borderRadius: '8px',
                }}
                formatter={(
                  value: number | undefined,
                  name: string | undefined,
                ) => [
                  `${value ?? 0} bpm`,
                  name === 'restingBpm'
                    ? 'Resting'
                    : name === 'avgBpm'
                      ? 'Average'
                      : 'Max',
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
              <Bar
                dataKey="restingBpm"
                fill={chartColors.chart4}
                radius={[4, 4, 0, 0]}
                name="restingBpm"
              />
              <Bar
                dataKey="avgBpm"
                fill={chartColors.chart1}
                radius={[4, 4, 0, 0]}
                name="avgBpm"
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">Heart rate data unavailable</p>
            <p className="text-xs text-muted-foreground">
              Connect a supported wearable to unlock heart rate insights.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
