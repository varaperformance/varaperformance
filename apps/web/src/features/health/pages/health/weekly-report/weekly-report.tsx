import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dumbbell,
  Trophy,
  Droplets,
  ListChecks,
  Flame,
  UtensilsCrossed,
  Beef,
  BarChart3,
  Lightbulb,
  CalendarDays,
  Timer,
  Weight,
  Target,
  Percent,
  Ruler,
  Award,
  Swords,
  Wheat,
  Droplet,
  Footprints,
} from 'lucide-react';
import { useWeeklyReport } from '@/features/health';

const MOTIVATIONAL_QUOTES = [
  'Consistency beats perfection. Every workout, every habit check-in, and every glass of water adds up. Keep going!',
  'Small daily improvements over time lead to stunning results.',
  "You don't have to be extreme, just consistent.",
  'Progress is progress, no matter how small. Keep showing up!',
  "The only bad workout is the one that didn't happen.",
  'Discipline is choosing between what you want now and what you want most.',
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Success isn't always about greatness. It's about consistency.",
  'Every rep counts. Every glass of water counts. Every habit check-in counts.',
];

function getRotatingQuote(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000,
  );
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}

const TIME_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

export default function WeeklyReportPage() {
  const isMobile = useIsMobile();
  const [days, setDays] = useState(7);
  const { data, isLoading } = useWeeklyReport(days);
  const report = data?.data;

  const stats = report
    ? [
        {
          label: 'Workouts Logged',
          value: report.workoutsLogged,
          icon: Dumbbell,
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          stripe: 'from-primary/70 to-indigo-500/70',
        },
        {
          label: 'Personal Records',
          value: report.personalRecords,
          icon: Trophy,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          stripe: 'from-yellow-500/70 to-amber-500/70',
        },
        ...(report.workoutDurationMinutes > 0
          ? [
              {
                label: 'Workout Time',
                value: `${report.workoutDurationMinutes} min`,
                icon: Timer,
                color: 'text-violet-500',
                bgColor: 'bg-violet-500/10',
                stripe: 'from-violet-500/70 to-purple-500/70',
              },
            ]
          : []),
        ...(report.totalVolume > 0
          ? [
              {
                label: 'Total Volume',
                value: `${report.totalVolume.toLocaleString()} lbs`,
                icon: Weight,
                color: 'text-slate-500',
                bgColor: 'bg-slate-500/10',
                stripe: 'from-slate-500/70 to-zinc-500/70',
              },
            ]
          : []),
        ...(report.muscleGroupsTrained > 0
          ? [
              {
                label: 'Muscle Groups',
                value: report.muscleGroupsTrained,
                icon: Target,
                color: 'text-teal-500',
                bgColor: 'bg-teal-500/10',
                stripe: 'from-teal-500/70 to-cyan-500/70',
              },
            ]
          : []),
        {
          label: 'Water Goal Days',
          value: `${report.waterGoalDaysHit} / ${days}`,
          icon: Droplets,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          stripe: 'from-blue-500/70 to-cyan-500/70',
        },
        ...(report.avgDailySteps !== null
          ? [
              {
                label: 'Avg Daily Steps',
                value: report.avgDailySteps.toLocaleString(),
                icon: Footprints,
                color: 'text-emerald-500',
                bgColor: 'bg-emerald-500/10',
                stripe: 'from-emerald-500/70 to-green-500/70',
              },
            ]
          : []),
        ...(report.stepGoalDaysHit > 0
          ? [
              {
                label: 'Step Goal Days',
                value: `${report.stepGoalDaysHit} / ${days}`,
                icon: Footprints,
                color: 'text-green-600',
                bgColor: 'bg-green-600/10',
                stripe: 'from-green-600/70 to-emerald-500/70',
              },
            ]
          : []),
        {
          label: 'Habits Completed',
          value: report.habitsCompleted,
          icon: ListChecks,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          stripe: 'from-green-500/70 to-emerald-500/70',
        },
        ...(report.habitCompletionPercent !== null
          ? [
              {
                label: 'Habit Completion',
                value: `${report.habitCompletionPercent}%`,
                icon: Percent,
                color: 'text-lime-500',
                bgColor: 'bg-lime-500/10',
                stripe: 'from-lime-500/70 to-green-500/70',
              },
            ]
          : []),
        {
          label: 'Best Habit Streak',
          value:
            report.currentHabitStreak > 0
              ? `${report.currentHabitStreak} days`
              : '—',
          icon: Flame,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          stripe: 'from-orange-500/70 to-amber-500/70',
        },
        ...(report.caloriesAvg !== null
          ? [
              {
                label: 'Avg Daily Calories',
                value: report.caloriesAvg,
                icon: UtensilsCrossed,
                color: 'text-rose-500',
                bgColor: 'bg-rose-500/10',
                stripe: 'from-rose-500/70 to-pink-500/70',
              },
            ]
          : []),
        ...(report.proteinAvg !== null
          ? [
              {
                label: 'Avg Daily Protein',
                value: `${report.proteinAvg}g`,
                icon: Beef,
                color: 'text-amber-600',
                bgColor: 'bg-amber-600/10',
                stripe: 'from-amber-600/70 to-yellow-500/70',
              },
            ]
          : []),
        ...(report.carbsAvg !== null
          ? [
              {
                label: 'Avg Daily Carbs',
                value: `${report.carbsAvg}g`,
                icon: Wheat,
                color: 'text-amber-500',
                bgColor: 'bg-amber-500/10',
                stripe: 'from-amber-500/70 to-orange-500/70',
              },
            ]
          : []),
        ...(report.fatsAvg !== null
          ? [
              {
                label: 'Avg Daily Fats',
                value: `${report.fatsAvg}g`,
                icon: Droplet,
                color: 'text-yellow-600',
                bgColor: 'bg-yellow-600/10',
                stripe: 'from-yellow-600/70 to-amber-600/70',
              },
            ]
          : []),
        ...(report.nutritionLoggedDays > 0
          ? [
              {
                label: 'Nutrition Days Logged',
                value: `${report.nutritionLoggedDays} / ${days}`,
                icon: CalendarDays,
                color: 'text-pink-500',
                bgColor: 'bg-pink-500/10',
                stripe: 'from-pink-500/70 to-rose-500/70',
              },
            ]
          : []),
        ...(report.measurementDeltas !== null
          ? [
              {
                label: 'Measurement Changes',
                value:
                  [
                    report.measurementDeltas.waist != null
                      ? `W: ${report.measurementDeltas.waist > 0 ? '+' : ''}${report.measurementDeltas.waist}″`
                      : null,
                    report.measurementDeltas.chest != null
                      ? `C: ${report.measurementDeltas.chest > 0 ? '+' : ''}${report.measurementDeltas.chest}″`
                      : null,
                    report.measurementDeltas.hips != null
                      ? `H: ${report.measurementDeltas.hips > 0 ? '+' : ''}${report.measurementDeltas.hips}″`
                      : null,
                  ]
                    .filter(Boolean)
                    .join('  ') || '—',
                icon: Ruler,
                color: 'text-indigo-500',
                bgColor: 'bg-indigo-500/10',
                stripe: 'from-indigo-500/70 to-blue-500/70',
              },
            ]
          : []),
        ...(report.achievementsEarned > 0
          ? [
              {
                label: 'Achievements Earned',
                value: report.achievementsEarned,
                icon: Award,
                color: 'text-fuchsia-500',
                bgColor: 'bg-fuchsia-500/10',
                stripe: 'from-fuchsia-500/70 to-purple-500/70',
              },
            ]
          : []),
        ...(report.activeChallenges > 0
          ? [
              {
                label: 'Active Challenges',
                value: report.activeChallenges,
                icon: Swords,
                color: 'text-red-500',
                bgColor: 'bg-red-500/10',
                stripe: 'from-red-500/70 to-orange-500/70',
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-blue-500/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Progress Overview
            </p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">
              Weekly Report
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Your progress over the selected time period across all health
              categories.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                <Select
                  value={String(days)}
                  onValueChange={(v) => setDays(Number(v))}
                >
                  <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-xs shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_RANGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-linear-to-r from-blue-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
        </div>

        <div className="relative mt-4 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              {getRotatingQuote()}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      {isLoading ? (
        <div
          className={cn(
            'grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none',
            isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3',
          )}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="relative overflow-hidden border-muted/70">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-muted" />
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !report ? (
        <Card className="overflow-hidden border-muted/70">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-blue-500/50" />
              </div>
              <p className="font-medium text-muted-foreground">
                No report data yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Start logging your activities to see your weekly progress
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            'grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none',
            isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3',
          )}
        >
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r ${stat.stripe}`}
              />
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full ${stat.bgColor} flex items-center justify-center`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
