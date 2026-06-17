import { useState } from 'react';
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
  Plus,
  Trash2,
  Ruler,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  Loader2,
  Lock,
  Lightbulb,
} from 'lucide-react';
import { PrivacyNotice } from '@/components/common/privacy-notice';
import { toast } from 'sonner';
import {
  useMeasurements,
  useCreateMeasurement,
  useDeleteMeasurement,
} from '@/features/health';
import { useClimbEntries, type ClimbEntry } from '@/features/social';
import type {
  BodyMeasurementResponse,
  CreateBodyMeasurement,
  MeasurementUnit,
} from '@varaperformance/core';

const BODY_PARTS = [
  { key: 'neck', label: 'Neck' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'chest', label: 'Chest' },
  { key: 'leftBicep', label: 'Left Bicep' },
  { key: 'rightBicep', label: 'Right Bicep' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'leftThigh', label: 'Left Thigh' },
  { key: 'rightThigh', label: 'Right Thigh' },
  { key: 'leftCalf', label: 'Left Calf' },
  { key: 'rightCalf', label: 'Right Calf' },
] as const;

type BodyPartKey = (typeof BODY_PARTS)[number]['key'];

const TIPS = [
  'Measure at the same time each day for consistency.',
  'Track waist-to-hip ratio for a better picture of progress.',
  'Measurements can show progress even when the scale stays still.',
  'Flex muscles lightly for arms; relax for waist and hips.',
  'Use a fabric tape measure pulled snug but not compressing skin.',
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function TrendBadge({
  current,
  previous,
}: {
  current: number | null;
  previous: number | null;
}) {
  if (current === null || previous === null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        diff < 0 ? 'text-green-500' : 'text-amber-500',
      )}
    >
      {diff < 0 ? (
        <TrendingDown className="h-3 w-3" />
      ) : (
        <TrendingUp className="h-3 w-3" />
      )}
      {diff > 0 ? '+' : ''}
      {diff.toFixed(1)}
    </span>
  );
}

const MeasurementsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [unit, setUnit] = useState<MeasurementUnit>('IN');
  const [formValues, setFormValues] = useState<Record<BodyPartKey, string>>(
    Object.fromEntries(BODY_PARTS.map((bp) => [bp.key, ''])) as Record<
      BodyPartKey,
      string
    >,
  );
  const [note, setNote] = useState('');

  const { data: measurementsResponse, isLoading } = useMeasurements(50);

  const createMeasurement = useCreateMeasurement({
    onSuccess: () => {
      toast.success('Measurements logged');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to log measurements'),
  });

  const deleteMeasurement = useDeleteMeasurement({
    onSuccess: () => {
      toast.success('Entry deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete entry'),
  });

  const measurements = measurementsResponse?.success
    ? measurementsResponse.data
    : null;
  const entries = measurements?.items ?? [];
  const stats = measurements?.stats;
  const tipIndex = new Date().getDate() % TIPS.length;

  // Fetch Climb photos for the date range of measurements
  const dateRange =
    entries.length > 0
      ? {
          fromDate: entries[entries.length - 1].loggedAt.split('T')[0],
          toDate: entries[0].loggedAt.split('T')[0],
        }
      : undefined;
  const { data: climbResponse } = useClimbEntries(
    dateRange
      ? { fromDate: dateRange.fromDate, toDate: dateRange.toDate, limit: 365 }
      : undefined,
  );
  const climbEntries = climbResponse?.success
    ? (climbResponse.data?.items ?? [])
    : [];

  // Group Climb entries by capturedDate
  const climbByDate = new Map<string, ClimbEntry[]>();
  for (const ce of climbEntries) {
    const date = ce.capturedDate;
    if (!climbByDate.has(date)) climbByDate.set(date, []);
    climbByDate.get(date)!.push(ce);
  }

  function resetForm() {
    setFormValues(
      Object.fromEntries(BODY_PARTS.map((bp) => [bp.key, ''])) as Record<
        BodyPartKey,
        string
      >,
    );
    setNote('');
  }

  function handleSubmit() {
    const data: CreateBodyMeasurement = { unit };
    let hasValue = false;
    for (const bp of BODY_PARTS) {
      const val = formValues[bp.key].trim();
      if (val) {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
          (data as Record<string, unknown>)[bp.key] = num;
          hasValue = true;
        }
      }
    }
    if (!hasValue) {
      toast.error('Enter at least one measurement');
      return;
    }
    if (note.trim()) data.note = note.trim();
    createMeasurement.mutate(data);
  }

  function getEntryValues(entry: BodyMeasurementResponse) {
    return BODY_PARTS.filter((bp) => entry[bp.key] !== null).map((bp) => ({
      label: bp.label,
      value: entry[bp.key] as number,
    }));
  }

  if (isLoading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-5">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Ruler className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Body Measurements
              </h1>
              <p className="text-muted-foreground text-sm">
                Track your body composition changes over time.
              </p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Log Measurements
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log Body Measurements</DialogTitle>
                <DialogDescription>
                  Enter measurements for the body parts you want to track. All
                  values are encrypted.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3">
                  <Label>Unit</Label>
                  <Select
                    value={unit}
                    onValueChange={(v) => setUnit(v as MeasurementUnit)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Inches</SelectItem>
                      <SelectItem value="CM">Centimeters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {BODY_PARTS.map((bp) => (
                    <div key={bp.key} className="space-y-1">
                      <Label className="text-xs">{bp.label}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder={unit === 'IN' ? 'in' : 'cm'}
                        value={formValues[bp.key]}
                        onChange={(e) =>
                          setFormValues((prev) => ({
                            ...prev,
                            [bp.key]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Note (encrypted)
                  </Label>
                  <Input
                    placeholder="Optional note..."
                    maxLength={255}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
              <PrivacyNotice variant="health" />
              <DialogFooter>
                <Button
                  onClick={handleSubmit}
                  disabled={createMeasurement.isPending}
                >
                  {createMeasurement.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* Tip */}
      <div className="flex items-start gap-3 rounded-xl border bg-card/50 px-4 py-3 text-sm text-muted-foreground animate-in fade-in duration-300 motion-reduce:animate-none">
        <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
        <p>{TIPS[tipIndex]}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Waist Change', value: stats.waistChange },
            { label: 'Chest Change', value: stats.chestChange },
            { label: 'Hips Change', value: stats.hipsChange },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold">
                    {s.value !== null
                      ? `${s.value > 0 ? '+' : ''}${s.value.toFixed(1)}`
                      : '—'}
                  </p>
                  {s.value !== null && (
                    <span
                      className={cn(
                        'text-xs',
                        s.value < 0
                          ? 'text-green-500'
                          : s.value > 0
                            ? 'text-amber-500'
                            : 'text-muted-foreground',
                      )}
                    >
                      {s.value < 0 ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : s.value > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {entries[0]?.unit === 'CM' ? 'cm' : 'in'} · first to last
                  entry
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Entries */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Ruler className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium">No measurements yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Start tracking your body composition by logging your first entry.
            </p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Log Measurements
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">History</h2>
            <p className="text-sm text-muted-foreground">
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
          {entries.map((entry, index) => {
            const prev = entries[index + 1]; // entries sorted desc
            const values = getEntryValues(entry);
            return (
              <Card
                key={entry.id}
                className="animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
                style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(entry.loggedAt)}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {entry.unit === 'CM' ? 'cm' : 'in'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(entry.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {entry.note && (
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Lock className="h-3 w-3" />
                      {entry.note}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
                    {values.map((v) => (
                      <div
                        key={v.label}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{v.label}</span>
                        <span className="font-medium flex items-center gap-1">
                          {v.value}
                          {prev && (
                            <TrendBadge
                              current={v.value}
                              previous={
                                prev[
                                  BODY_PARTS.find((bp) => bp.label === v.label)!
                                    .key
                                ]
                              }
                            />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Climb photos from same date */}
                  {(() => {
                    const entryDate = entry.loggedAt.split('T')[0];
                    const photos = climbByDate.get(entryDate);
                    if (!photos || photos.length === 0) return null;
                    return (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Progress Photos
                        </p>
                        <div className="flex gap-2 overflow-x-auto">
                          {photos.map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.imageUrl}
                              alt={`${photo.category} progress`}
                              className="h-20 w-20 rounded-lg object-cover shrink-0"
                              loading="lazy"
                              decoding="async"
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete measurement entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The encrypted data will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMeasurement.isPending}
              onClick={() => {
                if (deleteTarget) deleteMeasurement.mutate(deleteTarget);
              }}
            >
              {deleteMeasurement.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PrivacyNotice variant="health" />
    </div>
  );
};

export default MeasurementsPage;
