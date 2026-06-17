import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
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
  Plus,
  Trash2,
  Droplets,
  Settings,
  GlassWater,
  Loader2,
  Clock,
  Calendar,
  Target,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { PrivacyNotice } from '@/components/common/privacy-notice';
import { toast } from 'sonner';
import { useTimezone } from '@/features/profile';
import {
  useDailyWaterSummary,
  useLogWater,
  useDeleteWaterLog,
  useWaterGoal,
  useUpdateWaterGoal,
} from '@/features/health';

type VolumeUnit = 'OZ' | 'ML' | 'L' | 'CUPS';

// Helper to format time
const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const UNIT_LABELS: Record<VolumeUnit, string> = {
  OZ: 'oz',
  ML: 'ml',
  L: 'L',
  CUPS: 'cups',
};

// Conversion factors to oz
const OZ_CONVERSIONS: Record<VolumeUnit, number> = {
  OZ: 1,
  ML: 0.033814,
  L: 33.814,
  CUPS: 8,
};

const convertToOz = (amount: number, unit: VolumeUnit): number => {
  return amount * OZ_CONVERSIONS[unit];
};

// Quick add amounts in ounces
const QUICK_ADD = [
  { label: '8 oz', amount: 8, icon: GlassWater },
  { label: '12 oz', amount: 12, icon: GlassWater },
  { label: '16 oz', amount: 16, icon: GlassWater },
  { label: '24 oz', amount: 24, icon: Droplets },
];

