import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useClimbEntries,
  useDeleteClimbEntry,
  useSaveClimbEntry,
  useUploadClimbPhoto,
} from '@/features/social';
import { useTimezone } from '@/features/profile';
import {
  CLIMB_CATEGORIES,
  getTodayInTimezone,
  type ClimbCategory,
} from '@varaperformance/core';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { TrustBadge } from '@/components/trust-badge';
import { pickImage } from '@/lib/camera';
import { shareContent, canShare } from '@/lib/share';
import { buildDeepLinkUrl } from '@/lib/deep-links';

function toSafeDate(value: string): Date | null {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const asDateOnlyNoon = new Date(`${value}T12:00:00`);
  if (!Number.isNaN(asDateOnlyNoon.getTime())) {
    return asDateOnlyNoon;
  }

  return null;
}

function getStoredDateKey(value: string): string | null {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match?.[1]) {
    return match[1];
  }

  const date = toSafeDate(value);
  if (!date) {
    return null;
  }

  return format(date, 'yyyy-MM-dd');
}

function formatDateLabel(value: string): string {
  const key = getStoredDateKey(value);
  const date = key ? toSafeDate(`${key}T12:00:00`) : null;
  if (!date) {
    return 'Unknown date';
  }
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCategoryLabel(category: ClimbCategory): string {
  return category
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ClimbPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const userNavigatedRef = useRef(false);
  const timezone = useTimezone();
  const [selectedCategory, setSelectedCategory] =
    useState<ClimbCategory>('DAILY');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    startOfMonth(new Date()),
  );

  const entriesQuery = useClimbEntries({
    limit: 365,
    category: selectedCategory,
  });
  const uploadPhoto = useUploadClimbPhoto();
  const saveEntry = useSaveClimbEntry();
  const deleteEntry = useDeleteClimbEntry();

  const sortedEntries = useMemo(() => {
    return [...(entriesQuery.data?.data.items ?? [])].sort((a, b) => {
      const aDate = toSafeDate(a.capturedDate);
      const bDate = toSafeDate(b.capturedDate);

      if (!aDate && !bDate) {
        return 0;
      }
      if (!aDate) {
        return 1;
      }
      if (!bDate) {
        return -1;
      }

      return aDate.getTime() - bDate.getTime();
    });
  }, [entriesQuery.data?.data.items]);

  useEffect(() => {
    if (!sortedEntries.length) {
      setActiveId(null);
      return;
    }
    setActiveId((prev) => {
      if (prev && sortedEntries.some((entry) => entry.id === prev)) {
        return prev;
      }
      return sortedEntries[sortedEntries.length - 1]?.id ?? null;
    });
  }, [sortedEntries]);

  const activeIndex = sortedEntries.findIndex((entry) => entry.id === activeId);
  const activeEntry = activeIndex >= 0 ? sortedEntries[activeIndex] : null;
  const activeEntryDayKey = activeEntry
    ? getStoredDateKey(activeEntry.capturedDate)
    : null;
  const todayDayKey = getTodayInTimezone(timezone);

  const entryByDay = useMemo(() => {
    const map = new Map<string, (typeof sortedEntries)[number]>();
    sortedEntries.forEach((entry) => {
      const key = getStoredDateKey(entry.capturedDate);
      if (key && !map.has(key)) {
        map.set(key, entry);
      }
    });
    return map;
  }, [sortedEntries]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let current = gridStart;

    while (current <= gridEnd) {
      days.push(current);
      current = addDays(current, 1);
    }

    return days;
  }, [calendarMonth]);

  useEffect(() => {
    if (!activeEntryDayKey || !userNavigatedRef.current) {
      return;
    }

    const activeDayDate = toSafeDate(`${activeEntryDayKey}T12:00:00`);
    if (!activeDayDate) {
      return;
    }

    const nextMonth = startOfMonth(activeDayDate);
    setCalendarMonth((prev) => {
      if (format(prev, 'yyyy-MM') === format(nextMonth, 'yyyy-MM')) {
        return prev;
      }
      return nextMonth;
    });
  }, [activeEntryDayKey]);

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (activeIndex > 0) {
          userNavigatedRef.current = true;
          setActiveId(sortedEntries[activeIndex - 1]?.id ?? null);
        }
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < sortedEntries.length - 1) {
          userNavigatedRef.current = true;
          setActiveId(sortedEntries[activeIndex + 1]?.id ?? null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, lightboxOpen, sortedEntries]);

  const handleSelectFile = async () => {
    const result = await pickImage();
    if (result.file) {
      try {
        const uploadResult = await uploadPhoto.mutateAsync(result.file);
        await saveEntry.mutateAsync({
          category: selectedCategory,
          imageUrl: uploadResult.data.url,
        });
        toast.success(
          `${formatCategoryLabel(selectedCategory)} check-in saved.`,
        );
      } catch {
        toast.error('Unable to save your Climb photo. Please try again.');
      }
      return;
    }
    if (!result.native) fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const uploadResult = await uploadPhoto.mutateAsync(file);
      await saveEntry.mutateAsync({
        category: selectedCategory,
        imageUrl: uploadResult.data.url,
      });
      toast.success(`${formatCategoryLabel(selectedCategory)} check-in saved.`);
    } catch {
      toast.error('Unable to save your Climb photo. Please try again.');
    } finally {
      event.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!activeEntry) {
      return;
    }

    try {
      await deleteEntry.mutateAsync(activeEntry.id);
      toast.success('Climb entry deleted.');
      setLightboxOpen(false);
    } catch {
      toast.error('Unable to delete this entry.');
    }
  };

  const handleOpenEntry = (id: string) => {
    userNavigatedRef.current = true;
    setActiveId(id);
    setLightboxOpen(true);
  };

  const lightboxPrevious = () => {
    if (activeIndex > 0) {
      userNavigatedRef.current = true;
      setActiveId(sortedEntries[activeIndex - 1]?.id ?? null);
    }
  };

  const lightboxNext = () => {
    if (activeIndex >= 0 && activeIndex < sortedEntries.length - 1) {
      userNavigatedRef.current = true;
      setActiveId(sortedEntries[activeIndex + 1]?.id ?? null);
    }
  };

  return (
    <div className="container py-6 space-y-8">
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-blue-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-blue-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Progress Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Climb
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Track one photo per day for each category and review visual
              progress over time.
            </p>
            <TrustBadge
              label="Private by default. Encrypted at rest."
              tooltip="Encrypted at rest means your photo files are protected while stored on disk."
              className="mt-3"
            />
          </div>

          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
            <Button
              onClick={handleSelectFile}
              disabled={uploadPhoto.isPending || saveEntry.isPending}
              className="sm:min-w-44"
            >
              <Camera className="mr-2 h-4 w-4" />
              {uploadPhoto.isPending || saveEntry.isPending
                ? 'Saving...'
                : `Add ${formatCategoryLabel(selectedCategory)} Photo`}
            </Button>
            <p className="text-[11px] text-muted-foreground sm:text-right">
              Stored securely after upload.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="relative mt-5 flex gap-2 overflow-x-auto pb-1">
          {CLIMB_CATEGORIES.map((category) => {
            const isActive = category === selectedCategory;
            return (
              <Button
                key={category}
                type="button"
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="shrink-0"
              >
                {formatCategoryLabel(category)}
              </Button>
            );
          })}
        </div>
      </section>

      <Card className="rounded-3xl border bg-card/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Calendar View</CardTitle>
          <CardDescription>
            {formatCategoryLabel(selectedCategory)} timeline. Click any day with
            a photo to open the lightbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entriesQuery.isLoading ? (
            <Skeleton className="h-105 w-full rounded-xl" />
          ) : activeEntry ? (
            <div className="space-y-4">
              <div className="rounded-xl border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Browse Month
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCalendarMonth((prev) => subMonths(prev, 1))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <p className="w-36 text-center text-sm font-medium">
                      {format(calendarMonth, 'MMMM yyyy')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCalendarMonth((prev) => addMonths(prev, 1))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                    (label) => (
                      <div key={label} className="py-1">
                        {label}
                      </div>
                    ),
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const key = format(day, 'yyyy-MM-dd');
                    const entry = entryByDay.get(key);
                    const selected = !!(entry && key === activeEntryDayKey);
                    const inMonth = isSameMonth(day, calendarMonth);

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={!entry}
                        onClick={() => {
                          if (entry) {
                            handleOpenEntry(entry.id);
                          }
                        }}
                        className={`relative aspect-square overflow-hidden rounded-md border text-left transition ${
                          inMonth ? 'bg-background' : 'bg-muted/40'
                        } ${
                          entry
                            ? 'cursor-pointer hover:border-primary'
                            : 'cursor-default'
                        } ${
                          selected
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-border'
                        }`}
                      >
                        <span
                          className={`absolute left-1 top-1 z-10 text-xs ${
                            inMonth
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                        {entry && (
                          <img
                            src={entry.imageUrl}
                            alt={`${formatCategoryLabel(selectedCategory)} climb on ${key}`}
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        {key === todayDayKey && (
                          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                        {activeEntryDayKey && key === activeEntryDayKey && (
                          <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-xl border border-dashed">
              <p className="text-sm text-muted-foreground">
                No Climb entries yet.
              </p>
              <Button onClick={handleSelectFile}>
                Add your first daily selfie
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="h-screen w-screen max-w-none border-0 bg-black/80 p-0"
          showCloseButton={false}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Climb selfie viewer</DialogTitle>
          <DialogDescription className="sr-only">
            View daily selfies and move left or right between days.
          </DialogDescription>
          {activeEntry ? (
            <div className="relative h-full w-full">
              <img
                src={activeEntry.imageUrl}
                alt={`${formatCategoryLabel(selectedCategory)} entry ${activeEntry.capturedDate}`}
                className="h-full w-full object-contain"
                loading="lazy"
                decoding="async"
              />

              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-2"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>

              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2"
                onClick={lightboxPrevious}
                disabled={activeIndex <= 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={lightboxNext}
                disabled={
                  activeIndex < 0 || activeIndex >= sortedEntries.length - 1
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <div className="absolute inset-x-2 bottom-2 rounded-md bg-black/55 p-3 text-white">
                <p className="text-sm font-medium">
                  {formatDateLabel(activeEntry.capturedDate)}
                </p>
                <p className="text-xs text-white/85">
                  {formatCategoryLabel(activeEntry.category)}
                </p>
                <p className="text-xs text-white/85">
                  Frame {activeIndex + 1} of {sortedEntries.length}
                </p>
                {activeEntry.note ? (
                  <p className="mt-1 text-xs text-white/85">
                    {activeEntry.note}
                  </p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  {canShare() && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        const url = buildDeepLinkUrl('/climb');
                        const shared = await shareContent({
                          text: `${formatCategoryLabel(activeEntry.category)} — ${formatDateLabel(activeEntry.capturedDate)}`,
                          url,
                          imageUrl: activeEntry.imageUrl,
                        });
                        if (!shared) toast.error('Unable to share');
                      }}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteEntry.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
