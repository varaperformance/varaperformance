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

export interface WaterHistoryDay {
  date: string;
  totalOz: number;
  goalOz: number;
}

export function HydrationTrendCard({
  data,
  chartColors,
}: {
  data: WaterHistoryDay[];
  chartColors: ChartColors;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-4 w-4 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3c-1.2 0-4.6 5.4-4.6 9.6a4.6 4.6 0 009.2 0C16.6 8.4 13.2 3 12 3z"
            />
          </svg>
          Hydration Trend
        </CardTitle>
        <CardDescription>Daily water intake over time</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {data.length > 0 ? (
          <ChartContainer className="flex-1 min-h-0">
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartColors.border}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const d = new Date(`${value}T00:00:00`);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                stroke={chartColors.mutedForeground}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
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
                formatter={(
                  value: number | undefined,
                  name: string | undefined,
                ) => [
                  `${value ?? 0} oz`,
                  name === 'totalOz' ? 'Intake' : 'Goal',
                ]}
              />
              <Bar
                dataKey="totalOz"
                fill={chartColors.chart1}
                radius={[4, 4, 0, 0]}
                name="totalOz"
              />
              <Bar
                dataKey="goalOz"
                fill={chartColors.muted}
                radius={[4, 4, 0, 0]}
                name="goalOz"
                fillOpacity={0.3}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">
              No hydration data in this range
            </p>
            <p className="text-xs text-muted-foreground">
              Log water intake to see your daily hydration trend.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
