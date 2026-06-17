import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { ScrollIndicator } from '@/components/ui/scroll-indicator';
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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Users,
  Copy,
  Dumbbell,
  ChevronRight,
  Moon,
  EyeOff,
  Globe,
  CheckCircle2,
  Search,
  Heart,
  Pencil,
  Play,
  Share2,
  MapPin,
  UserMinus,
  MoreVertical,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useMyWorkoutPlans,
  useWorkoutPlans,
  useWorkoutPlan,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
  useAddDay,
  useDeleteDay,
  useAddExercise,
  useUpdateExercise,
  useDeleteExercise,
  useAddPlanSet as useAddSet,
  useUpdatePlanSet as useUpdateSet,
  useDeletePlanSet as useDeleteSet,
  useCopyPlan,
  useMyAssignments,
  useStartPlanWorkout,
  useFollowPlan,
  useUnfollowPlan,
  DAY_LABELS,
  DAYS_ORDERED,
  DIFFICULTY_LABELS,
  type WorkoutPlanListItem,
  type DayOfWeek,
  type CreateWorkoutPlan,
} from '@/features/health';
import { useExercises } from '@/features/health';
import { useProfileGyms, useUnitPreference } from '@/features/profile';
import {
  getWeightUnit,
  formatWeight,
  formatDistance,
} from '@varaperformance/core';

// ============================================
// Plan Card Component
// ============================================

