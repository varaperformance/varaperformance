import { useState } from 'react';
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
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Users,
  Settings,
  Dumbbell,
  ChevronRight,
  Send,
  Moon,
  EyeOff,
  Globe,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCoachWorkoutPlans,
  useWorkoutPlan,
  useCreateCoachPlan,
  useDeletePlan,
  useAddDay,
  useDeleteDay,
  useAddExercise,
  useUpdateExercise,
  useDeleteExercise,
  useAddPlanSet as useAddSet,
  useUpdatePlanSet as useUpdateSet,
  useDeletePlanSet as useDeleteSet,
  useAssignPlan,
  useCoachAssignments,
  DAY_LABELS,
  DAYS_ORDERED,
  DIFFICULTY_LABELS,
  VISIBILITY_LABELS,
  type WorkoutPlanListItem,
  type DayOfWeek,
  type CreateWorkoutPlan,
} from '@/features/health';
import { useCoachClients } from '@/features/coaching';
import { useExercises } from '@/features/health';

// ============================================
// Plan Card Component
// ============================================

function PlanCard({
  plan,
  onSelect,
  onEdit,
  onDelete,
}: {
  plan: WorkoutPlanListItem;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      onClick={onSelect}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/60 via-emerald-500/60 to-primary/60 opacity-0 transition-opacity group-hover:opacity-100" />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          <Badge
            variant={plan.visibility === 'PUBLIC' ? 'default' : 'secondary'}
          >
            {VISIBILITY_LABELS[plan.visibility]}
          </Badge>
        </div>
        {plan.description && (
          <CardDescription className="line-clamp-2">
            {plan.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{plan.dayCount} days</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{plan.assignCount} assigned</span>
          </div>
          {plan.difficulty && (
            <Badge variant="outline" className="text-xs">
              {DIFFICULTY_LABELS[plan.difficulty]}
            </Badge>
          )}
        </div>
        <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Settings className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
  const isMobile = useIsMobile();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<
    'PRIVATE' | 'CLIENTS' | 'PUBLIC'
  >('CLIENTS');
  const [difficulty, setDifficulty] = useState<
    'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | ''
  >('');
  const [durationWeeks, setDurationWeeks] = useState('');

  const createPlan = useCreateCoachPlan();

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
      days: [], // Start with empty days
    };

    try {
      await createPlan.mutateAsync(data);
      toast.success('Workout plan created');
      onOpenChange(false);
      // Reset form
      setName('');
      setDescription('');
      setVisibility('CLIENTS');
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
            Create a new workout plan template to assign to clients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Push Pull Legs"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the workout plan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div
            className={cn(
              'grid gap-4',
              isMobile ? 'grid-cols-1' : 'grid-cols-2',
            )}
          >
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(v) =>
                  setVisibility(v as 'PRIVATE' | 'CLIENTS' | 'PUBLIC')
                }
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
                  <SelectItem value="CLIENTS">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Clients Only
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
// Assign Plan Dialog
// ============================================

function AssignPlanDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: WorkoutPlanListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: clientsData, isLoading: clientsLoading } = useCoachClients({
    status: 'CONFIRMED',
  });
  const assignPlan = useAssignPlan();

  const clients = clientsData?.success ? clientsData.data.clients : [];

  const handleAssign = async () => {
    if (!plan || !selectedClientId) {
      toast.error('Please select a client');
      return;
    }

    try {
      await assignPlan.mutateAsync({
        planId: plan.id,
        clientId: selectedClientId,
        coachNotes: notes.trim() || undefined,
      });
      toast.success('Plan assigned to client');
      onOpenChange(false);
      setSelectedClientId('');
      setNotes('');
    } catch {
      toast.error('Failed to assign plan');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Plan to Client</DialogTitle>
          <DialogDescription>
            {plan
              ? `Assign "${plan.name}" to one of your clients.`
              : 'Select a client to assign this plan.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Client</Label>
            {clientsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active clients found. Clients need a confirmed booking.
              </p>
            ) : (
              <Select
                value={selectedClientId}
                onValueChange={setSelectedClientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.bookingId} value={client.user.id}>
                      <div className="flex items-center gap-2">
                        <span>{client.user.displayName || 'Client'}</span>
                        <span className="text-muted-foreground text-xs">
                          ({client.package.name})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes for Client (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any specific instructions or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={assignPlan.isPending || !selectedClientId}
          >
            {assignPlan.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            <Send className="h-4 w-4 mr-2" />
            Assign Plan
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
  targetReps: number | null;
  targetWeight: number | null;
  targetRpe: number | null;
  targetDuration: number | null;
  restAfter: number | null;
  setType: string | null;
  notes: string | null;
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
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState('');
  // For cardio exercises (no sets)
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');

  const updateExercise = useUpdateExercise();
  const addSetMutation = useAddSet();
  const updateSetMutation = useUpdateSet();
  const deleteSetMutation = useDeleteSet();

  // Reset form when dialog opens with new exercise
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && exercise) {
      setNotes(exercise.notes || '');
      setDuration(exercise.targetDuration?.toString() || '');
      setDistance(exercise.targetDistance?.toString() || '');
    }
    onOpenChange(isOpen);
  };

  const handleSaveNotes = async () => {
    if (!exercise) return;

    try {
      // For cardio, also save duration/distance
      const data: Record<string, unknown> = { notes: notes || undefined };
      if (exercise.category === 'CARDIO') {
        data.targetDuration = duration ? parseInt(duration) : undefined;
        data.targetDistance = distance ? parseFloat(distance) : undefined;
      }

      await updateExercise.mutateAsync({
        planId,
        dayId: exercise.dayId,
        exerciseId: exercise.id,
        data,
      });
      toast.success('Exercise updated');
    } catch {
      toast.error('Failed to update exercise');
    }
  };

  const handleAddSet = async () => {
    if (!exercise) return;

    const nextSetNumber = (exercise.sets?.length || 0) + 1;

    try {
      await addSetMutation.mutateAsync({
        planId,
        dayId: exercise.dayId,
        exerciseId: exercise.id,
        data: {
          setNumber: nextSetNumber,
          // Default values based on category
          targetReps: exercise.category === 'STRENGTH' ? 10 : undefined,
          targetWeight: exercise.category === 'STRENGTH' ? 0 : undefined,
          targetDuration: exercise.category !== 'STRENGTH' ? 30 : undefined,
        },
      });
      toast.success('Set added');
    } catch {
      toast.error('Failed to add set');
    }
  };

  const handleUpdateSet = async (
    setId: string,
    data: {
      targetReps?: number | null;
      targetWeight?: number | null;
      targetRpe?: number | null;
      targetDuration?: number | null;
    },
  ) => {
    if (!exercise) return;

    try {
      await updateSetMutation.mutateAsync({
        planId,
        dayId: exercise.dayId,
        exerciseId: exercise.id,
        setId,
        data,
      });
    } catch {
      toast.error('Failed to update set');
    }
  };

  const handleDeleteSet = async (setId: string) => {
    if (!exercise) return;

    try {
      await deleteSetMutation.mutateAsync({
        planId,
        dayId: exercise.dayId,
        exerciseId: exercise.id,
        setId,
      });
      toast.success('Set removed');
    } catch {
      toast.error('Failed to remove set');
    }
  };

  const isCardio = exercise?.category === 'CARDIO';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
          <DialogDescription>
            {exercise?.name} ({exercise?.category?.toLowerCase()})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cardio: Duration & Distance (no individual sets) */}
          {isCardio && (
            <div
              className={cn(
                'grid gap-4',
                isMobile ? 'grid-cols-1' : 'grid-cols-2',
              )}
            >
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  placeholder="30"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
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
                />
              </div>
            </div>
          )}

          {/* Individual Sets (for non-cardio) */}
          {!isCardio && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Sets</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSet}
                  disabled={addSetMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Set
                </Button>
              </div>

              {exercise?.sets && exercise.sets.length > 0 ? (
                <div className="space-y-2">
                  {exercise.sets.map((set) => (
                    <div
                      key={set.id}
                      className="flex items-center gap-2 p-2 rounded bg-muted/50"
                    >
                      <span className="w-8 text-sm font-medium text-center">
                        {set.setNumber}
                      </span>
                      {exercise.category === 'STRENGTH' ? (
                        <>
                          <Input
                            type="number"
                            placeholder="Reps"
                            className="w-20 h-8"
                            defaultValue={set.targetReps || ''}
                            onBlur={(e) =>
                              handleUpdateSet(set.id, {
                                targetReps: e.target.value
                                  ? parseInt(e.target.value)
                                  : null,
                              })
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            ×
                          </span>
                          <Input
                            type="number"
                            placeholder="Weight"
                            className="w-20 h-8"
                            step="0.5"
                            defaultValue={set.targetWeight || ''}
                            onBlur={(e) =>
                              handleUpdateSet(set.id, {
                                targetWeight: e.target.value
                                  ? parseFloat(e.target.value)
                                  : null,
                              })
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            lbs
                          </span>
                        </>
                      ) : (
                        <>
                          <Input
                            type="number"
                            placeholder="Reps"
                            className="w-20 h-8"
                            defaultValue={set.targetReps || ''}
                            onBlur={(e) =>
                              handleUpdateSet(set.id, {
                                targetReps: e.target.value
                                  ? parseInt(e.target.value)
                                  : null,
                              })
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            reps
                          </span>
                          <Input
                            type="number"
                            placeholder="Hold (s)"
                            className="w-20 h-8"
                            defaultValue={set.targetDuration || ''}
                            onBlur={(e) =>
                              handleUpdateSet(set.id, {
                                targetDuration: e.target.value
                                  ? parseInt(e.target.value)
                                  : null,
                              })
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            sec
                          </span>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 ml-auto"
                        onClick={() => handleDeleteSet(set.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sets added. Click "Add Set" to add individual sets with
                  targets.
                </p>
              )}
            </div>
          )}

          {/* Exercise Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any specific instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSaveNotes} disabled={updateExercise.isPending}>
            {updateExercise.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save Notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Plan Editor Component
// ============================================

function PlanEditor({
  planId,
  onBack,
}: {
  planId: string;
  onBack: () => void;
}) {
  const { data, isLoading, error } = useWorkoutPlan(planId);
  const [addDayOpen, setAddDayOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseToEdit | null>(
    null,
  );

  const addDay = useAddDay();
  const deleteDay = useDeleteDay();
  const addExercise = useAddExercise();
  const deleteExercise = useDeleteExercise();

  const plan = data?.success ? data.data : null;

  // Get exercises for the exercise picker
  const { data: exercisesData } = useExercises({ limit: 100 });
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
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
              <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
              Back to Plans
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">{plan.name}</h2>
            {plan.description && (
              <p className="text-muted-foreground">{plan.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setAssignOpen(true)}
              className="transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <Send className="h-4 w-4 mr-2" />
              Assign to Client
            </Button>
          </div>
        </div>
      </div>

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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteDay(day.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
                                      ` @ ${set.targetWeight} lbs`}
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
                                        ` @ ${ex.targetWeight} lbs`}
                                      {ex.targetRpe && ` RPE ${ex.targetRpe}`}
                                    </>
                                  )}
                                  {/* Cardio: duration, distance */}
                                  {ex.exercise.category === 'CARDIO' && (
                                    <>
                                      {ex.targetDuration &&
                                        `${ex.targetDuration} min`}
                                      {ex.targetDistance &&
                                        ` • ${ex.targetDistance}m`}
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
                            onClick={() => handleDeleteExercise(day.id, ex.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Add exercise dropdown */}
                  <Select
                    value=""
                    onValueChange={(exerciseId) =>
                      handleAddExercise(day.id, exerciseId)
                    }
                  >
                    <SelectTrigger className="w-full mt-2 border-dashed">
                      <SelectValue placeholder="+ Add exercise..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-64">
                        {exercises.map((ex) => (
                          <SelectItem key={ex.id} value={ex.id}>
                            {ex.name}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Add Day Button */}
        {availableDays.length > 0 && (
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
      </div>

      {/* Assign Dialog */}
      <AssignPlanDialog
        plan={{
          ...plan,
          dayCount: plan.days.filter((d) => !d.isRestDay).length,
        }}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />

      {/* Edit Exercise Dialog */}
      <EditExerciseDialog
        exercise={editingExercise}
        planId={planId}
        open={!!editingExercise}
        onOpenChange={(open) => !open && setEditingExercise(null)}
      />
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function CoachWorkoutPlansPage() {
  const isMobile = useIsMobile();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [assignPlan, setAssignPlan] = useState<WorkoutPlanListItem | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<'plans' | 'assignments'>('plans');
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);

  const { data: plansData, isLoading: plansLoading } = useCoachWorkoutPlans();
  const { data: assignmentsData, isLoading: assignmentsLoading } =
    useCoachAssignments();
  const deletePlan = useDeletePlan();

  const plans = plansData?.success ? plansData.data.plans : [];
  const assignments = assignmentsData?.success
    ? assignmentsData.data.assignments
    : [];

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

  // If a plan is selected, show the editor
  if (selectedPlanId) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-10 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
        <PlanEditor
          planId={selectedPlanId}
          onBack={() => setSelectedPlanId(null)}
        />
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-10 space-y-7">
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Coach Dashboard
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Workout Plans
            </h1>
            <p className="text-muted-foreground mt-2">
              Build structured programs and assign them to active clients.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="rounded-full px-3 py-1 text-xs"
              >
                <Dumbbell className="h-3.5 w-3.5 mr-1" />
                {plans.length} plans
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full px-3 py-1 text-xs"
              >
                <Users className="h-3.5 w-3.5 mr-1" />
                {assignments.length} assignments
              </Badge>
            </div>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </section>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'plans' | 'assignments')}
      >
        <TabsList className="mb-6 h-auto bg-muted/70 p-1">
          <TabsTrigger value="plans">
            <Dumbbell className="h-4 w-4 mr-2" />
            My Plans ({plans.length})
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Users className="h-4 w-4 mr-2" />
            Assignments ({assignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          {plansLoading ? (
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
          ) : plans.length === 0 ? (
            <Card className="text-center py-12 border-dashed">
              <CardContent>
                <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Plans Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first workout plan to assign to clients.
                </p>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div
              className={cn(
                'grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none',
                isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3',
              )}
            >
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onSelect={() => setSelectedPlanId(plan.id)}
                  onEdit={() => setSelectedPlanId(plan.id)}
                  onDelete={() => handleDeletePlan(plan.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments">
          {assignmentsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <Skeleton className="h-6 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <Card className="text-center py-12 border-dashed">
              <CardContent>
                <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Assignments Yet
                </h3>
                <p className="text-muted-foreground">
                  Assign a workout plan to one of your clients to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <Card
                  key={assignment.id}
                  className="border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{assignment.plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Assigned to{' '}
                          <span className="font-medium">
                            {assignment.client?.displayName || 'Client'}
                          </span>
                          {' • '}
                          Week {assignment.currentWeek}
                          {assignment.plan.durationWeeks &&
                            ` of ${assignment.plan.durationWeeks}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            assignment.status === 'ACTIVE'
                              ? 'default'
                              : assignment.status === 'COMPLETED'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {assignment.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {assignment.completedDaysCount} days completed
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AssignPlanDialog
        plan={assignPlan}
        open={!!assignPlan}
        onOpenChange={(open) => !open && setAssignPlan(null)}
      />

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
