import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Plus,
  Search,
  Trash2,
  Edit2,
  Calendar,
  Dumbbell,
  LayoutGrid,
  List,
  Flame,
  Target,
  Timer,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  usePersonalRecords,
  useCreatePersonalRecord,
  useUpdatePersonalRecord,
  useDeletePersonalRecord,
  PR_TYPE_LABELS,
  formatPRValue,
  type PersonalRecordResponse,
  type PRType,
} from '@/features/health';
import { useExercises } from '@/features/health';
import { useUnitPreference } from '@/features/profile';
import {
  convertWeightFromStorage,
  convertWeightToStorage,
  convertDistanceFromStorage,
  convertDistanceToStorage,
} from '@varaperformance/core';

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const buildElevatePrPayloadFromRecords = (
  records: PersonalRecordResponse[],
  unit: 'imperial' | 'metric',
): string => {
  const payload = records.slice(0, 6).map((pr) => ({
    exerciseName: pr.exercise.name,
    prTypeLabel: PR_TYPE_LABELS[pr.type],
    valueLabel: formatPRValue(pr.type, pr.value, unit),
  }));

  return encodeURIComponent(JSON.stringify(payload));
};

// Get PR types available for exercise category
const getPRTypesForCategory = (category: string): PRType[] => {
  switch (category) {
    case 'STRENGTH':
      return ['MAX_WEIGHT', 'MAX_REPS', 'MAX_VOLUME'];
    case 'CARDIO':
      return ['BEST_PACE', 'LONGEST_DIST', 'LONGEST_TIME'];
    default:
      return ['MAX_REPS', 'LONGEST_TIME'];
  }
};

// Get icon for PR type - returns component reference
const PR_TYPE_ICONS: Record<PRType | 'default', typeof Trophy> = {
  MAX_WEIGHT: Dumbbell,
  MAX_REPS: Target,
  MAX_VOLUME: Flame,
  BEST_PACE: TrendingUp,
  LONGEST_DIST: Timer,
  LONGEST_TIME: Timer,
  default: Trophy,
};

// Render PR type icon
function PRTypeIcon({ type, className }: { type: PRType; className?: string }) {
  const IconComponent = PR_TYPE_ICONS[type] || PR_TYPE_ICONS.default;
  return <IconComponent className={className} />;
}

