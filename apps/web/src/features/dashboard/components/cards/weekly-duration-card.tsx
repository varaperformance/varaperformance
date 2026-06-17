import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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

export interface WeeklyDurationEntry {
  day: string;
  duration: number;
}

export function WeeklyDurationCard({
  data,
  hasData,
  chartColors,
}: {
  data: WeeklyDurationEntry[];
  hasData: boolean;
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Weekly Duration
        </CardTitle>
        <CardDescription>Minutes per day</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {hasData ? (
          <ChartContainer className="flex-1 min-h-0">
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartColors.border}
              />
              <XAxis
                dataKey="day"
                stroke={chartColors.mutedForeground}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={chartColors.mutedForeground}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartColors.background,
                  border: `1px solid ${chartColors.border}`,
                  borderRadius: '8px',
                }}
                formatter={(value) => [`${value} min`, 'Duration']}
              />
              <Bar
                dataKey="duration"
                fill={chartColors.chart4}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">No duration data this week</p>
            <p className="text-xs text-muted-foreground">
              Complete a workout with duration tracking to populate this chart.
            </p>
          </div>
        )}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Total: {data.reduce((sum, d) => sum + d.duration, 0)} min this week
        </p>
      </CardContent>
    </Card>
  );
}
