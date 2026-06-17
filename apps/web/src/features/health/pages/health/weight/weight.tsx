import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  Scale,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  Loader2,
  Settings,
  Target,
  StickyNote,
  Lock,
  Lightbulb,
} from 'lucide-react';
import { PrivacyNotice } from '@/components/common/privacy-notice';
import { toast } from 'sonner';
import type {
  WeightGoalResponse,
  WeightGoalType,
  WeightUnit,
} from '@varaperformance/core';
import {
  useWeightLogs,
  useCreateWeightLog,
  useDeleteWeightLog,
  useWeightGoal,
  useUpdateWeightGoal,
  type WeightLogResponse,
} from '@/features/health';

// Helper to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Get days difference
const getDaysDiff = (dateString: string) => {
  const now = new Date();
  const then = new Date(dateString);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
};

const UNIT_LABELS: Record<WeightUnit, string> = {
  LB: 'lbs',
  KG: 'kg',
  OZ: 'oz',
  G: 'g',
};

const SOURCE_LABELS: Record<string, string> = {
  APPLE_HEALTH: 'Apple Health',
  GOOGLE_FIT: 'Google Fit',
  MANUAL: 'Manual',
  STRAVA: 'Strava',
  FITBIT: 'Fitbit',
  GARMIN: 'Garmin',
  OURA_RING: 'Oura',
  APPLE_WATCH: 'Apple Watch',
  WITHINGS: 'Withings',
  WHOOP: 'Whoop',
  MYFITNESSPAL: 'MyFitnessPal',
  LOSE_IT: 'Lose It!',
};

function formatSource(source: string): string {
  return SOURCE_LABELS[source] ?? source.replace(/_/g, ' ');
}

