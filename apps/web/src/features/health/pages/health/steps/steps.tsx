import { useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  formatDateInTimezone,
  getRelativeDateInTimezone,
  getTodayInTimezone,
} from '@varaperformance/core';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Footprints,
  Settings,
  Loader2,
  Calendar,
  Target,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Lightbulb,
  PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PrivacyNotice } from '@/components/common/privacy-notice';
import { toast } from 'sonner';
import { useTimezone } from '@/features/profile';
import {
  useStepsToday,
  useStepsTrend,
  useLogSteps,
  useLifestyleGoalWithDefaults,
  useUpdateLifestyleGoal,
} from '@/features/health';
import { isNativeApp } from '@/lib/capacitor';

function StepsPage() {
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);

  const timezone = useTimezone();
  const dateKey = formatDateInTimezone(selectedDate, timezone);
  const isToday = dateKey === getTodayInTimezone(timezone);

  // 7-day trend ending on selected date
  const trendFrom = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 6);
    return formatDateInTimezone(d, timezone);
  }, [selectedDate, timezone]);

  const { data: todayData, isLoading: todayLoading } = useStepsToday({
    enabled: isToday,
  });
  const { data: trendData, isLoading: trendLoading } = useStepsTrend(
    trendFrom,
    dateKey,
  );
  const { data: goalData } = useLifestyleGoalWithDefaults();

  const logMutation = useLogSteps();

  const updateGoalMutation = useUpdateLifestyleGoal({
    onSuccess: () => {
      toast.success('Step goal updated!');
      setShowGoalDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update goal');
    },
  });

  const goal = goalData?.data?.dailySteps ?? 10_000;

  // Get the selected day's data from the trend
  const selectedDaySteps = useMemo(() => {
    if (isToday && todayData) return todayData.steps;
    const day = trendData?.find((d) => d.date === dateKey);
    return day?.steps ?? 0;
  }, [isToday, todayData, trendData, dateKey]);

  const percent =
    goal > 0 ? Math.min(Math.round((selectedDaySteps / goal) * 100), 100) : 0;
  const remaining = Math.max(goal - selectedDaySteps, 0);

  // Streak: consecutive days meeting goal
  const streak = useMemo(() => {
    if (!trendData) return 0;
    const sorted = [...trendData].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    let count = 0;
    for (const day of sorted) {
      if (day.steps >= goal) count++;
      else break;
    }
    return count;
  }, [trendData, goal]);

  // 7-day average
  const weeklyAvg = useMemo(() => {
    if (!trendData || trendData.length === 0) return 0;
    const total = trendData.reduce((sum, d) => sum + d.steps, 0);
    return Math.round(total / trendData.length);
  }, [trendData]);

  // Days meeting goal in the week
  const goalDays = useMemo(() => {
    if (!trendData) return 0;
    return trendData.filter((d) => d.steps >= goal).length;
  }, [trendData, goal]);

  const navigateDate = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  const handleLogSteps = (steps: number) => {
    logMutation.mutate(
      { date: dateKey, steps, source: 'MANUAL' },
      {
        onSuccess: () => {
          toast.success('Steps logged!');
          setShowLogDialog(false);
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to log steps');
        },
      },
    );
  };

  const isLoading = todayLoading || trendLoading;

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-500/10 via-transparent to-green-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-green-500/15 blur-3xl" />

        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Activity Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Step Tracking
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Track your daily steps, set goals, and monitor your walking
                trends.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => navigateDate(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedDate(new Date())}
                className="min-w-32 rounded-full font-medium"
              >
                {getRelativeDateInTimezone(selectedDate, timezone)}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => navigateDate(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full transition-transform duration-200 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <GoalDialog
                  currentGoal={goal}
                  onSubmit={(newGoal) =>
                    updateGoalMutation.mutate({ dailySteps: newGoal })
                  }
                  isLoading={updateGoalMutation.isPending}
                />
              </Dialog>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              <Footprints className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
              {selectedDaySteps.toLocaleString()} steps
            </div>
            <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              <Target className="mr-1.5 h-3.5 w-3.5 text-green-500" />
              Goal {goal.toLocaleString()}
            </div>
            {streak > 0 && (
              <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
                <TrendingUp className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                {streak} day streak
              </div>
            )}
          </div>

          {!isNativeApp() && (
            <div className="rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Steps are auto-synced from Apple Health or Google Fit on
                  mobile. On web, use the manual entry below to log your daily
                  steps.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <div
        className={cn(
          'grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-400 motion-reduce:animate-none',
          isMobile ? 'grid-cols-1' : 'xl:grid-cols-[380px_1fr]',
        )}
      >
        {/* Left Column - Progress + Manual Entry */}
        <div
          className={cn(
            'space-y-4',
            isMobile ? 'order-2' : 'xl:sticky xl:top-6 xl:h-fit',
          )}
        >
          {/* Progress Card */}
          <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <div className="bg-linear-to-br from-emerald-500/10 via-transparent to-green-500/10">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Daily Progress</CardTitle>
                <CardDescription>
                  {isToday
                    ? 'Today'
                    : formatDateInTimezone(selectedDate, timezone)}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 pb-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Skeleton className="h-48 w-48 rounded-full" />
                    <Skeleton className="h-6 w-32 mt-4" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    {/* Progress Ring */}
                    <div className="relative h-48 w-48">
                      <svg className="h-full w-full transform -rotate-90">
                        <defs>
                          <filter
                            id="steps-glow"
                            x="-50%"
                            y="-50%"
                            width="200%"
                            height="200%"
                          >
                            <feGaussianBlur
                              in="SourceGraphic"
                              stdDeviation="4"
                              result="blur"
                            />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          strokeWidth="12"
                          className="fill-none stroke-muted"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          strokeWidth="12"
                          strokeLinecap="round"
                          filter={percent > 0 ? 'url(#steps-glow)' : undefined}
                          className={cn(
                            'fill-none transition-all duration-500',
                            percent >= 100
                              ? 'stroke-green-500'
                              : 'stroke-emerald-500',
                          )}
                          style={{
                            strokeDasharray: `${2 * Math.PI * 88}`,
                            strokeDashoffset: `${2 * Math.PI * 88 * (1 - percent / 100)}`,
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Footprints
                          className={cn(
                            'h-8 w-8 mb-1',
                            percent >= 100
                              ? 'text-green-500'
                              : 'text-emerald-500',
                          )}
                        />
                        <span className="text-4xl font-bold tabular-nums">
                          {selectedDaySteps.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          of {goal.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 text-center">
                      <p className="text-lg font-medium">
                        {percent >= 100 ? (
                          <span className="text-green-500">
                            Goal reached! 🎉
                          </span>
                        ) : (
                          <span>{remaining.toLocaleString()} steps to go</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {percent}% of daily goal
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>

          {/* Manual Entry Card */}
          <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <PenLine className="h-5 w-5 text-emerald-500" />
                Log Steps
              </CardTitle>
              <CardDescription>Manually log your step count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[1000, 2500, 5000, 10000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="h-16 flex flex-col gap-1 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-emerald-500/5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    onClick={() => handleLogSteps(amount)}
                    disabled={logMutation.isPending}
                  >
                    <Footprints className="h-5 w-5 text-emerald-500" />
                    <span className="font-medium">
                      {amount.toLocaleString()}
                    </span>
                  </Button>
                ))}
              </div>
              <div className="mt-4">
                <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="secondary"
                      className="w-full transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Custom Amount
                    </Button>
                  </DialogTrigger>
                  <LogStepsDialog
                    onSubmit={handleLogSteps}
                    isLoading={logMutation.isPending}
                  />
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Stats Card */}
          <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">7-Day Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border p-3">
                    <p className="text-2xl font-bold tabular-nums text-emerald-600">
                      {weeklyAvg.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Daily Avg
                    </p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-2xl font-bold tabular-nums text-green-600">
                      {goalDays}
                      <span className="text-sm font-normal text-muted-foreground">
                        /7
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Goal Days
                    </p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-2xl font-bold tabular-nums text-amber-500">
                      {streak}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Streak</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 7-Day Trend */}
        <Card
          className={cn(
            'overflow-hidden transition-shadow hover:shadow-lg',
            isMobile && 'order-1',
          )}
        >
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  7-Day Activity
                </CardTitle>
                <CardDescription className="mt-1">
                  Your step count over the past week
                </CardDescription>
              </div>
              <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                {weeklyAvg.toLocaleString()} avg / day
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {trendLoading ? (
              <div className="space-y-3">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : !trendData || trendData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Footprints className="h-8 w-8 text-emerald-500/50" />
                </div>
                <p className="font-medium text-muted-foreground">
                  No step data for this period
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isNativeApp()
                    ? 'Steps will sync automatically from your device'
                    : 'Use the manual entry to start logging steps'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {trendData.map((day, index) => {
                  const dayPercent =
                    goal > 0 ? Math.min((day.steps / goal) * 100, 100) : 0;
                  const metGoal = day.steps >= goal;
                  const isSelected = day.date === dateKey;
                  const dayLabel = new Date(
                    day.date + 'T12:00:00',
                  ).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={day.date}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group motion-reduce:transition-none motion-reduce:hover:translate-y-0 animate-in fade-in slide-in-from-bottom-2',
                        isSelected && 'border-emerald-500/30 bg-emerald-500/5',
                        metGoal && !isSelected && 'border-green-500/20',
                      )}
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <div
                        className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                          metGoal ? 'bg-green-500/20' : 'bg-muted',
                        )}
                      >
                        <Footprints
                          className={cn(
                            'h-5 w-5',
                            metGoal
                              ? 'text-green-500'
                              : 'text-muted-foreground',
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium truncate">
                            {dayLabel}
                          </span>
                          <div className="flex items-center gap-2 ml-2">
                            {day.sources?.length > 0 && (
                              <div className="flex gap-1">
                                {day.sources.map((src) => (
                                  <Badge
                                    key={src}
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground"
                                  >
                                    {formatSource(src)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <span className="text-sm font-semibold tabular-nums">
                              {day.steps.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              metGoal
                                ? 'bg-green-500'
                                : dayPercent >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-red-400',
                            )}
                            style={{ width: `${dayPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PrivacyNotice variant="health" />
    </div>
  );
}

// ─── Sub-Dialogs ──────────────────────────────────────────────────────────────

interface GoalDialogProps {
  currentGoal: number;
  onSubmit: (goal: number) => void;
  isLoading: boolean;
}

function GoalDialog({ currentGoal, onSubmit, isLoading }: GoalDialogProps) {
  const [goal, setGoal] = useState(currentGoal.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const goalNum = parseInt(goal, 10);
    if (isNaN(goalNum) || goalNum < 1000) {
      toast.error('Please enter a valid goal (minimum 1,000 steps)');
      return;
    }
    onSubmit(goalNum);
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Set Daily Step Goal</DialogTitle>
          <DialogDescription>
            The recommended daily step goal is 10,000 steps. Set a goal that
            fits your fitness level and lifestyle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="step-goal" className="text-right">
              Goal
            </Label>
            <Input
              id="step-goal"
              type="number"
              step="500"
              min="1000"
              max="50000"
              placeholder="10000"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="col-span-2"
              autoFocus
            />
            <span className="text-muted-foreground">steps</span>
          </div>
          <div className="flex flex-wrap gap-2 px-4">
            {[5000, 7500, 10000, 12500, 15000].map((preset) => (
              <Button
                key={preset}
                type="button"
                variant={goal === preset.toString() ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => setGoal(preset.toString())}
              >
                {preset.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>
        <PrivacyNotice variant="health" />
        <DialogFooter>
          <Button type="submit" disabled={isLoading || !goal}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Goal'
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

interface LogStepsDialogProps {
  onSubmit: (steps: number) => void;
  isLoading: boolean;
}

function LogStepsDialog({ onSubmit, isLoading }: LogStepsDialogProps) {
  const [steps, setSteps] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stepsNum = parseInt(steps, 10);
    if (isNaN(stepsNum) || stepsNum <= 0) {
      toast.error('Please enter a valid step count');
      return;
    }
    if (stepsNum > 200_000) {
      toast.error('Step count cannot exceed 200,000');
      return;
    }
    onSubmit(stepsNum);
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Log Step Count</DialogTitle>
          <DialogDescription>
            Enter your step count for this day. This will replace any existing
            manual entry.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="step-count" className="text-right">
              Steps
            </Label>
            <Input
              id="step-count"
              type="number"
              step="1"
              min="1"
              max="200000"
              placeholder="0"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              className="col-span-2"
              autoFocus
            />
            <span className="text-muted-foreground">steps</span>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isLoading || !steps}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Logging...
              </>
            ) : (
              <>
                <Footprints className="h-4 w-4 mr-2" />
                Log Steps
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  APPLE_HEALTH: 'Apple Health',
  GOOGLE_FIT: 'Google Fit',
  MANUAL: 'Manual',
  STRAVA: 'Strava',
  FITBIT: 'Fitbit',
  WHOOP: 'Whoop',
  GARMIN: 'Garmin',
  OURA_RING: 'Oura',
  APPLE_WATCH: 'Apple Watch',
};

function formatSource(source: string): string {
  return SOURCE_LABELS[source] ?? source.replace(/_/g, ' ');
}

export default StepsPage;
