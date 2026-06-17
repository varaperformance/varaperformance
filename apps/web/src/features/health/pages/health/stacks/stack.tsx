import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  formatDateInTimezone,
  getRelativeDateInTimezone,
  getTodayInTimezone,
} from '@varaperformance/core';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Check,
  Sun,
  Sunset,
  Moon,
  Pill,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  GripVertical,
  Loader2,
  Flame,
  Target,
  Sparkles,
  Lightbulb,
  Share2,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { PrivacyNotice } from '@/components/common/privacy-notice';
import { toast } from 'sonner';
import {
  useStacks,
  useActiveStack,
  useCreateStack,
  useActivateStack,
  useDeleteStack,
  useAddStackItem,
  useDeleteStackItem,
  useBatchUpdateItems,
  useLogIntake,
  useStackLogs,
  useResetLogs,
  type StackItemResponse,
  type StackTip,
  type TimeSlot,
} from '@/features/health';
import { useTimezone } from '@/features/profile';

// Time slot configuration
const timeSlots: {
  id: TimeSlot;
  label: string;
  icon: typeof Sun;
  description: string;
  color: string;
  gradient: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    id: 'MORNING',
    label: 'Morning',
    icon: Sun,
    description: 'Before or with breakfast',
    color: 'text-amber-500',
    gradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  {
    id: 'AFTERNOON',
    label: 'Afternoon',
    icon: Sunset,
    description: 'With lunch or mid-day',
    color: 'text-orange-500',
    gradient: 'from-orange-500/10 via-rose-500/5 to-transparent',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
  },
  {
    id: 'EVENING',
    label: 'Evening',
    icon: Moon,
    description: 'Before bed or with dinner',
    color: 'text-indigo-400',
    gradient: 'from-indigo-500/10 via-purple-500/5 to-transparent',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-400/20',
  },
];

// Default tips shown when no custom tips are available
const defaultTips: StackTip[] = [
  {
    timeSlot: 'MORNING',
    title: 'Morning',
    content:
      'Schedule your supplements here and get personalized timing and stacking tips.',
  },
  {
    timeSlot: 'AFTERNOON',
    title: 'Afternoon',
    content:
      'Add midday supplements to get tips on meal pairing and absorption.',
  },
  {
    timeSlot: 'EVENING',
    title: 'Evening',
    content: 'Add evening supplements to get recovery and sleep-support tips.',
  },
];

const buildElevateStackPayload = (stack: {
  id: string;
  name: string;
  items: { name: string; dosage: string }[];
}): string => {
  const payload = [
    {
      stackId: stack.id,
      name: stack.name,
      itemCount: stack.items.length,
      items: stack.items.slice(0, 10).map((item) => ({
        name: item.name,
        dosage: item.dosage,
      })),
    },
  ];

  return encodeURIComponent(JSON.stringify(payload));
};

