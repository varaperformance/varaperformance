import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  Cell,
  Pie,
  PieChart,
  Tooltip,
} from '@/components/ui/chart';
import type { ChartColors } from '../../lib/types';
import { formatDecimal } from '../../lib/chart-helpers';

export interface MacroEntry {
  name: string;
  value: number;
}

export function MacrosCard({
  data,
  hasData,
  chartColors,
}: {
  data: MacroEntry[];
  hasData: boolean;
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
              d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
            />
          </svg>
          Today's Macros
        </CardTitle>
        <CardDescription>Protein / Carbs / Fats</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {hasData ? (
          <>
            <ChartContainer className="flex-1 min-h-0">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        [
                          chartColors.chart1,
                          chartColors.chart2,
                          chartColors.chart3,
                        ][index]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.background,
                    border: `1px solid ${chartColors.border}`,
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [
                    `${formatDecimal(Number(value))}g`,
                    '',
                  ]}
                />
              </PieChart>
            </ChartContainer>
            <div className="mt-2 flex justify-center gap-3 text-xs">
              {data.map((macro, i) => (
                <div key={macro.name} className="flex items-center gap-1">
                  <div className={`h-2 w-2 rounded-full bg-chart-${i + 1}`} />
                  <span className="text-muted-foreground">
                    {macro.name}: {formatDecimal(macro.value)}g
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">No macro entries today</p>
            <p className="text-xs text-muted-foreground">
              Log meals in your food diary to visualize macro balance.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