function WaterPage() {
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);

  const timezone = useTimezone();
  const dateKey = formatDateInTimezone(selectedDate, timezone);
  const isToday = dateKey === getTodayInTimezone(timezone);

  const { data: summaryData, isLoading, error } = useDailyWaterSummary(dateKey);
  const { data: goalData } = useWaterGoal();

  const navigateDate = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  const logMutation = useLogWater({
    onSuccess: () => {
      toast.success('Water logged!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to log water');
    },
  });

  const deleteMutation = useDeleteWaterLog({
    onSuccess: () => {
      toast.success('Entry removed');
      setDeleteLogId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete entry');
    },
  });

  const updateGoalMutation = useUpdateWaterGoal({
    onSuccess: () => {
      toast.success('Goal updated!');
      setShowGoalDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update goal');
    },
  });

  const summary = summaryData?.data;
  const goal = goalData?.data;
  const logs = summary?.logs || [];
  const totalOz = summary?.totalOz || 0;
  // Convert goal to oz for display
  const goalOz = goal ? convertToOz(goal.targetAmount, goal.targetUnit) : 64;
  const progress = Math.min((totalOz / goalOz) * 100, 100);
  const remainingOz = Math.max(goalOz - totalOz, 0);

  const handleQuickAdd = (amountOz: number) => {
    logMutation.mutate({ amount: amountOz, unit: 'OZ' });
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-blue-500/10 via-transparent to-cyan-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Hydration Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Water Intake
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Stay hydrated with quick logging, daily progress, and clear
                history.
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
                  currentGoal={goalOz}
                  onSubmit={(data) =>
                    updateGoalMutation.mutate({
                      targetAmount: data.goalOz,
                      targetUnit: 'OZ',
                    })
                  }
                  isLoading={updateGoalMutation.isPending}
                />
              </Dialog>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              <Droplets className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
              {Math.round(totalOz)} oz today
            </div>
            <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              <Target className="mr-1.5 h-3.5 w-3.5 text-cyan-500" />
              Goal {goalOz} oz
            </div>
            <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              {logs.length} entr{logs.length === 1 ? 'y' : 'ies'}
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Quick start: use the quick-add buttons to log water fast, then
                fine-tune your daily goal in settings.
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
        {/* Left Column - Progress */}
        <div
          className={cn(
            'space-y-4',
            isMobile ? 'order-2' : 'xl:sticky xl:top-6 xl:h-fit',
          )}
        >
          {/* Progress Card */}
          <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <div className="bg-linear-to-br from-blue-500/10 via-transparent to-cyan-500/10">
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
                ) : error ? (
                  <div className="text-center py-8 text-destructive">
                    Failed to load water data
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    {/* Progress Ring with Glow */}
                    <div className="relative h-48 w-48">
                      <svg className="h-full w-full transform -rotate-90">
                        <defs>
                          <filter
                            id="water-glow"
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
                        {/* Background circle */}
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          strokeWidth="12"
                          className="fill-none stroke-muted"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          strokeWidth="12"
                          strokeLinecap="round"
                          filter={progress > 0 ? 'url(#water-glow)' : undefined}
                          className={cn(
                            'fill-none transition-all duration-500',
                            progress >= 100
                              ? 'stroke-green-500'
                              : 'stroke-blue-500',
                          )}
                          style={{
                            strokeDasharray: `${2 * Math.PI * 88}`,
                            strokeDashoffset: `${2 * Math.PI * 88 * (1 - progress / 100)}`,
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Droplets
                          className={cn(
                            'h-8 w-8 mb-1',
                            progress >= 100
                              ? 'text-green-500'
                              : 'text-blue-500',
                          )}
                        />
                        <span className="text-4xl font-bold tabular-nums">
                          {Math.round(totalOz)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          of {goalOz} oz
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 text-center">
                      <p className="text-lg font-medium">
                        {progress >= 100 ? (
                          <span className="text-green-500">
                            Goal reached! 🎉
                          </span>
                        ) : (
                          <span>{Math.round(remainingOz)} oz to go</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(progress)}% of daily goal
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>

          {/* Quick Add Buttons */}
          <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <GlassWater className="h-5 w-5 text-blue-500" />
                Quick Add
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ADD.map((item) => (
                  <Button
                    key={item.amount}
                    variant="outline"
                    className="h-16 flex flex-col gap-1 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/50 hover:bg-blue-500/5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    onClick={() => handleQuickAdd(item.amount)}
                    disabled={logMutation.isPending}
                  >
                    <item.icon className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">{item.label}</span>
                  </Button>
                ))}
              </div>
              <div className="mt-4">
                <Dialog
                  open={showCustomDialog}
                  onOpenChange={setShowCustomDialog}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="secondary"
                      className="w-full transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Custom Amount
                    </Button>
                  </DialogTrigger>
                  <CustomAmountDialog
                    onSubmit={(data) => {
                      logMutation.mutate(data);
                      setShowCustomDialog(false);
                    }}
                    isLoading={logMutation.isPending}
                  />
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Daily Log */}
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
                  {isToday
                    ? "Today's Log"
                    : getRelativeDateInTimezone(selectedDate, timezone)}
                </CardTitle>
                <CardDescription className="mt-1">
                  Your water intake entries for {isToday ? 'today' : 'this day'}
                </CardDescription>
              </div>
              <div className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                {Math.round(totalOz)} / {goalOz} oz
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                  <Droplets className="h-8 w-8 text-blue-500/50" />
                </div>
                <p className="font-medium text-muted-foreground">
                  No water logged {isToday ? 'yet today' : 'on this day'}
                </p>
                {isToday && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Use quick add buttons to get started
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div
                    key={log.id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group motion-reduce:transition-none motion-reduce:hover:translate-y-0 animate-in fade-in slide-in-from-bottom-2',
                      index === 0 && 'border-blue-500/30 bg-blue-500/5',
                    )}
                    style={{ animationDelay: `${index * 35}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center',
                          index === 0 ? 'bg-blue-500/20' : 'bg-muted',
                        )}
                      >
                        <GlassWater
                          className={cn(
                            'h-5 w-5',
                            index === 0
                              ? 'text-blue-500'
                              : 'text-muted-foreground',
                          )}
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-lg tabular-nums">
                          {log.amount} {UNIT_LABELS[log.unit as VolumeUnit]}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(log.loggedAt)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
                      onClick={() => setDeleteLogId(log.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
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
            <AlertDialogTitle>Remove Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this water entry?
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
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PrivacyNotice variant="health" />
    </div>
  );
}

interface GoalDialogProps {
  currentGoal: number;
  onSubmit: (data: { goalOz: number }) => void;
  isLoading: boolean;
}

function GoalDialog({ currentGoal, onSubmit, isLoading }: GoalDialogProps) {
  const [goal, setGoal] = useState(currentGoal.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const goalNum = parseFloat(goal);
    if (isNaN(goalNum) || goalNum <= 0) {
      toast.error('Please enter a valid goal');
      return;
    }
    onSubmit({ goalOz: goalNum });
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Set Daily Goal</DialogTitle>
          <DialogDescription>
            Set your daily water intake goal in ounces. The recommended amount
            is 64 oz (8 glasses) per day.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="goal" className="text-right">
              Goal
            </Label>
            <Input
              id="goal"
              type="number"
              step="1"
              min="1"
              placeholder="64"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="col-span-2"
              autoFocus
            />
            <span className="text-muted-foreground">oz</span>
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

interface CustomAmountDialogProps {
  onSubmit: (data: { amount: number; unit: VolumeUnit }) => void;
  isLoading: boolean;
}

function CustomAmountDialog({ onSubmit, isLoading }: CustomAmountDialogProps) {
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<VolumeUnit>('OZ');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    onSubmit({ amount: amountNum, unit });
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Log Custom Amount</DialogTitle>
          <DialogDescription>
            Enter a custom water intake amount
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-2"
              autoFocus
            />
            <Select
              value={unit}
              onValueChange={(v) => setUnit(v as VolumeUnit)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OZ">oz</SelectItem>
                <SelectItem value="ML">ml</SelectItem>
                <SelectItem value="L">L</SelectItem>
                <SelectItem value="CUPS">cups</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isLoading || !amount}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Droplets className="h-4 w-4 mr-2" />
                Add Water
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default WaterPage;