export default function StackPage() {
  const isMobile = useIsMobile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddingNew, setIsAddingNew] = useState(false);
  const navigate = useNavigate();
  const [newSupplement, setNewSupplement] = useState<{
    name: string;
    dosage: string;
    notes: string;
  }>({
    name: '',
    dosage: '',
    notes: '',
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<TimeSlot | null>(null);
  const [pendingChanges, setPendingChanges] = useState<
    Map<string, TimeSlot | null>
  >(new Map());
  const [createStackOpen, setCreateStackOpen] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [deleteStackId, setDeleteStackId] = useState<string | null>(null);

  const timezone = useTimezone();
  const dateKey = formatDateInTimezone(currentDate, timezone);
  const todayKey = getTodayInTimezone(timezone);

  // Queries
  const { data: stacksData, isLoading: isStacksLoading } = useStacks();
  const { data: activeStackData, isLoading: isActiveStackLoading } =
    useActiveStack();
  const stacks = stacksData?.success ? stacksData.data : [];
  const activeStack = activeStackData?.success ? activeStackData.data : null;

  const { data: logsData } = useStackLogs(activeStack?.id || '', dateKey, {
    enabled: !!activeStack?.id,
  });
  const todayLogs = logsData?.success ? logsData.data.logs : {};

  // Mutations
  const createStack = useCreateStack({
    onSuccess: () => {
      toast.success('Stack created');
      setCreateStackOpen(false);
      setNewStackName('');
    },
    onError: () => toast.error('Failed to create stack'),
  });

  const activateStack = useActivateStack({
    onSuccess: () => toast.success('Stack activated'),
    onError: () => toast.error('Failed to activate stack'),
  });

  const deleteStack = useDeleteStack({
    onSuccess: () => {
      toast.success('Stack deleted');
      setDeleteStackId(null);
    },
    onError: () => toast.error('Failed to delete stack'),
  });

  const addItem = useAddStackItem({
    onSuccess: () => {
      toast.success('Supplement added');
      setIsAddingNew(false);
      setNewSupplement({ name: '', dosage: '', notes: '' });
    },
    onError: () => toast.error('Failed to add supplement'),
  });

  const deleteItem = useDeleteStackItem({
    onSuccess: () => toast.success('Supplement removed'),
    onError: () => toast.error('Failed to remove supplement'),
  });

  const batchUpdate = useBatchUpdateItems({
    onSuccess: () => setPendingChanges(new Map()),
    onError: () => toast.error('Failed to update schedule'),
  });

  // Ref to hold stable reference to batchUpdate.mutate
  const batchUpdateRef = useRef(batchUpdate.mutate);
  useLayoutEffect(() => {
    batchUpdateRef.current = batchUpdate.mutate;
  });

  const logIntake = useLogIntake({
    onError: () => toast.error('Failed to log intake'),
  });

  const resetLogs = useResetLogs({
    onSuccess: () => toast.success('Progress reset'),
    onError: () => toast.error('Failed to reset progress'),
  });

  // Save pending changes when they exist and user stops dragging
  useEffect(() => {
    if (pendingChanges.size > 0 && !draggingId && activeStack) {
      const items = Array.from(pendingChanges.entries()).map(
        ([id, timeSlot]) => ({
          id,
          timeSlot,
        }),
      );
      batchUpdateRef.current({ stackId: activeStack.id, data: { items } });
    }
  }, [pendingChanges, draggingId, activeStack]);

  const supplements = activeStack?.items || [];
  const totalSupplements = supplements.length;
  const completedToday = Object.values(todayLogs).filter(Boolean).length;
  const progressPercent =
    totalSupplements > 0 ? (completedToday / totalSupplements) * 100 : 0;

  // Get effective time slot (considering pending changes)
  const getEffectiveTimeSlot = (item: StackItemResponse): TimeSlot | null => {
    if (pendingChanges.has(item.id)) {
      return pendingChanges.get(item.id) ?? null;
    }
    return item.timeSlot;
  };

  // Get supplements for a specific time slot
  const getSupplementsBySlot = (slot: TimeSlot) =>
    supplements.filter((s) => getEffectiveTimeSlot(s) === slot);

  // Get unassigned supplements
  const getUnassignedSupplements = () =>
    supplements.filter((s) => getEffectiveTimeSlot(s) === null);

  // Calculate slot progress
  const getSlotProgress = (slot: TimeSlot) => {
    const slotSupplements = getSupplementsBySlot(slot);
    const completed = slotSupplements.filter((s) => todayLogs[s.id]).length;
    return { completed, total: slotSupplements.length };
  };

  // Toggle supplement taken status
  const toggleSupplement = (itemId: string) => {
    if (!activeStack) return;
    const currentlyTaken = todayLogs[itemId] || false;
    logIntake.mutate({
      stackId: activeStack.id,
      itemId,
      date: dateKey,
      taken: !currentlyTaken,
    });
  };

  // Add new supplement
  const handleAddSupplement = () => {
    if (!newSupplement.name || !newSupplement.dosage || !activeStack) return;
    addItem.mutate({
      stackId: activeStack.id,
      data: {
        name: newSupplement.name,
        dosage: newSupplement.dosage,
        notes: newSupplement.notes || undefined,
      },
    });
  };

  // Delete supplement
  const handleDeleteSupplement = (itemId: string) => {
    if (!activeStack) return;
    deleteItem.mutate({ stackId: activeStack.id, itemId });
  };

  // Navigate dates
  const goToDate = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + offset);
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  // Reset today's log
  const resetToday = () => {
    if (!activeStack) return;
    resetLogs.mutate({ stackId: activeStack.id, date: dateKey });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, supplementId: string) => {
    setDraggingId(supplementId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', supplementId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverSlot(null);
  };

  const handleDragOver = (e: React.DragEvent, slot: TimeSlot) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(slot);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, slot: TimeSlot) => {
    e.preventDefault();
    const supplementId = e.dataTransfer.getData('text/plain');
    if (supplementId) {
      setPendingChanges((prev) => new Map(prev).set(supplementId, slot));
    }
    setDraggingId(null);
    setDragOverSlot(null);
  };

  // Remove from time slot (drag back to unassigned)
  const removeFromSlot = (supplementId: string) => {
    setPendingChanges((prev) => new Map(prev).set(supplementId, null));
  };

  // Handle stack selection
  const handleStackChange = (stackId: string) => {
    if (stackId === 'new') {
      setCreateStackOpen(true);
    } else {
      activateStack.mutate(stackId);
    }
  };

  // Handle create stack
  const handleCreateStack = () => {
    if (!newStackName.trim()) return;
    createStack.mutate({ name: newStackName.trim() });
  };

  const isLoading = isStacksLoading || isActiveStackLoading;

  if (isLoading) {
    return (
      <div className="w-full px-4 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div
          className={cn(
            'grid gap-6',
            isMobile ? 'grid-cols-1' : 'lg:grid-cols-2',
          )}
        >
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] sm:px-6 lg:px-8 space-y-6">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-500/10 via-transparent to-teal-500/10" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 -bottom-8 h-28 w-28 rounded-full bg-teal-500/15 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Pill className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Daily Protocol
              </p>
              <h1 className="text-3xl font-bold tracking-tight mt-1">
                Supplement Stack
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Track your daily supplement intake by time of day
              </p>
            </div>
          </div>
          {activeStack && activeStack.items.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const payload = buildElevateStackPayload(activeStack);
                navigate(`/elevate?compose=1&stack=${payload}`);
                toast.success('Stack attached to Elevate composer');
              }}
              aria-label={`Share ${activeStack.name} to Elevate`}
              title={`Share ${activeStack.name} to Elevate`}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="relative mt-4 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Create a stack, add supplements, then drag items into morning,
              afternoon, or evening slots for a simple daily checklist.
            </p>
          </div>
        </div>

        {/* Stats row */}
        {activeStack && supplements.length > 0 && (
          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-muted/70 bg-card/60 backdrop-blur-sm p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Pill className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{supplements.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-muted/70 bg-card/60 backdrop-blur-sm p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Target className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Today</p>
                  <p className="text-lg font-bold">
                    {Math.round(progressPercent)}%
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-muted/70 bg-card/60 backdrop-blur-sm p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                  <Flame className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                  <p className="text-lg font-bold">
                    {
                      supplements.filter(
                        (s) => getEffectiveTimeSlot(s) !== null,
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-muted/70 bg-card/60 backdrop-blur-sm p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taken</p>
                  <p className="text-lg font-bold">
                    {Object.values(todayLogs).filter(Boolean).length}/
                    {
                      supplements.filter(
                        (s) => getEffectiveTimeSlot(s) !== null,
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* No stacks - show create prompt */}
      {stacks.length === 0 ? (
        <Card className="relative overflow-hidden border-dashed border-muted/70">
          <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
          <CardContent className="relative flex flex-col items-center justify-center py-16 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 mb-6">
              <Pill className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Create your first stack</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              A stack is a collection of supplements you take together. Organize
              them by morning, afternoon, and evening for easy tracking.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <Badge variant="secondary" className="gap-1.5">
                <Sun className="h-3 w-3 text-amber-500" />
                Morning
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Sunset className="h-3 w-3 text-orange-500" />
                Afternoon
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Moon className="h-3 w-3 text-indigo-400" />
                Evening
              </Badge>
            </div>
            <Dialog open={createStackOpen} onOpenChange={setCreateStackOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="gap-2 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-500/90 hover:to-teal-600/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <Plus className="h-5 w-5" />
                  Create Stack
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create new stack</DialogTitle>
                  <DialogDescription>
                    Give your supplement stack a name to get started.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="stack-name">Stack name</Label>
                    <Input
                      id="stack-name"
                      placeholder="e.g., Daily Essentials"
                      value={newStackName}
                      onChange={(e) => setNewStackName(e.target.value)}
                    />
                  </div>
                </div>
                <PrivacyNotice variant="health" />
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateStackOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateStack}
                    disabled={!newStackName.trim() || createStack.isPending}
                  >
                    {createStack.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            'grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-400 motion-reduce:animate-none',
            isMobile ? 'grid-cols-1' : 'lg:grid-cols-2',
          )}
        >
          {/* Left Column - Daily Checklist */}
          <div className="space-y-6">
            {/* Stack Selector & Date Navigation */}
            <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-6">
                  {/* Stack Selector */}
                  <div className="flex items-center gap-3">
                    <Select
                      value={activeStack?.id || ''}
                      onValueChange={handleStackChange}
                    >
                      <SelectTrigger className="w-full border-muted/70">
                        <SelectValue placeholder="Select a stack" />
                      </SelectTrigger>
                      <SelectContent>
                        {stacks.map((stack) => (
                          <SelectItem key={stack.id} value={stack.id}>
                            <div className="flex items-center gap-2">
                              <Pill className="h-4 w-4" />
                              <span>{stack.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({stack.itemCount} items)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="new">
                          <div className="flex items-center gap-2 text-primary">
                            <Plus className="h-4 w-4" />
                            <span>Create new stack</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {activeStack && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteStackId(activeStack.id)}
                        className="shrink-0 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                        title="Delete stack"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {/* Date Navigator & Progress */}
                  {activeStack && (
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                      {/* Date Navigator */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => goToDate(-1)}
                          className="h-9 w-9"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="w-36 text-center">
                          <div className="text-lg font-semibold">
                            {getRelativeDateInTimezone(currentDate, timezone)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {currentDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => goToDate(1)}
                          className="h-9 w-9"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        {dateKey !== todayKey && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={goToToday}
                            className="ml-2"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Today
                          </Button>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="flex items-center gap-4">
                        <div className="min-w-0 flex-1 sm:w-48">
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Daily Progress
                            </span>
                            <span className="font-medium">
                              {completedToday}/{totalSupplements}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                        {completedToday > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={resetToday}
                            className="h-9 w-9 text-muted-foreground hover:text-foreground"
                            title="Reset today's progress"
                            disabled={resetLogs.isPending}
                          >
                            {resetLogs.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* No active stack selected */}
            {!activeStack && stacks.length > 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Pill className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No active stack
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Select a stack above to start tracking
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Time Slot Sections */}
            {activeStack &&
              timeSlots.map((slot) => {
                const slotSupplements = getSupplementsBySlot(slot.id);
                const { completed, total } = getSlotProgress(slot.id);
                const SlotIcon = slot.icon;
                const isDragOver = dragOverSlot === slot.id;
                const isSlotComplete = total > 0 && completed === total;

                return (
                  <Card
                    key={slot.id}
                    className={cn(
                      'relative overflow-hidden border-muted/70 transition-all duration-200 hover:shadow-md',
                      isDragOver &&
                        'ring-2 ring-primary ring-offset-2 ring-offset-background',
                      isSlotComplete && 'border-primary/30',
                    )}
                    onDragOver={(e) => handleDragOver(e, slot.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, slot.id)}
                  >
                    {/* Gradient background */}
                    <div
                      className={cn(
                        'absolute inset-0 bg-linear-to-br opacity-50',
                        slot.gradient,
                      )}
                    />

                    <CardHeader className="relative pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-11 w-11 items-center justify-center rounded-xl shadow-sm',
                              slot.bgColor,
                              slot.borderColor,
                              'border',
                            )}
                          >
                            <SlotIcon className={cn('h-5 w-5', slot.color)} />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {slot.label}
                              {isSlotComplete && (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 bg-primary/10 text-primary text-xs"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  Complete
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {slot.description}
                            </CardDescription>
                            {/* Inline tip for this time slot */}
                            {(() => {
                              const tips = activeStack?.tips ?? defaultTips;
                              const tip = tips.find(
                                (t) => t.timeSlot === slot.id,
                              );
                              return tip ? (
                                <p className="text-xs text-muted-foreground/80 mt-1.5 flex items-center gap-1.5">
                                  <Sparkles className="h-3 w-3 text-blue-500/70 shrink-0" />
                                  {tip.content}
                                </p>
                              ) : null;
                            })()}
                          </div>
                        </div>
                        {total > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-500',
                                  isSlotComplete
                                    ? 'bg-primary'
                                    : 'bg-primary/60',
                                )}
                                style={{
                                  width: `${(completed / total) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground min-w-8 text-right">
                              <span className="font-medium text-foreground">
                                {completed}
                              </span>
                              /{total}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      {slotSupplements.length === 0 ? (
                        <div
                          className={cn(
                            'rounded-xl border-2 border-dashed py-10 text-center transition-all',
                            isDragOver
                              ? 'border-primary bg-primary/5 scale-[1.02]'
                              : 'border-border/40 hover:border-border/60',
                          )}
                        >
                          <div
                            className={cn(
                              'mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full',
                              slot.bgColor,
                            )}
                          >
                            <Pill
                              className={cn('h-6 w-6 opacity-60', slot.color)}
                            />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {isDragOver
                              ? 'Drop to schedule'
                              : 'Drag supplements here'}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {slot.description}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {slotSupplements.map((supplement) => {
                            const isCompleted = todayLogs[supplement.id];

                            return (
                              <div
                                key={supplement.id}
                                className={cn(
                                  'group flex w-full items-center gap-3 rounded-xl border p-4 transition-all',
                                  isCompleted
                                    ? 'border-primary/30 bg-primary/5'
                                    : 'border-border/50 hover:border-border hover:bg-muted/30',
                                )}
                              >
                                {/* Checkbox */}
                                <button
                                  onClick={() =>
                                    toggleSupplement(supplement.id)
                                  }
                                  className={cn(
                                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                                    isCompleted
                                      ? 'border-primary bg-primary text-primary-foreground scale-110'
                                      : 'border-muted-foreground/30 hover:border-primary hover:scale-105',
                                  )}
                                >
                                  {isCompleted && <Check className="h-4 w-4" />}
                                </button>

                                {/* Supplement Info */}
                                <div
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() =>
                                    toggleSupplement(supplement.id)
                                  }
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        'font-medium transition-all',
                                        isCompleted &&
                                          'line-through text-muted-foreground',
                                      )}
                                    >
                                      {supplement.name}
                                    </span>
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                      {supplement.dosage}
                                    </span>
                                  </div>
                                  {supplement.notes && (
                                    <p className="mt-0.5 text-sm text-muted-foreground truncate">
                                      {supplement.notes}
                                    </p>
                                  )}
                                </div>

                                {/* Remove from slot button */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFromSlot(supplement.id)}
                                  className={cn(
                                    'h-7 w-7 shrink-0 transition-opacity',
                                    isMobile
                                      ? 'opacity-100'
                                      : 'opacity-0 group-hover:opacity-100',
                                  )}
                                  title="Remove from time slot"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Right Column - My Stack */}
          <div className="space-y-6 md:sticky md:top-8 md:self-start">
            {activeStack && (
              <Card className="relative overflow-hidden border-muted/70 transition-all duration-200 hover:shadow-md md:hover:shadow-lg">
                <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <Pill className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {activeStack.name}
                        </CardTitle>
                        <CardDescription>
                          {supplements.length} supplement
                          {supplements.length !== 1 ? 's' : ''} • Drag to
                          schedule
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-4">
                  {/* Unassigned Supplements */}
                  {getUnassignedSupplements().length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs"
                        >
                          <Target className="h-3 w-3" />
                          Unassigned
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {getUnassignedSupplements().map((supplement) => (
                          <div
                            key={supplement.id}
                            draggable
                            onDragStart={(e) =>
                              handleDragStart(e, supplement.id)
                            }
                            onDragEnd={handleDragEnd}
                            className={cn(
                              'group flex items-center gap-2 rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-3 cursor-grab active:cursor-grabbing transition-all hover:border-amber-500/60 hover:bg-amber-500/10',
                              draggingId === supplement.id &&
                                'opacity-50 scale-95',
                            )}
                          >
                            <GripVertical className="h-4 w-4 shrink-0 text-amber-500/60" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                  {supplement.name}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {supplement.dosage}
                                </Badge>
                              </div>
                              {supplement.notes && (
                                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                                  {supplement.notes}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleDeleteSupplement(supplement.id)
                              }
                              className={cn(
                                'h-7 w-7 shrink-0 transition-opacity',
                                isMobile
                                  ? 'opacity-100'
                                  : 'opacity-0 group-hover:opacity-100',
                              )}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assigned Supplements */}
                  {supplements.filter((s) => getEffectiveTimeSlot(s) !== null)
                    .length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs"
                        >
                          <Check className="h-3 w-3" />
                          Scheduled
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {supplements
                          .filter((s) => getEffectiveTimeSlot(s) !== null)
                          .map((supplement) => {
                            const effectiveSlot =
                              getEffectiveTimeSlot(supplement);
                            const slot = timeSlots.find(
                              (s) => s.id === effectiveSlot,
                            );
                            const SlotIcon = slot?.icon || Sun;
                            return (
                              <div
                                key={supplement.id}
                                draggable
                                onDragStart={(e) =>
                                  handleDragStart(e, supplement.id)
                                }
                                onDragEnd={handleDragEnd}
                                className={cn(
                                  'group flex items-center gap-2 rounded-xl border px-3 py-3 cursor-grab active:cursor-grabbing transition-all hover:bg-muted/50',
                                  slot?.borderColor,
                                  'bg-card/50',
                                  draggingId === supplement.id &&
                                    'opacity-50 scale-95',
                                )}
                              >
                                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                                <div
                                  className={cn(
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                                    slot?.bgColor,
                                  )}
                                >
                                  <SlotIcon
                                    className={cn('h-3.5 w-3.5', slot?.color)}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">
                                      {supplement.name}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {supplement.dosage}
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleDeleteSupplement(supplement.id)
                                  }
                                  className={cn(
                                    'h-7 w-7 shrink-0 transition-opacity',
                                    isMobile
                                      ? 'opacity-100'
                                      : 'opacity-0 group-hover:opacity-100',
                                  )}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {supplements.length === 0 && (
                    <div className="py-10 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500/10 to-teal-500/10">
                        <Pill className="h-7 w-7 text-emerald-500/60" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        No supplements yet
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Add your first supplement below
                      </p>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-border/50 pt-4">
                    {/* Add New Supplement */}
                    {!isAddingNew ? (
                      <Button
                        variant="outline"
                        className="w-full gap-2 h-11"
                        onClick={() => setIsAddingNew(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Add Supplement
                      </Button>
                    ) : (
                      <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-xs font-medium">
                            Supplement Name
                          </Label>
                          <Input
                            id="name"
                            placeholder="e.g., Vitamin D3"
                            value={newSupplement.name}
                            onChange={(e) =>
                              setNewSupplement((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="dosage"
                            className="text-xs font-medium"
                          >
                            Dosage
                          </Label>
                          <Input
                            id="dosage"
                            placeholder="e.g., 5000 IU"
                            value={newSupplement.dosage}
                            onChange={(e) =>
                              setNewSupplement((prev) => ({
                                ...prev,
                                dosage: e.target.value,
                              }))
                            }
                            className="h-9"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="notes"
                            className="text-xs font-medium"
                          >
                            Notes{' '}
                            <span className="text-muted-foreground font-normal">
                              (optional)
                            </span>
                          </Label>
                          <Input
                            id="notes"
                            placeholder="e.g., Take with food"
                            value={newSupplement.notes}
                            onChange={(e) =>
                              setNewSupplement((prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                            className="h-9"
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setIsAddingNew(false);
                              setNewSupplement({
                                name: '',
                                dosage: '',
                                notes: '',
                              });
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={handleAddSupplement}
                            disabled={
                              !newSupplement.name ||
                              !newSupplement.dosage ||
                              addItem.isPending
                            }
                          >
                            {addItem.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            Add
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center pt-2 flex items-center justify-center gap-1.5">
                          <GripVertical className="h-3 w-3" />
                          Drag to schedule after adding
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Create Stack Dialog */}
      <Dialog open={createStackOpen} onOpenChange={setCreateStackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new stack</DialogTitle>
            <DialogDescription>
              Give your supplement stack a name to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-stack-name">Stack name</Label>
              <Input
                id="new-stack-name"
                placeholder="e.g., Daily Essentials"
                value={newStackName}
                onChange={(e) => setNewStackName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateStackOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateStack}
              disabled={!newStackName.trim() || createStack.isPending}
            >
              {createStack.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Stack Confirmation */}
      <AlertDialog
        open={!!deleteStackId}
        onOpenChange={() => setDeleteStackId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete stack?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this stack and all its supplements.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStackId && deleteStack.mutate(deleteStackId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStack.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PrivacyNotice variant="health" />
    </div>
  );
}
