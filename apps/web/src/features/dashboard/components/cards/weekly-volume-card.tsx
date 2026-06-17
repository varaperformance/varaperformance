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
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/ui/chart';
import type { ChartColors } from '../../lib/types';

export interface WeeklyVolumeEntry {
  muscle: string;
  sets: number;
  target: number;
}

export function WeeklyVolumeCard({
  data,
  hasData,
  chartColors,
}: {
  data: WeeklyVolumeEntry[];
  hasData: boolean;
  chartColors: ChartColors;
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Weekly Volume
        </CardTitle>
        <CardDescription>Sets per muscle group vs target</CardDescription>
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
                dataKey="muscle"
                stroke={chartColors.mutedForeground}
                fontSize={10}
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
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="sets"
                fill={chartColors.chart1}
                radius={[4, 4, 0, 0]}
                name="Actual"
              />
              <Bar
                dataKey="target"
                fill={chartColors.chart2}
                radius={[4, 4, 0, 0]}
                name="Target"
                fillOpacity={0.5}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">No weekly set data</p>
            <p className="text-xs text-muted-foreground">
              Log training sessions to compare volume against targets.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