// PR Card Component - Redesigned with better visibility
function PRCard({
  pr,
  onEdit,
  onDelete,
  viewMode = 'grid',
  unit,
}: {
  pr: PersonalRecordResponse;
  onEdit: () => void;
  onDelete: () => void;
  viewMode?: 'grid' | 'list';
  unit: 'imperial' | 'metric';
}) {
  if (viewMode === 'list') {
    return (
      <div className="group flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-yellow-400 to-amber-500 shadow-md">
          <Trophy className="h-6 w-6 text-white" />
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 md:grid-cols-3 md:items-center">
          <div className="min-w-0 md:col-span-1">
            <h3 className="font-semibold truncate">{pr.exercise.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">
              {pr.exercise.category.toLowerCase()}
            </p>
          </div>
          <div className="flex items-center gap-2 md:col-span-1">
            <PRTypeIcon
              type={pr.type}
              className="h-4 w-4 text-muted-foreground"
            />
            <Badge variant="secondary" className="text-xs">
              {PR_TYPE_LABELS[pr.type]}
            </Badge>
          </div>
          <div className="flex items-center justify-between md:col-span-1">
            <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatPRValue(pr.type, pr.value, unit)}
            </span>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10"
                      onClick={onEdit}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit PR</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 text-destructive"
                      onClick={onDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete PR</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="group relative overflow-hidden bg-linear-to-br from-card via-card to-yellow-500/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* Decorative corner gradient */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-yellow-500/10 to-transparent pointer-events-none" />

      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-linear-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-yellow-500/25">
            <Trophy className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate text-base">
                  {pr.exercise.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs capitalize">
                    {pr.exercise.category.toLowerCase()}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PRTypeIcon
                    type={pr.type}
                    className="h-4 w-4 text-muted-foreground"
                  />
                  <span className="text-xs text-muted-foreground">
                    {PR_TYPE_LABELS[pr.type]}
                  </span>
                </div>
                <span className="text-3xl font-bold bg-linear-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
                  {formatPRValue(pr.type, pr.value, unit)}
                </span>
              </div>

              {/* Action buttons - always visible */}
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-muted-foreground/20 hover:bg-primary/10 hover:border-primary/30"
                        onClick={onEdit}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit PR</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-destructive/30 bg-destructive/5 hover:bg-destructive/15 hover:border-destructive/50 text-destructive"
                        onClick={onDelete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete PR</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Achieved {formatDate(pr.achievedAt)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple exercise type for PR dialog
type SimpleExercise = {
  id: string;
  name: string;
  category: string;
};

// Add/Edit PR Dialog
function PRDialog({
  onOpenChange,
  editPR,
}: {
  onOpenChange: (open: boolean) => void;
  editPR?: PersonalRecordResponse;
}) {
  const unit = useUnitPreference();
  const [step, setStep] = useState<'exercise' | 'details'>(
    editPR ? 'details' : 'exercise',
  );
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] =
    useState<SimpleExercise | null>(editPR?.exercise ?? null);
  const [prType, setPrType] = useState<PRType | ''>(editPR?.type ?? '');
  // Convert from storage when editing - for weight/volume types and distance
  const getInitialValue = () => {
    if (!editPR) return '';
    const prValue = editPR.value;
    if (editPR.type === 'MAX_WEIGHT' || editPR.type === 'MAX_VOLUME') {
      return convertWeightFromStorage(prValue, unit)?.toString() ?? '';
    }
    if (editPR.type === 'LONGEST_DIST') {
      return convertDistanceFromStorage(prValue, unit)?.toString() ?? '';
    }
    return prValue?.toString() ?? '';
  };
  const [value, setValue] = useState(getInitialValue);

  const { data: exercisesData, isLoading: isLoadingExercises } = useExercises({
    search: search || undefined,
    limit: 50,
  });

  const createMutation = useCreatePersonalRecord({
    onSuccess: () => {
      toast.success(editPR ? 'PR updated!' : 'PR created!');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save PR');
    },
  });

  const updateMutation = useUpdatePersonalRecord({
    onSuccess: () => {
      toast.success('PR updated!');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update PR');
    },
  });

  const exercises = exercisesData?.data?.items || [];
  const availablePRTypes = selectedExercise
    ? getPRTypesForCategory(selectedExercise.category)
    : [];

  const resetForm = () => {
    setStep('exercise');
    setSearch('');
    setSelectedExercise(null);
    setPrType('');
    setValue('');
  };

  const handleSubmit = () => {
    if (!selectedExercise || !prType || !value) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Please enter a valid value');
      return;
    }

    // Convert to storage format based on PR type
    let storageValue = numValue;
    if (prType === 'MAX_WEIGHT' || prType === 'MAX_VOLUME') {
      storageValue = convertWeightToStorage(numValue, unit) ?? numValue;
    } else if (prType === 'LONGEST_DIST') {
      storageValue = convertDistanceToStorage(numValue, unit, true) ?? numValue;
    }

    if (editPR) {
      updateMutation.mutate({
        prId: editPR.id,
        data: { value: storageValue },
      });
    } else {
      createMutation.mutate({
        exerciseId: selectedExercise.id,
        type: prType,
        value: storageValue,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Exercise selection step
  if (step === 'exercise' && !editPR) {
    return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Personal Record</DialogTitle>
          <DialogDescription>
            Select an exercise to record a PR for
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-75">
            {isLoadingExercises ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : exercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No exercises found
              </div>
            ) : (
              <div className="space-y-1 pr-4">
                {exercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                      selectedExercise?.id === exercise.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted',
                    )}
                    onClick={() => setSelectedExercise(exercise)}
                  >
                    <Dumbbell className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {exercise.name}
                      </p>
                      <p
                        className={cn(
                          'text-xs capitalize',
                          selectedExercise?.id === exercise.id
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground',
                        )}
                      >
                        {exercise.category.toLowerCase()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => setStep('details')}
            disabled={!selectedExercise}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  // PR details step
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editPR ? 'Edit' : 'Add'} Personal Record</DialogTitle>
        <DialogDescription>
          {editPR
            ? `Update your ${PR_TYPE_LABELS[editPR.type]} for ${editPR.exercise.name}`
            : `Set a PR for ${selectedExercise?.name}`}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {selectedExercise && (
          <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">{selectedExercise.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {selectedExercise.category.toLowerCase()}
              </p>
            </div>
          </div>
        )}

        {!editPR && (
          <div className="space-y-2">
            <Label>PR Type</Label>
            <Select
              value={prType}
              onValueChange={(v) => setPrType(v as PRType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select PR type" />
              </SelectTrigger>
              <SelectContent>
                {availablePRTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {PR_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Value</Label>
          <Input
            type="number"
            step="any"
            placeholder={getValuePlaceholder(prType as PRType)}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {getValueHint(prType as PRType, unit)}
          </p>
        </div>
      </div>

      <DialogFooter>
        {!editPR && (
          <Button variant="outline" onClick={() => setStep('exercise')}>
            Back
          </Button>
        )}
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!prType || !value || isPending}
        >
          {isPending ? 'Saving...' : 'Save PR'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Helper for value placeholder
function getValuePlaceholder(type: PRType): string {
  switch (type) {
    case 'MAX_WEIGHT':
      return 'e.g., 225';
    case 'MAX_REPS':
      return 'e.g., 15';
    case 'MAX_VOLUME':
      return 'e.g., 3375';
    case 'BEST_PACE':
      return 'e.g., 3.5';
    case 'LONGEST_DIST':
      return 'e.g., 5000';
    case 'LONGEST_TIME':
      return 'e.g., 1800';
    default:
      return 'Enter value';
  }
}

// Helper for value hint
function getValueHint(type: PRType, unit: 'imperial' | 'metric'): string {
  switch (type) {
    case 'MAX_WEIGHT':
      return `Weight in ${unit === 'imperial' ? 'pounds (lb)' : 'kilograms (kg)'}`;
    case 'MAX_REPS':
      return 'Number of repetitions';
    case 'MAX_VOLUME':
      return `Total volume (weight × reps) in ${unit === 'imperial' ? 'lb' : 'kg'}`;
    case 'BEST_PACE':
      return 'Speed in meters per second (m/s)';
    case 'LONGEST_DIST':
      return `Distance in ${unit === 'imperial' ? 'miles' : 'meters'}`;
    case 'LONGEST_TIME':
      return 'Time in seconds (s)';
    default:
      return '';
  }
}

// Main Page Component
export default function PersonalRecordsPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const unit = useUnitPreference();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editPR, setEditPR] = useState<PersonalRecordResponse | null>(null);
  const [deletePrId, setDeletePrId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<PRType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const { data: prsData, isLoading } = usePersonalRecords(
    filterType !== 'all' ? { type: filterType } : undefined,
  );

  const deleteMutation = useDeletePersonalRecord({
    onSuccess: () => {
      toast.success('Personal record deleted');
      setDeletePrId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete PR');
    },
  });

  const rawPrs = prsData?.data?.items;
  const allPrs = useMemo(() => rawPrs || [], [rawPrs]);

  // Filter PRs by search query
  const prs = useMemo(() => {
    if (!searchQuery.trim()) return allPrs;
    const query = searchQuery.toLowerCase();
    return allPrs.filter(
      (pr) =>
        pr.exercise.name.toLowerCase().includes(query) ||
        pr.exercise.category.toLowerCase().includes(query) ||
        PR_TYPE_LABELS[pr.type].toLowerCase().includes(query),
    );
  }, [allPrs, searchQuery]);

  // Group PRs by exercise for count
  const exerciseCount = useMemo(() => {
    const exerciseIds = new Set(allPrs.map((pr) => pr.exerciseId));
    return exerciseIds.size;
  }, [allPrs]);

  // Calculate stats
  const strengthPRs = useMemo(
    () => allPrs.filter((pr) => pr.exercise.category === 'STRENGTH').length,
    [allPrs],
  );
  const cardioPRs = useMemo(
    () => allPrs.filter((pr) => pr.exercise.category === 'CARDIO').length,
    [allPrs],
  );

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-yellow-500/10 via-transparent to-amber-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-yellow-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-amber-500/15 blur-3xl" />

        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Records Dashboard
                </p>
                <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/20">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  Personal Records
                </h1>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  Track milestones and keep your best performances front and
                  center.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={allPrs.length === 0}
                onClick={() => {
                  const prPayload = buildElevatePrPayloadFromRecords(
                    allPrs,
                    unit,
                  );
                  navigate(`/elevate?compose=1&pr=${prPayload}`);
                }}
                aria-label="Share PRs to Elevate"
                title="Share PRs to Elevate"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    className="bg-linear-to-r from-yellow-500 to-amber-500 text-white shadow-lg shadow-yellow-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-yellow-600 hover:to-amber-600 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    aria-label="Add personal record"
                    title="Add personal record"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                {showAddDialog && <PRDialog onOpenChange={setShowAddDialog} />}
              </Dialog>
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Add PRs manually or let workouts update records automatically,
                then share top milestones to Elevate in one tap.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="h-8 rounded-full px-3 text-xs"
            >
              <Trophy className="mr-1 h-3.5 w-3.5" />
              {allPrs.length} total PRs
            </Badge>
            <Badge
              variant="secondary"
              className="h-8 rounded-full px-3 text-xs"
            >
              <Dumbbell className="mr-1 h-3.5 w-3.5" />
              {exerciseCount} exercises
            </Badge>
            <Badge
              variant="secondary"
              className="h-8 rounded-full px-3 text-xs"
            >
              <Flame className="mr-1 h-3.5 w-3.5" />
              {strengthPRs} strength
            </Badge>
            <Badge
              variant="secondary"
              className="h-8 rounded-full px-3 text-xs"
            >
              <Timer className="mr-1 h-3.5 w-3.5" />
              {cardioPRs} cardio
            </Badge>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <div
        className={cn(
          'grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-400 motion-reduce:animate-none',
          isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4',
        )}
      >
        <Card className="border-yellow-500/20 bg-linear-to-br from-yellow-500/10 to-amber-500/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Total PRs
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {allPrs.length}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Exercises
                </p>
                <p className="text-2xl font-bold">{exerciseCount}</p>
              </div>
              <Dumbbell className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Strength
                </p>
                <p className="text-2xl font-bold">{strengthPRs}</p>
              </div>
              <Flame className="h-8 w-8 text-orange-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Cardio
                </p>
                <p className="text-2xl font-bold">{cardioPRs}</p>
              </div>
              <Timer className="h-8 w-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search, Filter & View Controls */}
      <Card className="overflow-hidden border-muted/70">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search PRs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'MAX_WEIGHT', label: 'Weight' },
                  { value: 'MAX_REPS', label: 'Reps' },
                  { value: 'LONGEST_TIME', label: 'Time' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={
                      filterType === option.value ? 'secondary' : 'ghost'
                    }
                    size="sm"
                    className="h-8 px-3 transition-all duration-200"
                    onClick={() =>
                      setFilterType(option.value as PRType | 'all')
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-8 w-8 transition-all duration-200"
                      onClick={() => setViewMode('grid')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grid view</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-8 w-8 transition-all duration-200"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>List view</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PRs Display */}
      {isLoading ? (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
              : 'space-y-3',
          )}
        >
          {[...Array(6)].map((_, i) => (
            <Skeleton
              key={i}
              className={viewMode === 'grid' ? 'h-44' : 'h-20'}
            />
          ))}
        </div>
      ) : prs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-linear-to-br from-yellow-500/20 to-amber-500/10 flex items-center justify-center mx-auto">
                <Trophy className="h-10 w-10 text-yellow-500/50" />
              </div>
              <h3 className="mt-6 text-lg font-semibold">
                {searchQuery ? 'No PRs Found' : 'No Personal Records Yet'}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? `No PRs match "${searchQuery}". Try a different search term.`
                  : filterType !== 'all'
                    ? `No ${PR_TYPE_LABELS[filterType]} records found. Try a different filter.`
                    : 'Start logging workouts to automatically track your PRs, or add them manually.'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowAddDialog(true)}
                  size="icon"
                  className="mt-6 bg-linear-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
                  aria-label="Add your first PR"
                  title="Add your first PR"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
              : 'space-y-3',
          )}
        >
          {prs.map((pr) => (
            <PRCard
              key={pr.id}
              pr={pr}
              viewMode={viewMode}
              unit={unit}
              onEdit={() => setEditPR(pr)}
              onDelete={() => setDeletePrId(pr.id)}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {prs.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {prs.length} of {allPrs.length} personal record
          {allPrs.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      )}
      {editPR && (
        <Dialog open={!!editPR} onOpenChange={() => setEditPR(null)}>
          <PRDialog onOpenChange={() => setEditPR(null)} editPR={editPR} />
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePrId} onOpenChange={() => setDeletePrId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Personal Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this PR. You can re-achieve it by
              logging a new workout that beats your previous record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePrId && deleteMutation.mutate(deletePrId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
