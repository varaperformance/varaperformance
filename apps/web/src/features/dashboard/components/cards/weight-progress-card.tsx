import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/ui/chart';
import type { ChartColors, DateRange } from '../../lib/types';

export interface WeightProgressEntry {
  week: string;
  weight: number | null;
  bodyFat: number | null;
}

export function WeightProgressCard({
  data,
  hasData,
  dateRange,
  chartColors,
}: {
  data: WeightProgressEntry[];
  hasData: boolean;
  dateRange: DateRange;
  chartColors: ChartColors;
}) {
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
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
          </svg>
          Weight & Body Fat Progress
        </CardTitle>
        <CardDescription>{dateRange.label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {hasData ? (
          <ChartContainer className="flex-1 min-h-0">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={chartColors.chart1}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={chartColors.chart1}
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient
                  id="bodyFatGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={chartColors.chart2}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={chartColors.chart2}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartColors.border}
              />
              <XAxis
                dataKey="week"
                stroke={chartColors.mutedForeground}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke={chartColors.mutedForeground}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={chartColors.mutedForeground}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartColors.background,
                  border: `1px solid ${chartColors.border}`,
                  borderRadius: '8px',
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="weight"
                stroke={chartColors.chart1}
                fill="url(#weightGradient)"
                strokeWidth={2}
                name="Weight (kg)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="bodyFat"
                stroke={chartColors.chart2}
                fill="url(#bodyFatGradient)"
                strokeWidth={2}
                name="Body Fat (%)"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">No weight trend data</p>
            <p className="text-xs text-muted-foreground">
              Log at least one measurement in this date range.
            </p>
          </div>
        )}
        <div className="mt-3 flex justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-chart-1" />
            <span className="text-muted-foreground">Weight (kg)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-chart-2" />
            <span className="text-muted-foreground">Body Fat (%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
