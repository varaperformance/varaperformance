import { useState, useMemo } from 'react';
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
  Flame,
  Trophy,
  CheckCircle2,
  Circle,
  Trash2,
  Pencil,
  Loader2,
  ListChecks,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTimezone } from '@/features/profile';
import {
  getTodayInTimezone,
  getDaysAgoInTimezone,
  formatDateInTimezone,
} from '@varaperformance/core';
import {
  useHabits,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
  useToggleHabit,
  useHabitHeatmap,
} from '@/features/health';

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
];
import { useIsMobile } from '@/hooks/use-is-mobile';

export default function HabitsPage() {
  const isMobile = useIsMobile();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingHabit, setEditingHabit] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);
  const [deleteHabitId, setDeleteHabitId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]!);

  const timezone = useTimezone();
  const todayKey = getTodayInTimezone(timezone);

  // Heatmap: last 90 days
  const heatmapFrom = useMemo(() => {
    return getDaysAgoInTimezone(90, timezone);
  }, [timezone]);

  const { data: habitsData, isLoading } = useHabits();
  const { data: heatmapData } = useHabitHeatmap(heatmapFrom, todayKey);

  const createMutation = useCreateHabit({
    onSuccess: () => {
      toast.success('Habit created!');
      setShowCreateDialog(false);
      setNewName('');
      setNewColor(PRESET_COLORS[0]!);
    },
    onError: (err) => toast.error(err.message || 'Failed to create habit'),
  });

  const updateMutation = useUpdateHabit({
    onSuccess: () => {
      toast.success('Habit updated!');
      setEditingHabit(null);
    },
    onError: (err) => toast.error(err.message || 'Failed to update habit'),
  });

  const deleteMutation = useDeleteHabit({
    onSuccess: () => {
      toast.success('Habit deleted');
      setDeleteHabitId(null);
    },
    onError: (err) => toast.error(err.message || 'Failed to delete habit'),
  });

  const toggleMutation = useToggleHabit({
    onSuccess: (data) => {
      toast.success(data.data.completed ? 'Completed!' : 'Unchecked');
    },
    onError: (err) => toast.error(err.message || 'Failed to toggle habit'),
  });

  const habits = habitsData?.data?.items ?? [];
  const heatmap = useMemo(() => heatmapData?.data?.items ?? [], [heatmapData]);

  // Build heatmap grid (last 90 days)
  const heatmapMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of heatmap) {
      map.set(entry.date, entry.count);
    }
    return map;
  }, [heatmap]);

  const totalCompletedToday = heatmapMap.get(todayKey) ?? 0;
  const bestActiveStreak = habits.length
    ? Math.max(...habits.map((h) => h.currentStreak))
    : 0;
  const longestEverStreak = habits.length
    ? Math.max(...habits.map((h) => h.longestStreak))
    : 0;

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-indigo-500/10 via-transparent to-violet-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Daily Tracker
            </p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">Habits</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Build consistency with daily check-ins and track your streaks.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5 text-primary" />
                {habits.length} active habit{habits.length !== 1 ? 's' : ''}
              </div>
              {bestActiveStreak > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  {bestActiveStreak} day streak
                </div>
              )}
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-600/90 hover:to-violet-600/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Habit
          </Button>
        </div>

        {habits.length === 0 && (
          <div className="relative mt-4 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Create your first habit to start building daily streaks. Tap the
                circle next to each habit to check it off for the day.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Summary Stats */}
      <div
        className={cn(
          'grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none',
          isMobile ? 'grid-cols-1' : 'md:grid-cols-3',
        )}
      >
        <Card className="group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/70 to-indigo-500/70" />
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCompletedToday}</p>
                  <p className="text-xs text-muted-foreground">Done Today</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-orange-500/70 to-amber-500/70" />
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bestActiveStreak}</p>
                  <p className="text-xs text-muted-foreground">
                    Best Active Streak
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-yellow-500/70 to-amber-400/70" />
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{longestEverStreak}</p>
                  <p className="text-xs text-muted-foreground">
                    Longest Streak Ever
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Card */}
      <Card className="group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-indigo-500/70 to-violet-500/70" />
        <CardHeader>
          <CardTitle className="text-base">Activity Heatmap</CardTitle>
          <CardDescription>Last 90 days of habit completions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 91 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (90 - i));
              const key = formatDateInTimezone(d, timezone);
              const count = heatmapMap.get(key) ?? 0;
              const maxH = habits.length || 1;
              const intensity = Math.min(count / maxH, 1);
              return (
                <div
                  key={key}
                  title={`${key}: ${count} completed`}
                  className={cn(
                    'h-3 w-3 rounded-sm',
                    intensity === 0 && 'bg-muted',
                    intensity > 0 && intensity < 0.5 && 'bg-primary/30',
                    intensity >= 0.5 && intensity < 1 && 'bg-primary/60',
                    intensity >= 1 && 'bg-primary',
                  )}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Habit List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden border-muted/70">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : habits.length === 0 ? (
        <Card className="overflow-hidden border-muted/70">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                <ListChecks className="h-8 w-8 text-indigo-500/50" />
              </div>
              <p className="font-medium text-muted-foreground">No habits yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first habit to start tracking daily progress
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Habit
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
          {habits.map((habit) => {
            const isCompletedToday =
              habit.lastCompletedDate &&
              habit.lastCompletedDate.split('T')[0] === todayKey;
            return (
              <Card
                key={habit.id}
                className="group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1"
                  style={{
                    background: `linear-gradient(to right, ${habit.color}B3, ${habit.color}70)`,
                  }}
                />
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          habitId: habit.id,
                          date: todayKey,
                        })
                      }
                      disabled={toggleMutation.isPending}
                      className="shrink-0"
                    >
                      {isCompletedToday ? (
                        <CheckCircle2
                          className="h-7 w-7"
                          style={{ color: habit.color }}
                        />
                      ) : (
                        <Circle className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'font-medium',
                          isCompletedToday &&
                            'line-through text-muted-foreground',
                        )}
                      >
                        {habit.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {habit.currentStreak > 0 && (
                          <span className="flex items-center gap-1">
                            <Flame className="h-3 w-3 text-orange-500" />
                            {habit.currentStreak} day streak
                          </span>
                        )}
                        <span>Best: {habit.longestStreak} days</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setEditingHabit({
                            id: habit.id,
                            name: habit.name,
                            color: habit.color,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteHabitId(habit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Habit</DialogTitle>
            <DialogDescription>
              Add a daily habit to track consistently.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="habit-name">Name</Label>
              <Input
                id="habit-name"
                placeholder="e.g., Stretch for 10 minutes"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform',
                      newColor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent',
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: newName.trim(),
                  icon: 'circle-check',
                  color: newColor,
                })
              }
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingHabit}
        onOpenChange={(open) => !open && setEditingHabit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-habit-name">Name</Label>
              <Input
                id="edit-habit-name"
                value={editingHabit?.name ?? ''}
                onChange={(e) =>
                  setEditingHabit((prev) =>
                    prev ? { ...prev, name: e.target.value } : null,
                  )
                }
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() =>
                      setEditingHabit((prev) =>
                        prev ? { ...prev, color } : null,
                      )
                    }
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform',
                      editingHabit?.color === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent',
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHabit(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editingHabit?.name.trim() || updateMutation.isPending}
              onClick={() => {
                if (!editingHabit) return;
                updateMutation.mutate({
                  id: editingHabit.id,
                  name: editingHabit.name.trim(),
                  color: editingHabit.color,
                });
              }}
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteHabitId}
        onOpenChange={(open) => !open && setDeleteHabitId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Habit</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this habit and all its history. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteHabitId) deleteMutation.mutate(deleteHabitId);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