function WeightPage() {
  const isMobile = useIsMobile();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [noteViewLog, setNoteViewLog] = useState<WeightLogResponse | null>(
    null,
  );

  const { data: logsData, isLoading, error } = useWeightLogs();
  const { data: goalData } = useWeightGoal();

  const createMutation = useCreateWeightLog({
    onSuccess: () => {
      toast.success('Weight logged successfully');
      setShowAddDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to log weight');
    },
  });

  const deleteMutation = useDeleteWeightLog({
    onSuccess: () => {
      toast.success('Entry deleted');
      setDeleteLogId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete entry');
    },
  });

  const updateGoalMutation = useUpdateWeightGoal({
    onSuccess: () => {
      toast.success('Goal updated!');
      setShowGoalDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update goal');
    },
  });

  const logs = logsData?.data?.items || [];
  const stats = logsData?.data?.stats;
  const goal = goalData?.data;

  // Calculate stats
  const latestWeight = logs[0];
  const previousWeight = logs[1];
  const weekAgoWeight = logs.find((log: WeightLogResponse) => {
    const daysDiff = getDaysDiff(log.loggedAt);
    return daysDiff >= 7;
  });

  const getWeightChange = (
    current?: WeightLogResponse,
    previous?: WeightLogResponse,
  ) => {
    if (!current || !previous) return null;
    // Convert to same unit if needed
    const currentLb =
      current.unit === 'KG' ? current.value * 2.20462 : current.value;
    const previousLb =
      previous.unit === 'KG' ? previous.value * 2.20462 : previous.value;
    return currentLb - previousLb;
  };

  const dayChange = getWeightChange(latestWeight, previousWeight);
  const weekChange = getWeightChange(latestWeight, weekAgoWeight);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Body Metrics Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Weight Tracking
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Log consistently, monitor trends, and stay aligned with your
                goal.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full transition-transform duration-200 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <GoalDialog
                  currentGoal={goal}
                  onSubmit={(data) => updateGoalMutation.mutate(data)}
                  isLoading={updateGoalMutation.isPending}
                />
              </Dialog>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    className="h-9 w-9 bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    aria-label="Log weight"
                    title="Log weight"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <AddWeightDialog
                  onSubmit={(data) =>
                    createMutation.mutate({
                      value: data.weight,
                      unit: data.unit,
                      note: data.note,
                      bodyFat: data.bodyFat,
                      muscleMass: data.muscleMass,
                    })
                  }
                  isLoading={createMutation.isPending}
                />
              </Dialog>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {latestWeight && (
              <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
                <Scale className="mr-1.5 h-3.5 w-3.5 text-primary" />
                {latestWeight.value}{' '}
                {UNIT_LABELS[latestWeight.unit as WeightUnit]}
              </div>
            )}
            <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              {logs.length} entr{logs.length === 1 ? 'y' : 'ies'}
            </div>
            {goal && (
              <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
                <Target className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                Goal {goal.targetWeight}{' '}
                {UNIT_LABELS[goal.targetUnit as WeightUnit]}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Quick start: log your current weight first, then check trends in
                the cards below after a few entries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div
        className={cn(
          'grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-400 motion-reduce:animate-none',
          isMobile ? 'grid-cols-1' : 'xl:grid-cols-[380px_1fr]',
        )}
      >
        {/* Left Column - Stats */}
        <div
          className={cn(
            'space-y-4',
            isMobile ? 'order-2' : 'xl:sticky xl:top-6 xl:h-fit',
          )}
        >
          {/* Current Weight Card */}
          <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <div className="bg-linear-to-br from-primary/10 via-transparent to-primary/5">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Current Weight</CardTitle>
                <CardDescription>Most recent check-in</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-6 w-32 mt-4" />
                  </div>
                ) : latestWeight ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Scale className="h-8 w-8 text-primary" />
                    </div>
                    <span className="text-4xl font-bold tabular-nums">
                      {latestWeight.value}
                    </span>
                    <span className="text-muted-foreground">
                      {UNIT_LABELS[latestWeight.unit as WeightUnit]}
                    </span>
                    <p className="text-sm text-muted-foreground mt-2">
                      Last updated {formatDate(latestWeight.loggedAt)}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-4">
                    <Scale className="h-10 w-10 text-muted-foreground/50 mb-2" />
                    <span className="text-muted-foreground">No data yet</span>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>

          {/* Goal Progress Card */}
          {goal && latestWeight && goal.goalType !== 'MAINTAIN' && (
            <Card className="border-l-4 border-l-primary transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Goal Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold tabular-nums">
                      {goal.targetWeight}{' '}
                      <span className="text-base font-normal text-muted-foreground">
                        {UNIT_LABELS[goal.targetUnit as WeightUnit]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {goal.goalType === 'LOSE' ? 'Lose' : 'Gain'}{' '}
                      {goal.weeklyRate} lbs/week
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        'text-lg font-semibold tabular-nums',
                        goal.goalType === 'LOSE'
                          ? latestWeight.value > goal.targetWeight
                            ? 'text-amber-500'
                            : 'text-green-500'
                          : latestWeight.value < goal.targetWeight
                            ? 'text-amber-500'
                            : 'text-green-500',
                      )}
                    >
                      {Math.abs(latestWeight.value - goal.targetWeight).toFixed(
                        1,
                      )}{' '}
                      lbs
                    </div>
                    <p className="text-xs text-muted-foreground">to go</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Changes Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card
              className={cn(
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                dayChange !== null && dayChange < 0 && 'border-green-500/30',
                dayChange !== null && dayChange > 0 && 'border-amber-500/30',
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Since Last Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : dayChange !== null ? (
                  <div className="flex items-center gap-2">
                    {dayChange < 0 ? (
                      <TrendingDown className="h-5 w-5 text-green-500" />
                    ) : dayChange > 0 ? (
                      <TrendingUp className="h-5 w-5 text-amber-500" />
                    ) : (
                      <Minus className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        'text-xl font-bold tabular-nums',
                        dayChange < 0 && 'text-green-500',
                        dayChange > 0 && 'text-amber-500',
                      )}
                    >
                      {dayChange > 0 ? '+' : ''}
                      {dayChange.toFixed(1)}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Need more data
                  </span>
                )}
              </CardContent>
            </Card>

            <Card
              className={cn(
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                weekChange !== null && weekChange < 0 && 'border-green-500/30',
                weekChange !== null && weekChange > 0 && 'border-amber-500/30',
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Past 7 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : weekChange !== null ? (
                  <div className="flex items-center gap-2">
                    {weekChange < 0 ? (
                      <TrendingDown className="h-5 w-5 text-green-500" />
                    ) : weekChange > 0 ? (
                      <TrendingUp className="h-5 w-5 text-amber-500" />
                    ) : (
                      <Minus className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        'text-xl font-bold tabular-nums',
                        weekChange < 0 && 'text-green-500',
                        weekChange > 0 && 'text-amber-500',
                      )}
                    >
                      {weekChange > 0 ? '+' : ''}
                      {weekChange.toFixed(1)}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Need 7+ days
                  </span>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats Summary */}
          {stats && (
            <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 divide-x text-center">
                  <div className="px-2">
                    <div className="text-lg font-semibold tabular-nums">
                      {stats.min}
                    </div>
                    <div className="text-xs text-muted-foreground">Min</div>
                  </div>
                  <div className="px-2">
                    <div className="text-lg font-semibold tabular-nums">
                      {stats.avg.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg</div>
                  </div>
                  <div className="px-2">
                    <div className="text-lg font-semibold tabular-nums">
                      {stats.max}
                    </div>
                    <div className="text-xs text-muted-foreground">Max</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - History */}
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
                  History
                </CardTitle>
                <CardDescription className="mt-1">
                  Your weight entries over time
                </CardDescription>
              </div>
              <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                {logs.length} entries
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                Failed to load weight history
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Scale className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="font-medium text-muted-foreground">
                  No weight entries yet
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Log Weight" to add your first entry
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log: WeightLogResponse, index: number) => {
                  const prevLog = logs[index + 1];
                  const change = getWeightChange(log, prevLog);

                  return (
                    <div
                      key={log.id}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group motion-reduce:transition-none motion-reduce:hover:translate-y-0 animate-in fade-in slide-in-from-bottom-2',
                        log.note && 'cursor-pointer',
                        index === 0 && 'border-primary/30 bg-primary/5',
                      )}
                      style={{ animationDelay: `${index * 35}ms` }}
                      onClick={() => log.note && setNoteViewLog(log)}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'h-10 w-10 rounded-full flex items-center justify-center',
                            index === 0 ? 'bg-primary/20' : 'bg-muted',
                          )}
                        >
                          <Scale
                            className={cn(
                              'h-5 w-5',
                              index === 0
                                ? 'text-primary'
                                : 'text-muted-foreground',
                            )}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-lg tabular-nums">
                              {log.value} {UNIT_LABELS[log.unit as WeightUnit]}
                            </span>
                            {change !== null && (
                              <span
                                className={cn(
                                  'text-sm font-medium px-2 py-0.5 rounded-full',
                                  change < 0 &&
                                    'bg-green-500/10 text-green-500',
                                  change > 0 &&
                                    'bg-amber-500/10 text-amber-500',
                                  change === 0 &&
                                    'bg-muted text-muted-foreground',
                                )}
                              >
                                {change > 0 ? '+' : ''}
                                {change.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {formatDate(log.loggedAt)}
                            {log.source && log.source !== 'MANUAL' && (
                              <span className="text-[10px] px-1.5 py-0 rounded-full border font-normal text-muted-foreground">
                                {formatSource(log.source)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {log.note && (
                          <StickyNote className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteLogId(log.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteLogId}
        onOpenChange={() => setDeleteLogId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this weight entry? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLogId && deleteMutation.mutate(deleteLogId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Note View Sheet */}
      <Sheet open={!!noteViewLog} onOpenChange={() => setNoteViewLog(null)}>
        <SheetContent className="sm:max-w-md w-full">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <StickyNote className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle>Weight Log Note</SheetTitle>
                <SheetDescription className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Encrypted note
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          {noteViewLog && (
            <div className="mt-6">
              <div className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(noteViewLog.loggedAt)} · {noteViewLog.value}{' '}
                {UNIT_LABELS[noteViewLog.unit as WeightUnit]}
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {noteViewLog.note}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <PrivacyNotice variant="health" />
    </div>
  );
}

interface AddWeightDialogProps {
  onSubmit: (data: {
    weight: number;
    unit: WeightUnit;
    note?: string;
    bodyFat?: number;
    muscleMass?: number;
  }) => void;
  isLoading: boolean;
}

function AddWeightDialog({ onSubmit, isLoading }: AddWeightDialogProps) {
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<WeightUnit>('LB');
  const [note, setNote] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }

    const bodyFatNum = bodyFat ? parseFloat(bodyFat) : undefined;
    if (
      bodyFatNum !== undefined &&
      (isNaN(bodyFatNum) || bodyFatNum < 1 || bodyFatNum > 70)
    ) {
      toast.error('Body fat must be between 1% and 70%');
      return;
    }

    const muscleMassNum = muscleMass ? parseFloat(muscleMass) : undefined;
    if (
      muscleMassNum !== undefined &&
      (isNaN(muscleMassNum) || muscleMassNum <= 0)
    ) {
      toast.error('Please enter a valid muscle mass');
      return;
    }

    onSubmit({
      weight: weightNum,
      unit,
      note: note.trim() || undefined,
      bodyFat: bodyFatNum,
      muscleMass: muscleMassNum,
    });
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Log Weight</DialogTitle>
          <DialogDescription>
            Record your current weight. Your data is encrypted for privacy.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="weight" className="text-right">
              Weight
            </Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="col-span-2"
              autoFocus
            />
            <Select
              value={unit}
              onValueChange={(v) => setUnit(v as WeightUnit)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LB">lbs</SelectItem>
                <SelectItem value="KG">kg</SelectItem>
                <SelectItem value="OZ">oz</SelectItem>
                <SelectItem value="G">g</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bodyFat" className="text-right">
              Body Fat
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="bodyFat"
                type="number"
                step="0.1"
                min="1"
                max="70"
                placeholder="Optional"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="muscleMass" className="text-right">
              Muscle Mass
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="muscleMass"
                type="number"
                step="0.1"
                min="0"
                placeholder="Optional"
                value={muscleMass}
                onChange={(e) => setMuscleMass(e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">
                {unit === 'LB' ? 'lbs' : 'kg'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="note" className="text-right pt-2">
              Note
            </Label>
            <Textarea
              id="note"
              placeholder="Optional note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="col-span-3"
              rows={2}
            />
          </div>
        </div>
        <PrivacyNotice variant="health" />
        <DialogFooter>
          <Button type="submit" disabled={isLoading || !weight}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Scale className="h-4 w-4 mr-2" />
                Log Weight
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

interface GoalDialogProps {
  currentGoal?: Pick<
    WeightGoalResponse,
    'targetWeight' | 'targetUnit' | 'goalType' | 'weeklyRate'
  >;
  onSubmit: (data: {
    targetWeight: number;
    targetUnit: WeightUnit;
    goalType: WeightGoalType;
    weeklyRate: number;
  }) => void;
  isLoading: boolean;
}

function GoalDialog({ currentGoal, onSubmit, isLoading }: GoalDialogProps) {
  const [targetWeight, setTargetWeight] = useState(
    currentGoal?.targetWeight?.toString() || '150',
  );
  const [targetUnit, setTargetUnit] = useState<WeightUnit>(
    currentGoal?.targetUnit || 'LB',
  );
  const [goalType, setGoalType] = useState<WeightGoalType>(
    currentGoal?.goalType || 'MAINTAIN',
  );
  const [weeklyRate, setWeeklyRate] = useState(
    currentGoal?.weeklyRate?.toString() || '1',
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightNum = parseFloat(targetWeight);
    const rateNum = parseFloat(weeklyRate);
    if (isNaN(weightNum) || weightNum <= 0) {
      toast.error('Please enter a valid target weight');
      return;
    }
    onSubmit({
      targetWeight: weightNum,
      targetUnit,
      goalType,
      weeklyRate: goalType === 'MAINTAIN' ? 0 : rateNum,
    });
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Set Weight Goal</DialogTitle>
          <DialogDescription>
            Set your target weight and how fast you want to reach it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="goalType" className="text-right">
              Goal
            </Label>
            <Select
              value={goalType}
              onValueChange={(v) => setGoalType(v as WeightGoalType)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOSE">Lose Weight</SelectItem>
                <SelectItem value="GAIN">Gain Weight</SelectItem>
                <SelectItem value="MAINTAIN">Maintain Weight</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="targetWeight" className="text-right">
              Target
            </Label>
            <Input
              id="targetWeight"
              type="number"
              step="0.1"
              min="0"
              placeholder="150"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              className="col-span-2"
            />
            <Select
              value={targetUnit}
              onValueChange={(v) => setTargetUnit(v as WeightUnit)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LB">lbs</SelectItem>
                <SelectItem value="KG">kg</SelectItem>
                <SelectItem value="OZ">oz</SelectItem>
                <SelectItem value="G">g</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {goalType !== 'MAINTAIN' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="weeklyRate" className="text-right">
                Rate
              </Label>
              <Select value={weeklyRate} onValueChange={setWeeklyRate}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5 lbs/week (Slow)</SelectItem>
                  <SelectItem value="1">1 lb/week (Recommended)</SelectItem>
                  <SelectItem value="1.5">1.5 lbs/week (Moderate)</SelectItem>
                  <SelectItem value="2">2 lbs/week (Aggressive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isLoading || !targetWeight}>
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

export default WeightPage;
