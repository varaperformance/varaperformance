import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Search,
  Edit,
  Trash2,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/lib/api';
import {
  useAdminExercises,
  useCreateExercise,
  useUpdateExercise,
  useToggleExercise,
  useDeleteExercise,
  type AdminExercise,
} from '@/hooks/use-admin';

const CATEGORIES = [
  'STRENGTH',
  'CARDIO',
  'FLEXIBILITY',
  'PLYOMETRICS',
  'BODYWEIGHT',
];
const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const MUSCLE_GROUPS = [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'LEGS',
  'GLUTES',
  'CORE',
  'FULL_BODY',
];
const EQUIPMENT = [
  'BARBELL',
  'DUMBBELL',
  'CABLE',
  'MACHINE',
  'BODYWEIGHT',
  'KETTLEBELL',
  'RESISTANCE_BAND',
  'CARDIO_MACHINE',
];

export default function ExerciseManagementPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Create/Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<AdminExercise | null>(
    null,
  );

  // Form state
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseSlug, setExerciseSlug] = useState('');
  const [exerciseCategory, setExerciseCategory] = useState('');
  const [exerciseDifficulty, setExerciseDifficulty] = useState('');
  const [exerciseDescription, setExerciseDescription] = useState('');
  const [exerciseVideoUrl, setExerciseVideoUrl] = useState('');
  const [exerciseThumbnailUrl, setExerciseThumbnailUrl] = useState('');
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>(
    [],
  );
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [variations, setVariations] = useState<string[]>([]);

  // Slug validation state
  const [slugStatus, setSlugStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken'
  >('idle');

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExercise, setDeletingExercise] =
    useState<AdminExercise | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Queries & Mutations
  const { data: exercisesData, isLoading } = useAdminExercises({
    search: debouncedSearch,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    page,
    limit: 20,
  });

  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();
  const toggleExercise = useToggleExercise();
  const deleteExercise = useDeleteExercise();

  const exercises = exercisesData?.data?.items ?? [];
  const total = exercisesData?.data?.total ?? 0;
  const limit = exercisesData?.data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit) || 1;

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingExercise(null);
    setExerciseName('');
    setExerciseSlug('');
    setExerciseCategory('');
    setExerciseDifficulty('');
    setExerciseDescription('');
    setExerciseVideoUrl('');
    setExerciseThumbnailUrl('');
    setSelectedMuscleGroups([]);
    setSelectedEquipment([]);
    setInstructions([]);
    setTips([]);
    setVariations([]);
    setSlugStatus('idle');
  };

  const openEditDialog = (exercise: AdminExercise) => {
    setEditingExercise(exercise);
    setExerciseName(exercise.name);
    setExerciseSlug(exercise.slug);
    setExerciseCategory(exercise.category);
    setExerciseDifficulty(exercise.difficulty);
    setExerciseDescription(exercise.description);
    setExerciseVideoUrl(exercise.videoUrl ?? '');
    setExerciseThumbnailUrl(exercise.thumbnailUrl ?? '');
    setSelectedMuscleGroups(exercise.muscleGroups.map((m) => m.muscleGroup));
    setSelectedEquipment(exercise.equipment.map((e) => e.equipment));
    setInstructions(exercise.instructions ?? []);
    setTips(exercise.tips ?? []);
    setVariations(exercise.variations ?? []);
    setDialogOpen(true);
  };

  // Check slug availability with debounce
  useEffect(() => {
    // Skip check if no slug
    if (!exerciseSlug) return;

    // Skip check if editing and slug hasn't changed
    if (editingExercise && exerciseSlug === editingExercise.slug) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setSlugStatus('checking');
      (async () => {
        try {
          const excludeParam = editingExercise
            ? `?excludeId=${editingExercise.id}`
            : '';
          const response = await api.get<{
            success: boolean;
            data: { slugTaken: boolean };
          }>(`/exercises/slug/${exerciseSlug}/check${excludeParam}`, {
            signal: controller.signal,
          });
          if (!controller.signal.aborted) {
            setSlugStatus(response.data.data.slugTaken ? 'taken' : 'available');
          }
        } catch {
          if (!controller.signal.aborted) {
            setSlugStatus('idle');
          }
        }
      })();
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
      setSlugStatus('idle');
    };
  }, [exerciseSlug, editingExercise]);

  const handleSubmit = () => {
    const data = {
      name: exerciseName,
      slug: exerciseSlug,
      category: exerciseCategory,
      difficulty: exerciseDifficulty,
      description: exerciseDescription,
      videoUrl: exerciseVideoUrl || undefined,
      thumbnailUrl: exerciseThumbnailUrl || undefined,
      muscleGroups: selectedMuscleGroups.map((mg) => ({ muscleGroup: mg })),
      equipment: selectedEquipment.map((eq) => ({ equipment: eq })),
      instructions: instructions.filter(Boolean),
      tips: tips.filter(Boolean),
      variations: variations.filter(Boolean),
    };

    if (editingExercise) {
      updateExercise.mutate(
        { id: editingExercise.id, ...data },
        {
          onSuccess: () => {
            toast.success('Exercise updated successfully');
            resetDialog();
          },
          onError: () => toast.error('Failed to update exercise'),
        },
      );
    } else {
      createExercise.mutate(data, {
        onSuccess: () => {
          toast.success('Exercise created successfully');
          resetDialog();
        },
        onError: () => toast.error('Failed to create exercise'),
      });
    }
  };

  const handleDelete = () => {
    if (deletingExercise) {
      deleteExercise.mutate(deletingExercise.id, {
        onSuccess: () => {
          toast.success('Exercise deleted');
          setDeleteDialogOpen(false);
          setDeletingExercise(null);
        },
        onError: () => toast.error('Failed to delete exercise'),
      });
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setExerciseName(name);
    if (!editingExercise) {
      setExerciseSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      );
    }
  };

  const toggleMuscleGroup = (mg: string) => {
    setSelectedMuscleGroups((prev) =>
      prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg],
    );
  };

  const toggleEquipmentItem = (eq: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq],
    );
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Exercise Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage exercise library</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingExercise ? 'Edit Exercise' : 'Create Exercise'}
              </DialogTitle>
              <DialogDescription>
                {editingExercise
                  ? 'Update exercise details'
                  : 'Add a new exercise to the library'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={exerciseName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Barbell Bench Press"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <div className="relative">
                    <Input
                      id="slug"
                      value={exerciseSlug}
                      onChange={(e) => setExerciseSlug(e.target.value)}
                      placeholder="e.g., barbell-bench-press"
                      className={
                        slugStatus === 'taken'
                          ? 'border-destructive pr-10'
                          : slugStatus === 'available'
                            ? 'border-green-500 pr-10'
                            : ''
                      }
                    />
                    {slugStatus === 'checking' && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                    {slugStatus === 'available' && (
                      <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                    )}
                    {slugStatus === 'taken' && (
                      <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                    )}
                  </div>
                  {slugStatus === 'taken' && (
                    <p className="text-xs text-destructive">
                      This slug is already taken
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={exerciseCategory}
                    onValueChange={setExerciseCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0) + cat.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={exerciseDifficulty}
                    onValueChange={setExerciseDifficulty}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((diff) => (
                        <SelectItem key={diff} value={diff}>
                          {diff.charAt(0) + diff.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={exerciseDescription}
                  onChange={(e) => setExerciseDescription(e.target.value)}
                  placeholder="Describe the exercise..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Muscle Groups</Label>
                <div className="flex flex-wrap gap-2">
                  {MUSCLE_GROUPS.map((mg) => (
                    <Badge
                      key={mg}
                      variant={
                        selectedMuscleGroups.includes(mg)
                          ? 'default'
                          : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => toggleMuscleGroup(mg)}
                    >
                      {mg.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Equipment</Label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT.map((eq) => (
                    <Badge
                      key={eq}
                      variant={
                        selectedEquipment.includes(eq) ? 'default' : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => toggleEquipmentItem(eq)}
                    >
                      {eq.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">Video URL (optional)</Label>
                  <Input
                    id="videoUrl"
                    value={exerciseVideoUrl}
                    onChange={(e) => setExerciseVideoUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnailUrl">Thumbnail URL (optional)</Label>
                  <Input
                    id="thumbnailUrl"
                    value={exerciseThumbnailUrl}
                    onChange={(e) => setExerciseThumbnailUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label>How to Perform (Instructions)</Label>
                <div className="space-y-2">
                  {instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="flex h-9 w-6 items-center justify-center text-sm text-muted-foreground">
                        {index + 1}.
                      </span>
                      <Input
                        value={instruction}
                        onChange={(e) => {
                          const newInstructions = [...instructions];
                          newInstructions[index] = e.target.value;
                          setInstructions(newInstructions);
                        }}
                        placeholder="Enter step..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setInstructions(
                            instructions.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setInstructions([...instructions, ''])}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Step
                  </Button>
                </div>
              </div>

              {/* Tips */}
              <div className="space-y-2">
                <Label>Tips</Label>
                <div className="space-y-2">
                  {tips.map((tip, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={tip}
                        onChange={(e) => {
                          const newTips = [...tips];
                          newTips[index] = e.target.value;
                          setTips(newTips);
                        }}
                        placeholder="Enter tip..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setTips(tips.filter((_, i) => i !== index))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTips([...tips, ''])}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Tip
                  </Button>
                </div>
              </div>

              {/* Variations */}
              <div className="space-y-2">
                <Label>Variations</Label>
                <div className="space-y-2">
                  {variations.map((variation, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={variation}
                        onChange={(e) => {
                          const newVariations = [...variations];
                          newVariations[index] = e.target.value;
                          setVariations(newVariations);
                        }}
                        placeholder="Enter variation..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setVariations(
                            variations.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVariations([...variations, ''])}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Variation
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !exerciseName ||
                  !exerciseSlug ||
                  !exerciseCategory ||
                  !exerciseDifficulty ||
                  !exerciseDescription ||
                  slugStatus === 'taken' ||
                  slugStatus === 'checking' ||
                  createExercise.isPending ||
                  updateExercise.isPending
                }
              >
                {createExercise.isPending || updateExercise.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingExercise ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Dumbbell className="mb-4 h-12 w-12" />
              <p>No exercises found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Muscle Groups</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exercises.map((exercise: AdminExercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{exercise.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {exercise.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {exercise.category.charAt(0) +
                          exercise.category.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          exercise.difficulty === 'BEGINNER'
                            ? 'default'
                            : exercise.difficulty === 'INTERMEDIATE'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {exercise.difficulty.charAt(0) +
                          exercise.difficulty.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {exercise.muscleGroups
                          .slice(0, 2)
                          .map((m: { muscleGroup: string }) => (
                            <Badge
                              key={m.muscleGroup}
                              variant="outline"
                              className="text-xs"
                            >
                              {m.muscleGroup.replace('_', ' ')}
                            </Badge>
                          ))}
                        {exercise.muscleGroups.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{exercise.muscleGroups.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={exercise.isActive ? 'default' : 'secondary'}
                      >
                        {exercise.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            toggleExercise.mutate(exercise.id, {
                              onSuccess: () =>
                                toast.success(
                                  exercise.isActive
                                    ? 'Exercise deactivated'
                                    : 'Exercise activated',
                                ),
                              onError: () =>
                                toast.error('Failed to toggle exercise'),
                            })
                          }
                          title={exercise.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {exercise.isActive ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(exercise)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingExercise(exercise);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)}{' '}
            of {total} exercises
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exercise</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingExercise?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteExercise.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
