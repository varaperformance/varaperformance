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
import { Badge } from '@/components/ui/badge';
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
  Moon,
  ChevronLeft,
  ChevronRight,
  Settings,
  TrendingUp,
  Calendar,
  Loader2,
  PenLine,
  BedDouble,
  Sunrise,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrivacyNotice } from '@/components/common/privacy-notice';
import { toast } from 'sonner';
import { useTimezone } from '@/features/profile';
import {
  useSleepTrend,
  useLogSleep,
  useLifestyleGoalWithDefaults,
  useUpdateLifestyleGoal,
} from '@/features/health';
import { isNativeApp } from '@/lib/capacitor';

function SleepPage() {
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

  const { data: trendData, isLoading: trendLoading } = useSleepTrend(
    trendFrom,
    dateKey,
  );

  const { data: goalData } = useLifestyleGoalWithDefaults();

  const logMutation = useLogSleep();

  const updateGoalMutation = useUpdateLifestyleGoal({
    onSuccess: () => {
      toast.success('Sleep goal updated!');
      setShowGoalDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update goal');
    },
  });

  const goal = goalData?.data?.sleepHours ?? 8;

  // Get the selected day's data from the trend
  const selectedDaySleep = useMemo(() => {
    const day = trendData?.find((d) => d.date === dateKey);
    return day?.duration ?? 0;
  }, [trendData, dateKey]);

  const selectedDaySource = useMemo(() => {
    const day = trendData?.find((d) => d.date === dateKey);
    return day?.source ?? null;
  }, [trendData, dateKey]);

  const percent =
    goal > 0 ? Math.min(Math.round((selectedDaySleep / goal) * 100), 100) : 0;
  const remaining = Math.max(goal - selectedDaySleep, 0);

  // Streak: consecutive days meeting goal
  const streak = useMemo(() => {
    if (!trendData) return 0;
    const sorted = [...trendData].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    let count = 0;
    for (const day of sorted) {
      if (day.duration >= goal) count++;
      else break;
    }
    return count;
  }, [trendData, goal]);

  // 7-day average
  const weeklyAvg = useMemo(() => {
    if (!trendData || trendData.length === 0) return 0;
    const total = trendData.reduce((sum, d) => sum + d.duration, 0);
    return Math.round((total / trendData.length) * 10) / 10;
  }, [trendData]);

  const navigateDate = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-purple-500/15 blur-3xl" />

        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Rest & Recovery
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Sleep Tracking
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Monitor your sleep patterns, set goals, and improve your rest
                quality.
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
                    updateGoalMutation.mutate({ sleepHours: newGoal })
                  }
                  isLoading={updateGoalMutation.isPending}
                />
              </Dialog>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-sm shadow-sm backdrop-blur-sm">
              <Moon className="h-4 w-4 text-indigo-500" />
              <span className="font-semibold tabular-nums">
                {formatDuration(selectedDaySleep)}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-sm shadow-sm backdrop-blur-sm">
              <BedDouble className="h-4 w-4 text-purple-500" />
              <span>Goal {goal}h</span>
            </div>
            {selectedDaySource && (
              <Badge variant="outline" className="rounded-full text-xs">
                {formatSource(selectedDaySource)}
              </Badge>
            )}
          </div>
        </div>
      </section>

      <div
        className={cn(
          'grid gap-6',
          isMobile ? 'grid-cols-1' : 'lg:grid-cols-[1fr_2fr]',
        )}
      >
        {/* Left Column */}
        <div className={cn('space-y-6', isMobile && 'order-2')}>
          {/* Daily Progress */}
          <Card className="overflow-hidden transition-shadow hover:shadow-lg">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="text-base">Daily Progress</CardTitle>
              <CardDescription>{isToday ? 'Today' : dateKey}</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              {trendLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="h-36 w-36 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  {/* Circular Progress */}
                  <div className="relative h-40 w-40">
                    <svg
                      className="h-full w-full -rotate-90"
                      viewBox="0 0 120 120"
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted/30"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${(percent / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
                        strokeLinecap="round"
                        className="text-indigo-500 transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Moon className="h-5 w-5 text-indigo-500 mb-1" />
                      <span className="text-3xl font-bold tabular-nums">
                        {formatDuration(selectedDaySleep)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        of {goal}h
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    {remaining > 0
                      ? `${formatDuration(remaining)} short of goal`
                      : 'Sleep goal met!'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {percent}% of daily goal
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Log Sleep */}
          <Card className="overflow-hidden transition-shadow hover:shadow-lg">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PenLine className="h-4 w-4" />
                Log Sleep
              </CardTitle>
              <CardDescription>Manually log your sleep session</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-2">
                {[6, 7, 8, 9].map((hours) => (
                  <Button
                    key={hours}
                    variant="outline"
                    className="flex flex-col items-center gap-1 h-auto py-3 transition-transform duration-200 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
                    disabled={logMutation.isPending}
                    onClick={() => {
                      const endTime = new Date();
                      const startTime = new Date(
                        endTime.getTime() - hours * 3_600_000,
                      );
                      logMutation.mutate(
                        {
                          date: dateKey,
                          startTime: startTime.toISOString(),
                          endTime: endTime.toISOString(),
                          duration: hours,
                          source: 'MANUAL',
                        },
                        {
                          onSuccess: () => toast.success('Sleep logged!'),
                          onError: (err: Error) =>
                            toast.error(err.message || 'Failed to log sleep'),
                        },
                      );
                    }}
                  >
                    <Moon className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-medium">{hours}h</span>
                  </Button>
                ))}
              </div>

              <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full mt-3" size="sm">
                    + Custom Entry
                  </Button>
                </DialogTrigger>
                <LogSleepDialog
                  date={dateKey}
                  onSubmit={(data) =>
                    logMutation.mutate(data, {
                      onSuccess: () => {
                        toast.success('Sleep logged!');
                        setShowLogDialog(false);
                      },
                      onError: (err: Error) =>
                        toast.error(err.message || 'Failed to log sleep'),
                    })
                  }
                  isLoading={logMutation.isPending}
                />
              </Dialog>
            </CardContent>
          </Card>

          {/* 7-Day Summary */}
          <Card>
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                7-Day Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {trendLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-xl border p-3">
                    <p className="text-2xl font-bold tabular-nums text-indigo-500">
                      {weeklyAvg}h
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg / night
                    </p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-2xl font-bold tabular-nums text-green-500">
                      {trendData?.filter((d) => d.duration >= goal).length ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Goals met
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
                  7-Day Sleep
                </CardTitle>
                <CardDescription className="mt-1">
                  Your sleep duration over the past week
                </CardDescription>
              </div>
              <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                {weeklyAvg}h avg / night
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
                <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Moon className="h-8 w-8 text-indigo-500/50" />
                </div>
                <p className="font-medium text-muted-foreground">
                  No sleep data for this period
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isNativeApp()
                    ? 'Sleep data will sync automatically from your device'
                    : 'Use the manual entry to start logging sleep'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {allDaysInRange(trendFrom, dateKey).map((dayDate, index) => {
                  const dayData = trendData.find((d) => d.date === dayDate);
                  const duration = dayData?.duration ?? 0;
                  const dayPercent =
                    goal > 0 ? Math.min((duration / goal) * 100, 100) : 0;
                  const metGoal = duration >= goal;
                  const isSelected = dayDate === dateKey;
                  const dayLabel = new Date(
                    dayDate + 'T12:00:00',
                  ).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={dayDate}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group motion-reduce:transition-none motion-reduce:hover:translate-y-0 animate-in fade-in slide-in-from-bottom-2',
                        isSelected && 'border-indigo-500/30 bg-indigo-500/5',
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
                        <Moon
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
                            {dayData?.source && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground"
                              >
                                {formatSource(dayData.source)}
                              </Badge>
                            )}
                            <span className="text-sm font-semibold tabular-nums">
                              {duration > 0 ? formatDuration(duration) : '—'}
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
                                  : duration > 0
                                    ? 'bg-indigo-400'
                                    : 'bg-transparent',
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function allDaysInRange(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(from + 'T12:00:00');
  const end = new Date(to + 'T12:00:00');
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
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

// ─── Sub-Dialogs ──────────────────────────────────────────────────────────────

interface GoalDialogProps {
  currentGoal: number;
  onSubmit: (goal: number) => void;
  isLoading: boolean;
}

function GoalDialog({ currentGoal, onSubmit, isLoading }: GoalDialogProps) {
  const [goalVal, setGoalVal] = useState(currentGoal.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(goalVal);
    if (!Number.isFinite(num) || num < 1 || num > 24) {
      toast.error('Enter a valid goal between 1 and 24 hours');
      return;
    }
    onSubmit(num);
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Sleep Goal</DialogTitle>
          <DialogDescription>
            Set your target nightly sleep duration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-5">
          <Label htmlFor="sleep-goal">Goal</Label>
          <Input
            id="sleep-goal"
            type="number"
            step="0.5"
            min="1"
            max="24"
            placeholder="8"
            value={goalVal}
            onChange={(e) => setGoalVal(e.target.value)}
            className="col-span-1"
            autoFocus
          />
          <span className="text-muted-foreground">hours</span>
        </div>
        <div className="flex flex-wrap gap-2 px-4">
          {[6, 7, 7.5, 8, 9].map((preset) => (
            <Button
              key={preset}
              type="button"
              variant={goalVal === preset.toString() ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGoalVal(preset.toString())}
            >
              {preset}h
            </Button>
          ))}
        </div>
        <DialogFooter className="mt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
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

interface LogSleepDialogProps {
  date: string;
  onSubmit: (data: {
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    source: string;
  }) => void;
  isLoading: boolean;
}

function LogSleepDialog({ date, onSubmit, isLoading }: LogSleepDialogProps) {
  const [bedtime, setBedtime] = useState('22:00');
  const [wakeTime, setWakeTime] = useState('06:00');

  const duration = useMemo(() => {
    const [bh, bm] = bedtime.split(':').map(Number);
    const [wh, wm] = wakeTime.split(':').map(Number);
    const bedMin = bh * 60 + bm;
    let wakeMin = wh * 60 + wm;
    if (wakeMin <= bedMin) wakeMin += 24 * 60; // crossed midnight
    return Math.round(((wakeMin - bedMin) / 60) * 100) / 100;
  }, [bedtime, wakeTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (duration <= 0 || duration > 24) {
      toast.error('Invalid sleep duration');
      return;
    }
    // Build ISO timestamps from bedtime + wake time relative to date
    const [bh, bm] = bedtime.split(':').map(Number);
    const startTime = new Date(date + 'T00:00:00');
    // If bedtime is PM (before midnight), set it to previous evening
    if (bh >= 12) {
      startTime.setDate(startTime.getDate() - 1);
    }
    startTime.setHours(bh, bm, 0, 0);

    const endTime = new Date(startTime.getTime() + duration * 3_600_000);

    onSubmit({
      date,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      source: 'MANUAL',
    });
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Log Sleep</DialogTitle>
          <DialogDescription>
            Enter your bedtime and wake time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-4 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="bedtime"
                className="flex items-center gap-1.5 mb-1.5"
              >
                <Moon className="h-3.5 w-3.5" /> Bedtime
              </Label>
              <Input
                id="bedtime"
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
              />
            </div>
            <div>
              <Label
                htmlFor="wake-time"
                className="flex items-center gap-1.5 mb-1.5"
              >
                <Sunrise className="h-3.5 w-3.5" /> Wake time
              </Label>
              <Input
                id="wake-time"
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Duration:{' '}
            <span className="font-medium text-foreground">
              {formatDuration(duration)}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              'Log Sleep'
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default SleepPage;