function PlanCard({
  plan,
  onSelect,
  onCopy,
  isOwner,
  onDelete,
  onFollow,
  isFollowing,
  onShareToElevate,
}: {
  plan: WorkoutPlanListItem;
  onSelect: () => void;
  onCopy?: () => void;
  isOwner?: boolean;
  onDelete?: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
  onShareToElevate?: () => void;
}) {
  // Get difficulty color
  const difficultyColor =
    {
      BEGINNER:
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      INTERMEDIATE:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      ADVANCED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }[plan.difficulty || ''] || '';

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      onClick={onSelect}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/60 via-emerald-500/60 to-primary/60 opacity-0 transition-opacity group-hover:opacity-100" />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{plan.name}</CardTitle>
            {plan.description && (
              <CardDescription className="line-clamp-2 mt-1">
                {plan.description}
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {isFollowing && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Following
              </Badge>
            )}
            {plan.difficulty && (
              <Badge variant="outline" className={`text-xs ${difficultyColor}`}>
                {DIFFICULTY_LABELS[plan.difficulty]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <span>{plan.dayCount} days</span>
          </div>
          {plan.creator && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-3.5 w-3.5" />
              </div>
              <span className="truncate">
                {plan.creator.displayName || 'Coach'}
              </span>
            </div>
          )}
        </div>
        <div
          className="flex flex-wrap gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {isOwner ? (
            <>
              {onFollow && !isFollowing && (
                <Button
                  size="icon"
                  className="gap-1.5 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  onClick={onFollow}
                  aria-label="Start following plan"
                  title="Start following plan"
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}
              {isFollowing && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="gap-1.5 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  onClick={onSelect}
                  aria-label="View plan"
                  title="View plan"
                >
                  <Dumbbell className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="gap-1.5 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                onClick={onSelect}
                aria-label="Edit plan"
                title="Edit plan"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {plan.visibility === 'PUBLIC' && onShareToElevate && (
                <Button
                  variant="outline"
                  size="icon"
                  className="gap-1.5 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  onClick={onShareToElevate}
                  aria-label="Share plan to Elevate"
                  title="Share plan to Elevate"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Plan
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          ) : (
            onCopy && (
              <Button
                variant="outline"
                size="icon"
                className="gap-1.5 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                onClick={onCopy}
                aria-label="Copy to my plans"
                title="Copy to my plans"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Create Plan Dialog
// ============================================

function CreatePlanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [difficulty, setDifficulty] = useState<
    'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | ''
  >('');
  const [durationWeeks, setDurationWeeks] = useState('');

  const createPlan = useCreatePlan();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Plan name is required');
      return;
    }

    const data: CreateWorkoutPlan = {
      name: name.trim(),
      description: description.trim() || undefined,
      visibility,
      difficulty: difficulty || undefined,
      durationWeeks: durationWeeks ? parseInt(durationWeeks) : undefined,
      days: [],
    };

    try {
      await createPlan.mutateAsync(data);
      toast.success('Workout plan created');
      onOpenChange(false);
      setName('');
      setDescription('');
      setVisibility('PRIVATE');
      setDifficulty('');
      setDurationWeeks('');
    } catch {
      toast.error('Failed to create plan');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Workout Plan</DialogTitle>
          <DialogDescription>
            Create a personal workout plan to track your weekly routine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              placeholder="e.g., My Push Pull Legs"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of your workout plan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as 'PRIVATE' | 'PUBLIC')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      Private
                    </div>
                  </SelectItem>
                  <SelectItem value="PUBLIC">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Public
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(v) =>
                  setDifficulty(
                    v as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | '',
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEGINNER">Beginner</SelectItem>
                  <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                  <SelectItem value="ADVANCED">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (weeks)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              placeholder="Optional"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createPlan.isPending}>
            {createPlan.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Create Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Edit Exercise Dialog
// ============================================

interface ExerciseSet {
  id: string;
  setNumber: number;
  targetReps?: number | null;
  targetWeight?: number | null;
  targetRpe?: number | null;
  targetDuration?: number | null;
  restAfter?: number | null;
  setType?: string | null;
  notes?: string | null;
}

interface ExerciseToEdit {
  id: string;
  dayId: string;
  name: string;
  category: string;
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetWeight: number | null;
  targetRpe: number | null;
  targetDuration: number | null;
  targetDistance: number | null;
  notes: string | null;
  sets: ExerciseSet[];
}

function EditExerciseDialog({
  exercise,
  planId,
  open,
  onOpenChange,
}: {
  exercise: ExerciseToEdit | null;
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const unit = useUnitPreference();
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [lastSyncedExerciseId, setLastSyncedExerciseId] = useState<
    string | null
  >(null);

  const updateExercise = useUpdateExercise();
  const addSet = useAddSet();
  const updateSet = useUpdateSet();
  const deleteSet = useDeleteSet();

  // Sync form when dialog opens with a new exercise
  if (open && exercise && lastSyncedExerciseId !== exercise.id) {
    setExerciseSets(exercise.sets || []);
    setNotes(exercise.notes || '');
    setDuration(exercise.targetDuration?.toString() || '');
    setDistance(exercise.targetDistance?.toString() || '');
    setLastSyncedExerciseId(exercise.id);
  }

  // Reset sync tracker when dialog closes
  if (!open && lastSyncedExerciseId !== null) {
    setLastSyncedExerciseId(null);
  }

  const handleAddSet = async () => {
    if (!exercise) return;
    // Calculate next set number from current sets (handles case where sets were deleted)
    const maxSetNumber = exerciseSets.reduce(
      (max, s) => Math.max(max, s.setNumber),
      0,
    );
    const nextSetNumber = maxSetNumber + 1;

    try {
      const result = await addSet.mutateAsync({
        planId,
        dayId: exercise.dayId,
        exerciseId: exercise.id,
        data: {
          setNumber: nextSetNumber,
          targetReps: exercise.category === 'CARDIO' ? undefined : 10,
          targetDuration: exercise.category === 'CARDIO' ? 60 : undefined,
        },
      });
      // Update local state with the new set from the response
      if (result.success && result.data) {
        const updatedExercise = result.data.days
          .flatMap((d) => d.exercises)
          .find((ex) => ex.id === exercise.id);
        if (updatedExercise?.sets) {
          setExerciseSets(updatedExercise.sets);
        }
      }
      toast.success('Set added');
    } catch {
      toast.error('Failed to add set');
    }
  };

  const handleUpdateSet = async (setId: string, data: Partial<ExerciseSet>) => {
    if (!exercise) return;

    try {
      await updateSet.mutateAsync({
        planId,
        dayId: exercise.dayId,
        exerciseId: exercise.id,
        setId,
        data: {
          targetReps: data.targetReps ?? undefined,
          targetWeight: data.targetWeight ?? undefined,
          targetRpe: data.targetRpe ?? undefined,
          targetDuration: data.targetDuration ?? undefined,
          restAfter: data.restAfter ?? undefined,
        },
      });
    } catch {
      toast.error('Failed to update set');
    }
  };

  const handleDeleteSet = async (setId: string) => {
    if (!exercise) return;

    try {
      const result = await deleteSet.mutateAsync({
        planId,
        dayId: exercise.dayId,
        exerciseId: exercise.id,
        setId,
      });
      // Update local state after deletion
      if (result.success && result.data) {
        const updatedExercise = result.data.days
          .flatMap((d) => d.exercises)
          .find((ex) => ex.id === exercise.id);
        if (updatedExercise?.sets) {
          setExerciseSets(updatedExercise.sets);
        } else {
          setExerciseSets([]);
        }
      }
      toast.success('Set removed');
    } catch {
      toast.error('Failed to remove set');
    }
  };

  const handleSaveNotes = async () => {
    if (!exercise) return;

    try {
      await updateExercise.mutateAsync({
        planId,
        dayId: exercise.dayId,
        exerciseId: exercise.id,
        data: {
          notes: notes || undefined,
          targetDuration:
            exercise.category === 'CARDIO' && duration
              ? parseInt(duration)
              : undefined,
          targetDistance:
            exercise.category === 'CARDIO' && distance
              ? parseFloat(distance)
              : undefined,
        },
      });
      toast.success('Exercise updated');
    } catch {
      toast.error('Failed to update exercise');
    }
  };

  const isCardio = exercise?.category === 'CARDIO';
  const isStrength = exercise?.category === 'STRENGTH';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
          <DialogDescription>
            {exercise?.name}
            <Badge variant="outline" className="ml-2">
              {exercise?.category}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cardio specific: Duration/Distance only */}
          {isCardio && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  placeholder="30"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  onBlur={handleSaveNotes}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="distance">Distance (meters)</Label>
                <Input
                  id="distance"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="5000"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  onBlur={handleSaveNotes}
                />
              </div>
            </div>
          )}

          {/* Individual sets for non-cardio exercises */}
          {!isCardio && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Sets</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddSet}
                  disabled={addSet.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Set
                </Button>
              </div>

              {exerciseSets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sets defined. Add sets to specify targets.
                </p>
              ) : (
                <div className="space-y-2">
                  {exerciseSets.map((set) => (
                    <div
                      key={set.id}
                      className="flex items-center gap-2 p-2 border rounded-md"
                    >
                      <span className="text-sm font-medium w-12">
                        Set {set.setNumber}
                      </span>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Reps"
                        className="w-20"
                        value={set.targetReps || ''}
                        onChange={(e) => {
                          const newSets = exerciseSets.map((s) =>
                            s.id === set.id
                              ? {
                                  ...s,
                                  targetReps: e.target.value
                                    ? parseInt(e.target.value)
                                    : null,
                                }
                              : s,
                          );
                          setExerciseSets(newSets);
                        }}
                        onBlur={() =>
                          handleUpdateSet(set.id, {
                            targetReps: set.targetReps,
                          })
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        reps
                      </span>
                      {isStrength && (
                        <>
                          <span className="text-muted-foreground">@</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="Weight"
                            className="w-24"
                            value={set.targetWeight || ''}
                            onChange={(e) => {
                              const newSets = exerciseSets.map((s) =>
                                s.id === set.id
                                  ? {
                                      ...s,
                                      targetWeight: e.target.value
                                        ? parseFloat(e.target.value)
                                        : null,
                                    }
                                  : s,
                              );
                              setExerciseSets(newSets);
                            }}
                            onBlur={() =>
                              handleUpdateSet(set.id, {
                                targetWeight: set.targetWeight,
                              })
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            {getWeightUnit(unit)}
                          </span>
                        </>
                      )}
                      {!isStrength && (
                        <>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Hold (sec)"
                            className="w-24"
                            value={set.targetDuration || ''}
                            onChange={(e) => {
                              const newSets = exerciseSets.map((s) =>
                                s.id === set.id
                                  ? {
                                      ...s,
                                      targetDuration: e.target.value
                                        ? parseInt(e.target.value)
                                        : null,
                                    }
                                  : s,
                              );
                              setExerciseSets(newSets);
                            }}
                            onBlur={() =>
                              handleUpdateSet(set.id, {
                                targetDuration: set.targetDuration,
                              })
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            sec
                          </span>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                        onClick={() => handleDeleteSet(set.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any specific instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Edit Plan Dialog (Title & Description)
// ============================================

function EditPlanDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: {
    id: string;
    name: string;
    description: string | null;
    difficulty: string | null;
    visibility: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<
    'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | ''
  >('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [lastSyncedPlanId, setLastSyncedPlanId] = useState<string | null>(null);

  const updatePlan = useUpdatePlan();

  // Sync form when dialog opens with a new plan
  if (open && plan && lastSyncedPlanId !== plan.id) {
    setName(plan.name);
    setDescription(plan.description || '');
    setDifficulty(
      (plan.difficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') || '',
    );
    setVisibility((plan.visibility as 'PRIVATE' | 'PUBLIC') || 'PRIVATE');
    setLastSyncedPlanId(plan.id);
  }

  // Reset sync tracker when dialog closes
  if (!open && lastSyncedPlanId !== null) {
    setLastSyncedPlanId(null);
  }

  const handleSave = async () => {
    if (!plan || !name.trim()) {
      toast.error('Plan name is required');
      return;
    }

    try {
      await updatePlan.mutateAsync({
        planId: plan.id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          difficulty: difficulty || undefined,
          visibility,
        },
      });
      toast.success('Plan updated');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update plan');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Workout Plan</DialogTitle>
          <DialogDescription>
            Update your workout plan details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Plan Name *</Label>
            <Input
              id="edit-name"
              placeholder="e.g., My Push Pull Legs"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Brief description of your workout plan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as 'PRIVATE' | 'PUBLIC')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      Private
                    </div>
                  </SelectItem>
                  <SelectItem value="PUBLIC">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Public
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(v) =>
                  setDifficulty(
                    v as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | '',
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEGINNER">Beginner</SelectItem>
                  <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                  <SelectItem value="ADVANCED">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updatePlan.isPending}>
            {updatePlan.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Plan Viewer/Editor Component
// ============================================

function PlanViewer({
  planId,
  onBack,
  isOwner,
}: {
  planId: string;
  onBack: () => void;
  isOwner: boolean;
}) {
  const unit = useUnitPreference();
  const { data, isLoading, error } = useWorkoutPlan(planId);
  const [addDayOpen, setAddDayOpen] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseToEdit | null>(
    null,
  );
  const [addExerciseDayId, setAddExerciseDayId] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');

  const addDay = useAddDay();
  const deleteDay = useDeleteDay();
  const addExercise = useAddExercise();
  const deleteExercise = useDeleteExercise();
  const copyPlan = useCopyPlan();

  const plan = data?.success ? data.data : null;

  // Get exercises for the exercise picker with search
  const { data: exercisesData, isLoading: exercisesLoading } = useExercises({
    search: exerciseSearch || undefined,
    limit: 50,
  });
  const exercises = exercisesData?.success ? exercisesData.data.items : [];

  // Find days that are not yet in the plan
  const usedDays = plan?.days.map((d) => d.dayOfWeek) || [];
  const availableDays = DAYS_ORDERED.filter((d) => !usedDays.includes(d));

  const handleAddDay = async (dayOfWeek: DayOfWeek, isRestDay: boolean) => {
    if (!plan) return;

    try {
      await addDay.mutateAsync({
        planId: plan.id,
        data: {
          dayOfWeek,
          name: isRestDay ? 'Rest Day' : `${DAY_LABELS[dayOfWeek]} Workout`,
          isRestDay,
          exercises: [],
        },
      });
      setAddDayOpen(false);
      toast.success('Day added');
    } catch {
      toast.error('Failed to add day');
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!plan) return;

    try {
      await deleteDay.mutateAsync({ planId: plan.id, dayId });
      toast.success('Day removed');
    } catch {
      toast.error('Failed to remove day');
    }
  };

  const handleAddExercise = async (dayId: string, exerciseId: string) => {
    if (!plan) return;

    try {
      await addExercise.mutateAsync({
        planId: plan.id,
        dayId,
        data: {
          exerciseId,
          sortOrder:
            plan.days.find((d) => d.id === dayId)?.exercises.length ?? 0,
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 12,
        },
      });
      toast.success('Exercise added');
      setAddExerciseDayId(null);
      setExerciseSearch('');
    } catch {
      toast.error('Failed to add exercise');
    }
  };

  const handleDeleteExercise = async (dayId: string, exerciseId: string) => {
    if (!plan) return;

    try {
      await deleteExercise.mutateAsync({
        planId: plan.id,
        dayId,
        exerciseId,
      });
      toast.success('Exercise removed');
    } catch {
      toast.error('Failed to remove exercise');
    }
  };

  const handleCopyPlan = async () => {
    if (!plan) return;

    try {
      await copyPlan.mutateAsync(plan.id);
      toast.success('Plan copied to your collection');
    } catch {
      toast.error('Failed to copy plan');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load workout plan</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  // Sort days by day of week order
  const sortedDays = [...plan.days].sort(
    (a, b) =>
      DAYS_ORDERED.indexOf(a.dayOfWeek) - DAYS_ORDERED.indexOf(b.dayOfWeek),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-card px-5 py-5 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1">
            <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
              <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
              Back
            </Button>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                {plan.description && (
                  <p className="text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                )}
                {plan.creator && !isOwner && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Created by {plan.creator.displayName || 'a coach'}
                  </p>
                )}
              </div>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditPlanOpen(true)}
                  className="shrink-0 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit Details
                </Button>
              )}
            </div>
          </div>
          {!isOwner && (
            <Button
              variant="outline"
              onClick={handleCopyPlan}
              className="shrink-0 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy to My Plans
            </Button>
          )}
        </div>
      </div>

      {/* Edit Plan Dialog */}
      {isOwner && (
        <EditPlanDialog
          plan={plan}
          open={editPlanOpen}
          onOpenChange={setEditPlanOpen}
        />
      )}

      {/* Days */}
      <div className="space-y-4">
        {sortedDays.map((day) => (
          <Card
            key={day.id}
            className="border-muted/70 transition-all duration-200 hover:shadow-md"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    {DAY_LABELS[day.dayOfWeek]}
                  </CardTitle>
                  {day.isRestDay ? (
                    <Badge variant="secondary">
                      <Moon className="h-3 w-3 mr-1" />
                      Rest Day
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      {day.name}
                    </span>
                  )}
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteDay(day.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {day.isRestDay ? (
                <p className="text-sm text-muted-foreground">
                  {day.notes || 'Rest and recover.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {day.exercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No exercises added yet.
                    </p>
                  ) : (
                    day.exercises.map((ex, index) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between rounded-lg border border-transparent py-2 transition-colors hover:border-border/70 hover:bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <div>
                            <p className="font-medium">{ex.exercise.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {/* Show individual sets if they exist */}
                              {ex.sets && ex.sets.length > 0 ? (
                                ex.sets.map((set, i) => (
                                  <span key={set.id}>
                                    {i > 0 && ' • '}
                                    Set {set.setNumber}:
                                    {set.targetReps &&
                                      ` ${set.targetReps} reps`}
                                    {set.targetWeight &&
                                      ` @ ${formatWeight(set.targetWeight, unit)}`}
                                    {set.targetDuration &&
                                      ` ${Math.floor(set.targetDuration / 60)}:${String(set.targetDuration % 60).padStart(2, '0')}`}
                                  </span>
                                ))
                              ) : (
                                <>
                                  {/* Strength: sets × reps @ weight */}
                                  {ex.exercise.category === 'STRENGTH' && (
                                    <>
                                      {ex.targetSets && `${ex.targetSets} sets`}
                                      {ex.targetRepsMin &&
                                        ` × ${ex.targetRepsMin}${ex.targetRepsMax ? `-${ex.targetRepsMax}` : ''} reps`}
                                      {ex.targetWeight &&
                                        ` @ ${formatWeight(ex.targetWeight, unit)}`}
                                      {ex.targetRpe && ` RPE ${ex.targetRpe}`}
                                    </>
                                  )}
                                  {/* Cardio: duration, distance */}
                                  {ex.exercise.category === 'CARDIO' && (
                                    <>
                                      {ex.targetDuration &&
                                        `${ex.targetDuration} min`}
                                      {ex.targetDistance &&
                                        ` • ${formatDistance(ex.targetDistance, unit)}`}
                                    </>
                                  )}
                                  {/* Bodyweight/Plyometrics/Flexibility: sets × reps, hold time */}
                                  {(ex.exercise.category === 'BODYWEIGHT' ||
                                    ex.exercise.category === 'PLYOMETRICS' ||
                                    ex.exercise.category === 'FLEXIBILITY') && (
                                    <>
                                      {ex.targetSets && `${ex.targetSets} sets`}
                                      {ex.targetRepsMin &&
                                        ` × ${ex.targetRepsMin}${ex.targetRepsMax ? `-${ex.targetRepsMax}` : ''} reps`}
                                      {ex.targetDuration &&
                                        ` • ${ex.targetDuration}s hold`}
                                      {ex.targetRpe && ` RPE ${ex.targetRpe}`}
                                    </>
                                  )}
                                </>
                              )}
                              {ex.notes && ` • ${ex.notes}`}
                            </p>
                          </div>
                        </div>
                        {isOwner && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setEditingExercise({
                                  id: ex.id,
                                  dayId: day.id,
                                  name: ex.exercise.name,
                                  category: ex.exercise.category,
                                  targetSets: ex.targetSets,
                                  targetRepsMin: ex.targetRepsMin,
                                  targetRepsMax: ex.targetRepsMax,
                                  targetWeight: ex.targetWeight,
                                  targetRpe: ex.targetRpe,
                                  targetDuration: ex.targetDuration,
                                  targetDistance: ex.targetDistance,
                                  notes: ex.notes,
                                  sets: ex.sets || [],
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteExercise(day.id, ex.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* Add exercise button (owner only) */}
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 border-dashed transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      onClick={() => {
                        setAddExerciseDayId(day.id);
                        setExerciseSearch('');
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add exercise
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Add Day Button (owner only) */}
        {isOwner && availableDays.length > 0 && (
          <Dialog open={addDayOpen} onOpenChange={setAddDayOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-dashed transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Day
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Day to Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {availableDays.map((day) => (
                  <div
                    key={day}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span>{DAY_LABELS[day]}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddDay(day, true)}
                      >
                        <Moon className="h-4 w-4 mr-1" />
                        Rest
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAddDay(day, false)}
                      >
                        <Dumbbell className="h-4 w-4 mr-1" />
                        Workout
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Exercise Dialog */}
        <Dialog
          open={!!addExerciseDayId}
          onOpenChange={(open) => {
            if (!open) {
              setAddExerciseDayId(null);
              setExerciseSearch('');
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Exercise</DialogTitle>
              <DialogDescription>
                Search and select an exercise to add to this day
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exercises..."
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <ScrollArea className="h-64">
                {exercisesLoading ? (
                  <div className="space-y-2 p-1">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : exercises.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {exerciseSearch
                      ? 'No exercises found'
                      : 'Start typing to search'}
                  </div>
                ) : (
                  <div className="space-y-1 p-1">
                    {exercises.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        onClick={() =>
                          addExerciseDayId &&
                          handleAddExercise(addExerciseDayId, ex.id)
                        }
                      >
                        <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {ex.name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {ex.category.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddExerciseDayId(null)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Exercise Dialog */}
        <EditExerciseDialog
          planId={plan.id}
          exercise={editingExercise}
          open={!!editingExercise}
          onOpenChange={(open) => !open && setEditingExercise(null)}
        />
      </div>
    </div>
  );
}

// ============================================
// Assignment Card with Start Workout
// ============================================

function AssignmentCard({
  assignment,
  onUnfollow,
  showUnfollow = false,
}: {
  assignment: {
    id: string;
    planId: string;
    plan: {
      id: string;
      name: string;
      description: string | null;
      durationWeeks: number | null;
    };
    status: string;
    coachNotes: string | null;
    completedDaysCount: number;
    currentWeek: number;
    assignedBy: { id: string; displayName: string | null } | null;
  };
  onUnfollow?: () => void;
  showUnfollow?: boolean;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [selectedGymId, setSelectedGymId] = useState<string | undefined>(
    undefined,
  );

  const { data: planData, isLoading: loadingPlan } = useWorkoutPlan(
    expanded ? assignment.planId : undefined,
  );
  const { data: gymsData } = useProfileGyms();
  const gyms = gymsData?.data || [];
  const startWorkout = useStartPlanWorkout();

  const plan = planData?.success ? planData.data : null;
  const sortedDays = plan?.days
    ? [...plan.days].sort(
        (a, b) =>
          DAYS_ORDERED.indexOf(a.dayOfWeek) - DAYS_ORDERED.indexOf(b.dayOfWeek),
      )
    : [];

  // Get current day of week
  const today = new Date();
  const dayNames: DayOfWeek[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
  const todayDayOfWeek = dayNames[today.getDay()];

  const openStartDialog = (dayOfWeek: DayOfWeek) => {
    setSelectedDay(dayOfWeek);
    setSelectedGymId(undefined);
    setStartDialogOpen(true);
  };

  const handleStartWorkout = async () => {
    if (!selectedDay) return;
    try {
      const result = await startWorkout.mutateAsync({
        assignmentId: assignment.id,
        dayOfWeek: selectedDay,
        gymId: selectedGymId,
      });
      if (result.success) {
        toast.success('Workout started! Redirecting...');
        setStartDialogOpen(false);
        navigate('/workouts');
      } else {
        toast.error('Failed to start workout');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start workout';
      toast.error(message);
    }
  };

  return (
    <Card className="overflow-hidden border-muted/70 transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div
            className="flex-1 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <CardTitle className="flex items-center gap-2">
              {assignment.plan.name}
              <ChevronRight
                className={`h-5 w-5 text-muted-foreground transition-transform ${
                  expanded ? 'rotate-90' : ''
                }`}
              />
            </CardTitle>
            {assignment.plan.description && (
              <CardDescription className="mt-1 line-clamp-1">
                {assignment.plan.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Week {assignment.currentWeek}
              {assignment.plan.durationWeeks &&
                ` of ${assignment.plan.durationWeeks}`}
            </Badge>
            {showUnfollow && onUnfollow && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={onUnfollow}
                    className="text-destructive focus:text-destructive"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Unfollow Plan
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {assignment.plan.durationWeeks && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>
                {Math.min(
                  100,
                  Math.round(
                    (assignment.currentWeek / assignment.plan.durationWeeks) *
                      100,
                  ),
                )}
                %
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{
                  width: `${Math.min(100, (assignment.currentWeek / assignment.plan.durationWeeks) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {assignment.coachNotes && (
          <div className="bg-muted/50 border-l-2 border-primary p-3 rounded-r-md mb-4">
            <p className="text-sm font-medium mb-0.5 flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-primary" />
              Coach Notes
            </p>
            <p className="text-sm text-muted-foreground">
              {assignment.coachNotes}
            </p>
          </div>
        )}

        {expanded && (
          <div className="mt-4 space-y-2">
            {loadingPlan ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : sortedDays.length > 0 ? (
              sortedDays.map((day) => (
                <div
                  key={day.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    day.dayOfWeek === todayDayOfWeek
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        day.isRestDay
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {day.isRestDay ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Dumbbell className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {DAY_LABELS[day.dayOfWeek]}
                        {day.dayOfWeek === todayDayOfWeek && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Today
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {day.isRestDay
                          ? 'Rest Day'
                          : `${day.exercises.length} exercises`}
                      </p>
                    </div>
                  </div>
                  {!day.isRestDay && (
                    <Button
                      size="sm"
                      className="transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      onClick={() => openStartDialog(day.dayOfWeek)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No workout days defined for this plan.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
          <span>{assignment.completedDaysCount} days completed</span>
          {assignment.assignedBy && (
            <span>Assigned by {assignment.assignedBy.displayName}</span>
          )}
        </div>
      </CardContent>

      {/* Start Workout Dialog */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Start {selectedDay ? DAY_LABELS[selectedDay] : ''} Workout
            </DialogTitle>
            <DialogDescription>{assignment.plan.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {gyms.length > 0 && (
              <div className="space-y-2">
                <Label>Gym Location</Label>
                <Select
                  value={selectedGymId || ''}
                  onValueChange={(v) => setSelectedGymId(v || undefined)}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select a gym (optional)" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {gyms.map((gym) => (
                      <SelectItem key={gym.id} value={gym.id}>
                        <div className="flex flex-col">
                          <span>{gym.name}</span>
                          {gym.location && (
                            <span className="text-xs text-muted-foreground">
                              {gym.location.city}
                              {gym.location.state
                                ? `, ${gym.location.state}`
                                : ''}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Optional - helps track where you work out
                </p>
              </div>
            )}

            {gyms.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No gyms saved. Add gyms in your profile settings.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStartDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartWorkout}
              disabled={startWorkout.isPending}
            >
              {startWorkout.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Workout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================
// Following View Component (self-assigned plans)
// ============================================

function FollowingView() {
  const { data, isLoading } = useMyAssignments();
  const unfollowPlan = useUnfollowPlan();
  const [unfollowTarget, setUnfollowTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const assignments = data?.success ? data.data.assignments : [];
  // Self-assigned = no assignedById
  const selfAssignedActive = assignments.filter(
    (a) => a.status === 'ACTIVE' && !a.assignedById,
  );
  const selfAssignedCompleted = assignments.filter(
    (a) => a.status === 'COMPLETED' && !a.assignedById,
  );

  const handleUnfollow = (assignmentId: string, planName: string) => {
    setUnfollowTarget({ id: assignmentId, name: planName });
  };

  const confirmUnfollow = async () => {
    if (!unfollowTarget) return;
    try {
      await unfollowPlan.mutateAsync(unfollowTarget.id);
      toast.success('You are no longer following this plan');
    } catch {
      toast.error('Failed to unfollow plan');
    } finally {
      setUnfollowTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <Skeleton className="h-6 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (selfAssignedActive.length === 0 && selfAssignedCompleted.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Play className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            No Plans Being Followed
          </h3>
          <p className="text-muted-foreground max-w-sm">
            Start following a workout plan to track your progress. Go to "My
            Plans" and click "Start Following" on any plan.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {selfAssignedActive.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Active</h3>
            <div className="space-y-4">
              {selfAssignedActive.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  showUnfollow
                  onUnfollow={() =>
                    handleUnfollow(assignment.id, assignment.plan.name)
                  }
                />
              ))}
            </div>
          </div>
        )}

        {selfAssignedCompleted.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Completed</h3>
            <div className="space-y-4">
              {selfAssignedCompleted.map((assignment) => (
                <Card key={assignment.id} className="opacity-75">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{assignment.plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Completed {assignment.completedDaysCount} days
                        </p>
                      </div>
                      <Badge variant="secondary">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!unfollowTarget}
        onOpenChange={(open) => !open && setUnfollowTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Following Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop following &ldquo;
              {unfollowTarget?.name}&rdquo;? Your progress will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Following</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={unfollowPlan.isPending}
              onClick={confirmUnfollow}
            >
              {unfollowPlan.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unfollowing...
                </>
              ) : (
                'Stop Following'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================
// From Coach View Component (coach-assigned plans)
// ============================================

function FromCoachView() {
  const { data, isLoading } = useMyAssignments();

  const assignments = data?.success ? data.data.assignments : [];
  // Coach-assigned = has assignedById
  const coachAssignedActive = assignments.filter(
    (a) => a.status === 'ACTIVE' && a.assignedById,
  );
  const coachAssignedCompleted = assignments.filter(
    (a) => a.status === 'COMPLETED' && a.assignedById,
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <Skeleton className="h-6 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (coachAssignedActive.length === 0 && coachAssignedCompleted.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-pink-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            No Coach Assigned Plans
          </h3>
          <p className="text-muted-foreground max-w-sm">
            Your coach hasn't assigned any workout plans yet. When they do,
            they'll appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {coachAssignedActive.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Active Plans</h3>
          <div className="space-y-4">
            {coachAssignedActive.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        </div>
      )}

      {coachAssignedCompleted.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Completed Plans</h3>
          <div className="space-y-4">
            {coachAssignedCompleted.map((assignment) => (
              <Card key={assignment.id} className="opacity-75">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{assignment.plan.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Completed {assignment.completedDaysCount} days
                      </p>
                    </div>
                    <Badge variant="secondary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Browse Public Plans Component
// ============================================

function BrowsePlans({ onSelectPlan }: { onSelectPlan: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useWorkoutPlans({
    visibility: 'PUBLIC',
    search: search || undefined,
    page: 1,
    limit: 12,
  });

  const copyPlan = useCopyPlan();
  const plans = data?.success ? data.data.plans : [];

  const handleCopy = async (planId: string) => {
    try {
      await copyPlan.mutateAsync(planId);
      toast.success('Plan copied to your collection');
    } catch {
      toast.error('Failed to copy plan');
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search public plans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <Globe className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {search ? 'No Matching Plans' : 'No Public Plans'}
            </h3>
            <p className="text-muted-foreground max-w-sm">
              {search
                ? 'No plans match your search. Try different keywords or clear your search.'
                : 'No public workout plans available yet. Be the first to share your plan!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSelect={() => onSelectPlan(plan.id)}
              onCopy={() => handleCopy(plan.id)}
              isOwner={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function WorkoutPlansPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedIsOwner, setSelectedIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'my-plans' | 'following' | 'assigned' | 'browse'
  >('my-plans');
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);

  const { data: myPlansData, isLoading: myPlansLoading } = useMyWorkoutPlans();
  const { data: assignmentsData } = useMyAssignments();
  const deletePlan = useDeletePlan();
  const followPlan = useFollowPlan();

  const myPlans = myPlansData?.success ? myPlansData.data.plans : [];

  // Get set of plan IDs that user is already following
  const followedPlanIds = new Set(
    assignmentsData?.success
      ? assignmentsData.data.assignments
          .filter((a) => a.status === 'ACTIVE')
          .map((a) => a.planId)
      : [],
  );

  const handleDeletePlan = (planId: string) => {
    setDeletePlanId(planId);
  };

  const confirmDeletePlan = async () => {
    if (!deletePlanId) return;
    try {
      await deletePlan.mutateAsync(deletePlanId);
      toast.success('Plan deleted');
    } catch {
      toast.error('Failed to delete plan');
    } finally {
      setDeletePlanId(null);
    }
  };

  const handleSelectPlan = (planId: string, isOwner: boolean) => {
    setSelectedPlanId(planId);
    setSelectedIsOwner(isOwner);
  };

  const handleFollowPlan = async (planId: string) => {
    try {
      await followPlan.mutateAsync(planId);
      toast.success(
        "You're now following this plan! Go to 'Following' tab to start workouts.",
      );
      setActiveTab('following');
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : 'Failed to follow plan';
      if (errMsg.includes('already following')) {
        toast.info(
          "You're already following this plan. Go to 'Following' tab.",
        );
        setActiveTab('following');
      } else {
        toast.error(errMsg);
      }
    }
  };

  const handleSharePlanToElevate = (plan: WorkoutPlanListItem) => {
    if (plan.visibility !== 'PUBLIC') {
      toast.error('Only public plans can be shared to Elevate');
      return;
    }

    const attachmentPayload = encodeURIComponent(
      JSON.stringify([
        {
          planId: plan.id,
          name: plan.name,
          description: plan.description,
          dayCount: plan.dayCount,
          difficultyLabel: plan.difficulty
            ? DIFFICULTY_LABELS[plan.difficulty]
            : undefined,
          visibilityLabel: 'Public',
        },
      ]),
    );

    navigate(`/elevate?compose=1&workoutPlan=${attachmentPayload}`);
  };

  // If a plan is selected, show the viewer/editor
  if (selectedPlanId) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
        <PlanViewer
          planId={selectedPlanId}
          onBack={() => {
            setSelectedPlanId(null);
            setSelectedIsOwner(false);
          }}
          isOwner={selectedIsOwner}
        />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Training Hub
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Workout Plans
            </h1>
            <p className="text-muted-foreground mt-2">
              Create your own plans, follow programs, and track coach
              assignments.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="rounded-full px-3 py-1 text-xs"
              >
                <Dumbbell className="h-3.5 w-3.5 mr-1" />
                {myPlans.length} personal plans
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full px-3 py-1 text-xs"
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                {followedPlanIds.size} active follows
              </Badge>
            </div>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            size="icon"
            className="gap-2 shrink-0 bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            aria-label="Create plan"
            title="Create plan"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative mt-3 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Create a plan, add days and exercises, then follow it to turn it
              into your active training flow.
            </p>
          </div>
        </div>
      </section>

      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab(v as 'my-plans' | 'following' | 'assigned' | 'browse')
        }
      >
        <ScrollIndicator>
          <TabsList
            className={cn(
              'mb-6 w-full h-auto p-1 bg-muted/70',
              isMobile ? 'flex gap-1' : 'grid grid-cols-4',
            )}
          >
            <TabsTrigger value="my-plans" className="gap-2 py-2.5">
              <Dumbbell className="h-4 w-4" />
              <span className="hidden sm:inline">My Plans</span>
              <span className="sm:hidden">Plans</span>
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2 py-2.5">
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Following</span>
              <span className="sm:hidden">Active</span>
            </TabsTrigger>
            <TabsTrigger value="assigned" className="gap-2 py-2.5">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">From Coach</span>
              <span className="sm:hidden">Coach</span>
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-2 py-2.5">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Browse</span>
              <span className="sm:hidden">Explore</span>
            </TabsTrigger>
          </TabsList>
        </ScrollIndicator>

        <TabsContent value="my-plans">
          {myPlansLoading ? (
            <div
              className={cn(
                'grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none',
                isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3',
              )}
            >
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : myPlans.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Dumbbell className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Plans Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Create your first workout plan to get started, or browse
                  public plans from other users.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    onClick={() => setCreateOpen(true)}
                    size="icon"
                    className="gap-2"
                    aria-label="Create plan"
                    title="Create plan"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setActiveTab('browse')}
                    className="gap-2"
                    aria-label="Browse plans"
                    title="Browse plans"
                  >
                    <Globe className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div
              className={cn(
                'grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none',
                isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3',
              )}
            >
              {myPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onSelect={() => handleSelectPlan(plan.id, true)}
                  isOwner={true}
                  onDelete={() => handleDeletePlan(plan.id)}
                  onFollow={() => handleFollowPlan(plan.id)}
                  isFollowing={followedPlanIds.has(plan.id)}
                  onShareToElevate={() => handleSharePlanToElevate(plan)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="following">
          <FollowingView />
        </TabsContent>

        <TabsContent value="assigned">
          <FromCoachView />
        </TabsContent>

        <TabsContent value="browse">
          <BrowsePlans onSelectPlan={(id) => handleSelectPlan(id, false)} />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog
        open={!!deletePlanId}
        onOpenChange={(open) => !open && setDeletePlanId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this plan? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePlan.isPending}
              onClick={confirmDeletePlan}
            >
              {deletePlan.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Plan'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
