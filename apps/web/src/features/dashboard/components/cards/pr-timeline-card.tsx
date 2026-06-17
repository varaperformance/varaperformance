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
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/ui/chart';
import type { ChartColors } from '../../lib/types';

export interface PRTimelineEntry {
  month: string;
  prs: number;
}

export function PRTimelineCard({
  data,
  isLoading,
  chartColors,
}: {
  data: PRTimelineEntry[];
  isLoading: boolean;
  chartColors: ChartColors;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-4 w-4 text-chart-5"
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
          Personal Records Timeline
        </CardTitle>
        <CardDescription>
          PRs hit each month in the selected date range
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <Skeleton className="flex-1 min-h-0 w-full" />
        ) : (
          <>
            <ChartContainer className="flex-1 min-h-0">
              <BarChart data={data}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.border}
                />
                <XAxis
                  dataKey="month"
                  stroke={chartColors.mutedForeground}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={chartColors.mutedForeground}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.background,
                    border: `1px solid ${chartColors.border}`,
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${value} PRs`, 'Personal Records']}
                />
                <Bar
                  dataKey="prs"
                  fill={chartColors.chart5}
                  radius={[4, 4, 0, 0]}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.prs >= 4 ? chartColors.chart3 : chartColors.chart5
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Total: {data.reduce((sum, p) => sum + p.prs, 0)} PRs in selected
              range
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
