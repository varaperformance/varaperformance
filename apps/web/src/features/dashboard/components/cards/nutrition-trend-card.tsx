import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/ui/chart';
import type { ChartColors } from '../../lib/types';

export interface NutritionHistoryDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function NutritionTrendCard({
  data,
  chartColors,
}: {
  data: NutritionHistoryDay[];
  chartColors: ChartColors;
}) {
  const filteredData = data.filter((d) => d.calories > 0);

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
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          Nutrition Trend
        </CardTitle>
        <CardDescription>Daily macros over time</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {filteredData.length > 0 ? (
          <ChartContainer className="flex-1 min-h-0">
            <LineChart data={filteredData}>
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
              />
              <Line
                dataKey="protein"
                type="monotone"
                stroke={chartColors.chart1}
                strokeWidth={2}
                dot={false}
                name="Protein (g)"
              />
              <Line
                dataKey="carbs"
                type="monotone"
                stroke={chartColors.chart2}
                strokeWidth={2}
                dot={false}
                name="Carbs (g)"
              />
              <Line
                dataKey="fat"
                type="monotone"
                stroke={chartColors.chart3}
                strokeWidth={2}
                dot={false}
                name="Fats (g)"
              />
              <Legend />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">
              No nutrition data in this range
            </p>
            <p className="text-xs text-muted-foreground">
              Log meals to see macro trends over time.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
