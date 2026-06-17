import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
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
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useMyAvailability,
  useCreateAvailabilitySlot,
  useUpdateAvailabilitySlot,
  useDeleteAvailabilitySlot,
} from '@/features/coaching';
import type { DayOfWeek } from '@varaperformance/core';

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

export default function CoachAvailabilityPage() {
  const isMobile = useIsMobile();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [newDay, setNewDay] = useState<DayOfWeek>('MONDAY');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');

  const { data, isLoading } = useMyAvailability();

  const createMutation = useCreateAvailabilitySlot({
    onSuccess: () => {
      toast.success('Availability slot added!');
      setShowCreateDialog(false);
    },
    onError: (err) => toast.error(err.message || 'Failed to create slot'),
  });

  const updateMutation = useUpdateAvailabilitySlot({
    onSuccess: () => toast.success('Slot updated'),
    onError: (err) => toast.error(err.message || 'Failed to update slot'),
  });

  const deleteMutation = useDeleteAvailabilitySlot({
    onSuccess: () => {
      toast.success('Slot deleted');
      setDeleteSlotId(null);
    },
    onError: (err) => toast.error(err.message || 'Failed to delete slot'),
  });

  const slots = data?.data?.items ?? [];

  // Group by day
  const groupedByDay = new Map<string, typeof slots>();
  for (const slot of slots) {
    if (!groupedByDay.has(slot.dayOfWeek)) {
      groupedByDay.set(slot.dayOfWeek, []);
    }
    groupedByDay.get(slot.dayOfWeek)!.push(slot);
  }

  if (isLoading) {
    return (
      <div className="container max-w-3xl py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Availability</h1>
          <p className="text-muted-foreground">
            Set your recurring weekly schedule for coaching sessions
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Slot
        </Button>
      </div>

      {/* Weekly schedule */}
      {DAYS.map((day) => {
        const daySlots = groupedByDay.get(day.value) ?? [];
        return (
          <Card key={day.value}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{day.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {daySlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No availability set
                </p>
              ) : (
                <div className="space-y-2">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {slot.timezone}
                        </Badge>
                        {!slot.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={slot.isActive}
                          onCheckedChange={(isActive) =>
                            updateMutation.mutate({
                              id: slot.id,
                              isActive,
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteSlotId(slot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Availability Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={newDay}
                onValueChange={(v) => setNewDay(v as DayOfWeek)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div
              className={cn(
                'grid gap-4',
                isMobile ? 'grid-cols-1' : 'grid-cols-2',
              )}
            >
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
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
              disabled={createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  dayOfWeek: newDay,
                  startTime: newStart,
                  endTime: newEnd,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })
              }
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteSlotId}
        onOpenChange={(open) => !open && setDeleteSlotId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Availability Slot</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this time slot from your schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteSlotId) deleteMutation.mutate(deleteSlotId);
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
