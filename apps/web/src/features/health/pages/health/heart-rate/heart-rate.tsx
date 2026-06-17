import { useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  addCalendarDaysToDateKey,
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
  Heart,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
  Loader2,
  PenLine,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrivacyNotice } from '@/components/common/privacy-notice';
import { toast } from 'sonner';
import { useTimezone } from '@/features/profile';
import { useHeartRateDailySummary, useLogHeartRate } from '@/features/health';
import { isNativeApp } from '@/lib/capacitor';

// ─── Page ─────────────────────────────────────────────────────────────────────

function HeartRatePage() {
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showLogDialog, setShowLogDialog] = useState(false);

  const timezone = useTimezone();
  const dateKey = formatDateInTimezone(selectedDate, timezone);
  const isToday = dateKey === getTodayInTimezone(timezone);

  // 7-day range ending on selected date
  const trendFrom = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 6);
    return formatDateInTimezone(d, timezone);
  }, [selectedDate, timezone]);

  const { data: daySummaries = [], isLoading } = useHeartRateDailySummary(
    trendFrom,
    dateKey,
  );

  const logMutation = useLogHeartRate();

  // Today's / selected day's data
  const selectedDay = useMemo(
    () => daySummaries.find((d) => d.date === dateKey) ?? null,
    [daySummaries, dateKey],
  );

  const currentBpm = selectedDay?.avg ?? 0;
  const currentMin = selectedDay?.min ?? 0;
  const currentMax = selectedDay?.max ?? 0;
  const readingCount = selectedDay?.count ?? 0;

  // 7-day average
  const weeklyAvg = useMemo(() => {
    if (daySummaries.length === 0) return 0;
    const total = daySummaries.reduce((sum, d) => sum + d.avg, 0);
    return Math.round(total / daySummaries.length);
  }, [daySummaries]);

  // Zone classification
  const getZone = (bpm: number) => {
    if (bpm === 0) return { label: 'No data', color: 'text-muted-foreground' };
    if (bpm < 60) return { label: 'Resting', color: 'text-blue-500' };
    if (bpm < 100) return { label: 'Normal', color: 'text-green-500' };
    if (bpm < 140) return { label: 'Elevated', color: 'text-amber-500' };
    return { label: 'High', color: 'text-red-500' };
  };

  const zone = getZone(currentBpm);

  const navigateDate = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-rose-500/10 via-transparent to-red-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-red-500/15 blur-3xl" />

        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Vital Signs
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Heart Rate
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Monitor your heart rate trends, resting BPM, and daily ranges.
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
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-sm shadow-sm backdrop-blur-sm">
              <Heart className="h-4 w-4 text-rose-500" />
              <span className="font-semibold tabular-nums">
                {currentBpm > 0 ? `${currentBpm} bpm` : '—'}
              </span>
            </div>
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-sm shadow-sm backdrop-blur-sm',
                zone.color,
              )}
            >
              <Activity className="h-4 w-4" />
              <span>{zone.label}</span>
            </div>
            {readingCount > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-sm shadow-sm backdrop-blur-sm text-muted-foreground">
                {readingCount} readings
              </div>
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
          {/* Daily Summary */}
          <Card className="overflow-hidden transition-shadow hover:shadow-lg">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="text-base">Daily Summary</CardTitle>
              <CardDescription>{isToday ? 'Today' : dateKey}</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="h-36 w-36 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : currentBpm === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center">
                    <Heart className="h-8 w-8 text-rose-500/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No heart rate data
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  {/* Circular BPM display */}
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
                        strokeDasharray={`${Math.min((currentBpm / 200) * 2 * Math.PI * 52, 2 * Math.PI * 52)} ${2 * Math.PI * 52}`}
                        strokeLinecap="round"
                        className={cn(
                          'transition-all duration-700',
                          currentBpm < 60
                            ? 'text-blue-500'
                            : currentBpm < 100
                              ? 'text-green-500'
                              : currentBpm < 140
                                ? 'text-amber-500'
                                : 'text-red-500',
                        )}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Heart className="h-5 w-5 text-rose-500 mb-1" />
                      <span className="text-3xl font-bold tabular-nums">
                        {currentBpm}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        avg bpm
                      </span>
                    </div>
                  </div>

                  {/* Min/Max range */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1.5">
                      <ArrowDown className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-muted-foreground">Low</span>
                      <span className="font-semibold tabular-nums">
                        {currentMin}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ArrowUp className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-muted-foreground">High</span>
                      <span className="font-semibold tabular-nums">
                        {currentMax}
                      </span>
                    </div>
                  </div>

                  <p className={cn('text-sm font-medium', zone.color)}>
                    {zone.label} range
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Log Heart Rate */}
          <Card className="overflow-hidden transition-shadow hover:shadow-lg">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PenLine className="h-4 w-4" />
                Log Heart Rate
              </CardTitle>
              <CardDescription>Manually record a reading</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-2">
                {[60, 72, 80, 90].map((bpm) => (
                  <Button
                    key={bpm}
                    variant="outline"
                    className="flex flex-col items-center gap-1 h-auto py-3 transition-transform duration-200 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
                    disabled={logMutation.isPending}
                    onClick={() => {
                      logMutation.mutate(
                        {
                          samples: [
                            {
                              timestamp: new Date().toISOString(),
                              bpm,
                              source: 'MANUAL',
                            },
                          ],
                        },
                        {
                          onSuccess: () => toast.success('Heart rate logged!'),
                          onError: (err: Error) =>
                            toast.error(
                              err.message || 'Failed to log heart rate',
                            ),
                        },
                      );
                    }}
                  >
                    <Heart className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-medium">{bpm} bpm</span>
                  </Button>
                ))}
              </div>

              <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full mt-3" size="sm">
                    + Custom Reading
                  </Button>
                </DialogTrigger>
                <LogHeartRateDialog
                  onSubmit={(bpm) =>
                    logMutation.mutate(
                      {
                        samples: [
                          {
                            timestamp: new Date().toISOString(),
                            bpm,
                            source: 'MANUAL',
                          },
                        ],
                      },
                      {
                        onSuccess: () => {
                          toast.success('Heart rate logged!');
                          setShowLogDialog(false);
                        },
                        onError: (err: Error) =>
                          toast.error(
                            err.message || 'Failed to log heart rate',
                          ),
                      },
                    )
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
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-xl border p-3">
                    <p className="text-2xl font-bold tabular-nums text-rose-500">
                      {weeklyAvg > 0 ? weeklyAvg : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg BPM
                    </p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-2xl font-bold tabular-nums text-blue-500">
                      {daySummaries.length > 0
                        ? Math.min(...daySummaries.map((d) => d.min))
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Lowest</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-2xl font-bold tabular-nums text-red-500">
                      {daySummaries.length > 0
                        ? Math.max(...daySummaries.map((d) => d.max))
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Highest
                    </p>
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
                  7-Day Heart Rate
                </CardTitle>
                <CardDescription className="mt-1">
                  Your heart rate averages over the past week
                </CardDescription>
              </div>
              {weeklyAvg > 0 && (
                <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                  {weeklyAvg} avg bpm
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : daySummaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                  <Heart className="h-8 w-8 text-rose-500/50" />
                </div>
                <p className="font-medium text-muted-foreground">
                  No heart rate data for this period
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isNativeApp()
                    ? 'Heart rate data will sync automatically from your device'
                    : 'Use the manual entry to start logging readings'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {allDaysInRange(trendFrom, dateKey).map((dayDate, index) => {
                  const dayData = daySummaries.find((d) => d.date === dayDate);
                  const avg = dayData?.avg ?? 0;
                  const barPercent =
                    avg > 0 ? Math.min((avg / 200) * 100, 100) : 0;
                  const dayZone = getZone(avg);
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
                        isSelected && 'border-rose-500/30 bg-rose-500/5',
                      )}
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <div
                        className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                          avg > 0 ? 'bg-rose-500/20' : 'bg-muted',
                        )}
                      >
                        <Heart
                          className={cn(
                            'h-5 w-5',
                            avg > 0 ? 'text-rose-500' : 'text-muted-foreground',
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium truncate">
                            {dayLabel}
                          </span>
                          <div className="flex items-center gap-2 ml-2">
                            {dayData && (
                              <>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] px-1.5 py-0 h-4 font-normal',
                                    dayZone.color,
                                  )}
                                >
                                  {dayZone.label}
                                </Badge>
                                {dayData.source && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground"
                                  >
                                    {formatSource(dayData.source)}
                                  </Badge>
                                )}
                              </>
                            )}
                            <span className="text-sm font-semibold tabular-nums">
                              {avg > 0 ? `${avg} bpm` : '—'}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              avg >= 140
                                ? 'bg-red-500'
                                : avg >= 100
                                  ? 'bg-amber-500'
                                  : avg >= 60
                                    ? 'bg-green-500'
                                    : avg > 0
                                      ? 'bg-blue-500'
                                      : 'bg-transparent',
                            )}
                            style={{ width: `${barPercent}%` }}
                          />
                        </div>
                        {dayData && dayData.count > 0 && (
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <ArrowDown className="h-3 w-3 text-blue-500" />
                              {dayData.min}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Minus className="h-3 w-3" />
                              {dayData.avg}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <ArrowUp className="h-3 w-3 text-red-500" />
                              {dayData.max}
                            </span>
                            <span>{dayData.count} readings</span>
                          </div>
                        )}
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

function allDaysInRange(from: string, to: string): string[] {
  const days: string[] = [];
  let current = from;
  while (current <= to) {
    days.push(current);
    current = addCalendarDaysToDateKey(current, 1);
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
  // May contain multiple comma-joined sources
  return source
    .split(', ')
    .map((s) => SOURCE_LABELS[s] ?? s.replace(/_/g, ' '))
    .join(', ');
}

// ─── Log Dialog ───────────────────────────────────────────────────────────────

interface LogHeartRateDialogProps {
  onSubmit: (bpm: number) => void;
  isLoading: boolean;
}

function LogHeartRateDialog({ onSubmit, isLoading }: LogHeartRateDialogProps) {
  const [bpm, setBpm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(bpm, 10);
    if (!Number.isFinite(num) || num < 30 || num > 250) {
      toast.error('Enter a valid BPM between 30 and 250');
      return;
    }
    onSubmit(num);
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Log Heart Rate</DialogTitle>
          <DialogDescription>
            Enter your current heart rate reading.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-5">
          <Label htmlFor="bpm-input">BPM</Label>
          <Input
            id="bpm-input"
            type="number"
            min="30"
            max="250"
            placeholder="72"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            className="col-span-1"
            autoFocus
          />
          <span className="text-muted-foreground">bpm</span>
        </div>
        <div className="flex flex-wrap gap-2 px-4">
          {[55, 65, 72, 80, 95, 110].map((preset) => (
            <Button
              key={preset}
              type="button"
              variant={bpm === preset.toString() ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBpm(preset.toString())}
            >
              {preset}
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
              'Log Reading'
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default HeartRatePage;
