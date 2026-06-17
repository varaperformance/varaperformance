import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DailyActivity, MuscleData, ChartColors } from '../../lib/types';

// ─── Muscle label map ─────────────────────────────────────────────────────────

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  legs: 'Legs',
  glutes: 'Glutes',
};

const MUSCLE_ICONS: Record<string, string> = {
  chest: '🫁',
  back: '🔙',
  shoulders: '💪',
  arms: '🦾',
  core: '🎯',
  legs: '🦵',
  glutes: '🍑',
};

// ─── Card ─────────────────────────────────────────────────────────────────────

export function TrainingOverviewCard({
  activityData,
  muscleData,
  isLoadingMuscle,
  hasMuscleData,
  chartColors,
}: {
  activityData: DailyActivity[];
  muscleData: MuscleData[];
  isLoadingMuscle: boolean;
  hasMuscleData: boolean;
  chartColors: ChartColors;
}) {
  const currentYear = new Date().getFullYear();
  const [hoveredDay, setHoveredDay] = useState<DailyActivity | null>(null);

  // ── Heatmap data (current year) ──
  const yearData = useMemo(() => {
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);
    const dataMap = new Map<string, DailyActivity>();
    activityData.forEach((d) => {
      if (d.date) dataMap.set(d.date, d);
    });
    const result: DailyActivity[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      result.push(
        dataMap.get(dateStr) || { date: dateStr, workouts: 0, calories: 0 },
      );
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [activityData, currentYear]);

  const totalWorkouts = useMemo(
    () => yearData.reduce((s, d) => s + (d.workouts > 0 ? d.workouts : 0), 0),
    [yearData],
  );

  const weeks = useMemo(() => {
    const result: DailyActivity[][] = [];
    let currentWeek: DailyActivity[] = [];
    const firstDate = new Date(yearData[0].date);
    for (let i = 0; i < firstDate.getDay(); i++) {
      currentWeek.push({ date: '', workouts: -1, calories: 0 });
    }
    yearData.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7)
        currentWeek.push({ date: '', workouts: -1, calories: 0 });
      result.push(currentWeek);
    }
    return result;
  }, [yearData]);

  const monthLabels = useMemo(() => {
    const names = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const labels: { month: string; weekIndex: number }[] = [];
    let cur = -1;
    weeks.forEach((week, wi) => {
      const day = week.find((d) => d.date?.length);
      if (day) {
        const m = parseInt(day.date.split('-')[1], 10) - 1;
        if (m !== cur) {
          cur = m;
          labels.push({ month: names[m], weekIndex: wi });
        }
      }
    });
    return labels;
  }, [weeks]);

  const getIntensityClass = (w: number) => {
    if (w < 0) return 'bg-transparent';
    if (w === 0) return 'bg-muted/30 dark:bg-muted/20';
    if (w === 1) return 'bg-chart-4/40';
    if (w === 2) return 'bg-chart-4/60';
    if (w === 3) return 'bg-chart-4/80';
    return 'bg-chart-4';
  };

  // ── Sorted muscle data for bars ──
  const sortedMuscles = useMemo(
    () => [...muscleData].sort((a, b) => b.value - a.value),
    [muscleData],
  );

  const topValue = sortedMuscles[0]?.value ?? 100;

  const colorMap: Record<number, string> = {
    1: chartColors.chart1,
    2: chartColors.chart2,
    3: chartColors.chart3,
    4: chartColors.chart4,
    5: chartColors.chart5,
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <svg
            className="h-5 w-5 text-chart-4"
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
          Training Overview
        </CardTitle>
        <CardDescription>
          <span className="font-semibold text-foreground">
            {totalWorkouts} workouts
          </span>{' '}
          in {currentYear} · muscle balance from recent sessions
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5 overflow-hidden">
        {/* ── Activity Heatmap ── */}
        <div className="space-y-1 min-w-0">
          {/* Month labels */}
          <div className="flex gap-1">
            <div className="w-5 shrink-0" />
            <div
              className="flex-1 grid text-[10px] text-muted-foreground"
              style={{
                gridTemplateColumns: `repeat(${weeks.length}, 1fr)`,
                gap: '2px',
              }}
            >
              {weeks.map((_w, wi) => {
                const label = monthLabels.find((l) => l.weekIndex === wi);
                return (
                  <div
                    key={wi}
                    className="overflow-hidden whitespace-nowrap text-ellipsis"
                  >
                    {label?.month || ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid + day labels */}
          <div className="flex gap-1">
            <div className="w-5 shrink-0 flex flex-col justify-between text-[10px] text-muted-foreground">
              <span className="h-2 leading-tight opacity-0">S</span>
              <span className="h-2 leading-tight">M</span>
              <span className="h-2 leading-tight opacity-0">T</span>
              <span className="h-2 leading-tight">W</span>
              <span className="h-2 leading-tight opacity-0">T</span>
              <span className="h-2 leading-tight">F</span>
              <span className="h-2 leading-tight opacity-0">S</span>
            </div>
            <div
              className="flex-1 grid"
              style={{
                gridTemplateColumns: `repeat(${weeks.length}, 1fr)`,
                gap: '2px',
              }}
            >
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  className="grid grid-rows-7"
                  style={{ gap: '2px' }}
                >
                  {week.map((day, di) => (
                    <div
                      key={`${wi}-${di}`}
                      className={cn(
                        'aspect-square rounded-sm transition-all min-h-1.5',
                        getIntensityClass(day.workouts),
                        day.workouts >= 0 &&
                          'cursor-pointer hover:ring-1 hover:ring-primary hover:ring-offset-1 hover:ring-offset-background',
                        hoveredDay?.date === day.date &&
                          day.date &&
                          'ring-1 ring-primary ring-offset-1 ring-offset-background',
                      )}
                      onMouseEnter={() =>
                        day.workouts >= 0 && day.date && setHoveredDay(day)
                      }
                      onMouseLeave={() => setHoveredDay(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend row */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="text-muted-foreground min-h-4">
              {hoveredDay ? (
                <>
                  <span className="font-medium text-foreground">
                    {hoveredDay.date}
                  </span>
                  {': '}
                  {hoveredDay.workouts} workout
                  {hoveredDay.workouts !== 1 ? 's' : ''}, {hoveredDay.calories}{' '}
                  cal
                </>
              ) : (
                <span className="text-muted-foreground/60">
                  Hover a day to see details
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-0.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-muted/30 dark:bg-muted/20" />
                <div className="w-2.5 h-2.5 rounded-sm bg-chart-4/40" />
                <div className="w-2.5 h-2.5 rounded-sm bg-chart-4/60" />
                <div className="w-2.5 h-2.5 rounded-sm bg-chart-4/80" />
                <div className="w-2.5 h-2.5 rounded-sm bg-chart-4" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="border-t" />

        {/* ── Muscle Focus Bars ── */}
        <div className="flex-1 min-h-0">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Muscle Balance
          </p>

          {isLoadingMuscle ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-full rounded" />
              ))}
            </div>
          ) : !hasMuscleData ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8">
              <p className="text-sm font-medium text-muted-foreground">
                No muscle data yet
              </p>
              <p className="text-xs text-muted-foreground">
                Complete workouts to see your training balance
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedMuscles.map((m) => {
                const pct = topValue > 0 ? (m.value / topValue) * 100 : 0;
                const color = colorMap[m.colorIndex] ?? chartColors.chart1;
                return (
                  <div key={m.muscle} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <span className="text-base leading-none">
                          {MUSCLE_ICONS[m.muscle] ?? '💪'}
                        </span>
                        {MUSCLE_LABELS[m.muscle] ?? m.fullName}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground group-hover:text-foreground transition-colors">
                        {Math.round(m.value)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
