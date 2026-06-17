import { useCallback, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addToDeviceCalendar } from '@/lib/calendar-sync';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/features/auth';
import {
  useCalendarAssociations,
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} from '@/features/calendar';
import { useMapboxSearch } from '@/hooks/use-mapbox';
import type { CalendarOccurrence } from '@varaperformance/core';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Globe,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';

type CalendarViewMode = '7d' | '14d' | 'month';
type CalendarEntryMode = 'EVENT' | 'MEETING' | 'OUT_OF_OFFICE';

function toInputDateTime(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toInputDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function fromInputDateTime(value: string): string {
  return new Date(value).toISOString();
}

function fromInputDate(value: string): string {
  const d = new Date(value + 'T00:00:00');
  return d.toISOString();
}

function fromInputDateEnd(value: string): string {
  const d = new Date(value + 'T23:59:59');
  return d.toISOString();
}

function formatTime(dateIso: string): string {
  return new Date(dateIso).toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDateKey(date: Date): string {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date: Date): Date {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function endOfWeek(date: Date): Date {
  const copy = startOfWeek(date);
  copy.setDate(copy.getDate() + 6);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function CalendarPage() {
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const now = new Date();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('7d');
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(now));
  const [targetUserId, setTargetUserId] = useState('');
  const [showPrivateEvents, setShowPrivateEvents] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarOccurrence | null>(
    null,
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [entryMode, setEntryMode] = useState<CalendarEntryMode>('EVENT');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [participantUserId, setParticipantUserId] = useState('');
  const [startAt, setStartAt] = useState(() => toInputDateTime(now));
  const [startDate, setStartDate] = useState(() => toInputDate(now));
  const [endAt, setEndAt] = useState(() => {
    const plusHour = new Date(now);
    plusHour.setHours(plusHour.getHours() + 1);
    return toInputDateTime(plusHour);
  });
  const [endDate, setEndDate] = useState(() => toInputDate(now));

  const [frequency, setFrequency] = useState<
    'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  >('NONE');
  const [interval, setInterval] = useState('1');
  const [until, setUntil] = useState('');
  const [count, setCount] = useState('');
  const [weekdaySelection, setWeekdaySelection] = useState<number[]>([]);

  const { rangeStart, rangeEnd, daysInView, visibleMonth } = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(anchorDate);
      const monthEnd = endOfMonth(anchorDate);
      const start = startOfWeek(monthStart);
      const end = endOfWeek(monthEnd);
      const dayCount = 42;
      const days = Array.from({ length: dayCount }, (_, index) =>
        addDays(start, index),
      );
      return {
        rangeStart: start,
        rangeEnd: end,
        daysInView: days,
        visibleMonth: monthStart,
      };
    }

    const length = viewMode === '14d' ? 14 : 7;
    const start = startOfDay(anchorDate);
    const end = addDays(start, length - 1);
    end.setHours(23, 59, 59, 999);

    const days = Array.from({ length }, (_, index) => addDays(start, index));

    return {
      rangeStart: start,
      rangeEnd: end,
      daysInView: days,
      visibleMonth: startOfMonth(start),
    };
  }, [anchorDate, viewMode]);

  const eventsQuery = useCalendarEvents({
    startIso: rangeStart.toISOString(),
    endIso: rangeEnd.toISOString(),
    targetUserId: targetUserId.trim() || undefined,
  });
  const createMutation = useCreateCalendarEvent();
  const deleteMutation = useDeleteCalendarEvent();
  const updateMutation = useUpdateCalendarEvent();
  const associationsQuery = useCalendarAssociations();

  const groupedByDay = useMemo<Record<string, CalendarOccurrence[]>>(() => {
    const groups: Record<string, CalendarOccurrence[]> = {};
    for (const item of eventsQuery.data?.data.items ?? []) {
      if (!showPrivateEvents && item.isPrivateMasked) {
        continue;
      }
      const dayKey = startOfDay(new Date(item.occurrenceStart)).toISOString();
      groups[dayKey] ??= [];
      groups[dayKey].push(item);
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort(
        (a, b) =>
          new Date(a.occurrenceStart).getTime() -
          new Date(b.occurrenceStart).getTime(),
      );
    }
    return groups;
  }, [eventsQuery.data, showPrivateEvents]);

  const miniMonthDays = useMemo(() => {
    const monthStart = startOfMonth(anchorDate);
    const start = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [anchorDate]);

  const viewTitle = useMemo(() => {
    if (viewMode === 'month') {
      return visibleMonth.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      });
    }
    return `${formatDayLabel(rangeStart)} - ${formatDayLabel(rangeEnd)}`;
  }, [rangeEnd, rangeStart, viewMode, visibleMonth]);

  const moveRange = (direction: 'prev' | 'next') => {
    const multiplier = direction === 'next' ? 1 : -1;
    if (viewMode === 'month') {
      setAnchorDate(
        (current) =>
          new Date(current.getFullYear(), current.getMonth() + multiplier, 1),
      );
      return;
    }

    const delta = viewMode === '14d' ? 14 : 7;
    setAnchorDate((current) => addDays(current, delta * multiplier));
  };

  const submitEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const recurrence =
      frequency === 'NONE'
        ? undefined
        : {
            frequency,
            interval: Number(interval) || 1,
            byWeekday: frequency === 'WEEKLY' ? weekdaySelection : undefined,
            until: until ? new Date(until).toISOString() : undefined,
            count: count ? Number(count) : undefined,
          };

    const normalizedTitle =
      title.trim().length > 0
        ? title.trim()
        : entryMode === 'OUT_OF_OFFICE'
          ? 'Out of office'
          : 'Untitled';

    const startIso = allDay
      ? fromInputDate(startDate)
      : fromInputDateTime(startAt);
    const endIso = allDay
      ? fromInputDateEnd(endDate)
      : fromInputDateTime(endAt);

    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
      setFormError('End must be after start.');
      return;
    }

    const payload = {
      title: normalizedTitle,
      description: description || undefined,
      location: location || undefined,
      type: (entryMode === 'MEETING' ? 'MEETING' : 'EVENT') as
        | 'EVENT'
        | 'MEETING',
      visibility:
        entryMode === 'OUT_OF_OFFICE' ? ('PRIVATE' as const) : visibility,
      allDay,
      participantUserId:
        entryMode === 'MEETING' ? participantUserId || undefined : undefined,
      startAt: startIso,
      endAt: endIso,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      recurrence,
    };

    try {
      if (editingEvent) {
        await updateMutation.mutateAsync({
          eventId: editingEvent.eventId,
          payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch {
      setFormError('Could not save event. Check start/end and try again.');
      return;
    }

    setTitle('');
    setDescription('');
    setLocation('');
    setAllDay(false);
    setParticipantUserId('');
    setFrequency('NONE');
    setInterval('1');
    setUntil('');
    setCount('');
    setWeekdaySelection([]);
    setEntryMode('EVENT');
    setFormError(null);
    setEditingEvent(null);
    setIsCreateOpen(false);
  };

  const openCreateForDay = (day: Date) => {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    setStartAt(toInputDateTime(start));
    setEndAt(toInputDateTime(end));
    setStartDate(toInputDate(day));
    setEndDate(toInputDate(day));
    setAllDay(false);
    setEditingEvent(null);
    setEntryMode('EVENT');
    setVisibility('PUBLIC');
    setParticipantUserId('');
    setIsCreateOpen(true);
  };

  const openEditEvent = (item: CalendarOccurrence) => {
    if (item.ownerUserId !== user?.sub) {
      return;
    }

    setEditingEvent(item);
    setTitle(item.title === 'Busy' ? '' : item.title);
    setDescription(item.description ?? '');
    setLocation(item.location ?? '');
    setAllDay(item.allDay);
    setEntryMode(item.type === 'MEETING' ? 'MEETING' : 'EVENT');
    setVisibility(item.visibility);
    setParticipantUserId(item.participantUserId ?? '');
    setStartAt(toInputDateTime(new Date(item.occurrenceStart)));
    setEndAt(toInputDateTime(new Date(item.occurrenceEnd)));
    setStartDate(toInputDate(new Date(item.occurrenceStart)));
    setEndDate(toInputDate(new Date(item.occurrenceEnd)));
    setFrequency('NONE');
    setInterval('1');
    setUntil('');
    setCount('');
    setWeekdaySelection([]);
    setIsCreateOpen(true);
  };

  const associatedUsers = associationsQuery.data?.data.items ?? [];

  const handleAllDayToggle = (checked: boolean) => {
    setAllDay(checked);
    if (checked) {
      setStartDate(toInputDate(new Date(startAt)));
      setEndDate(toInputDate(new Date(endAt)));
      return;
    }

    const start = new Date(startDate + 'T09:00:00');
    const end = new Date(endDate + 'T10:00:00');
    setStartAt(toInputDateTime(start));
    setEndAt(toInputDateTime(end));
  };

  const mapbox = useMapboxSearch({ limit: 5, useProximity: true });
  const [showLocationResults, setShowLocationResults] = useState(false);
  const locationWrapperRef = useRef<HTMLDivElement>(null);

  const selectMapboxPlace = useCallback(
    (name: string, address: string) => {
      setLocation(address ? `${name}, ${address}` : name);
      mapbox.setQuery('');
      setShowLocationResults(false);
    },
    [mapbox],
  );

  const hourSlots = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className={cn('h-fit lg:sticky lg:top-4', isMobile && 'order-2')}>
          <CardContent className="space-y-4 pt-6">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-xl">
                <div className="px-6 pt-6 pb-2">
                  <DialogHeader>
                    <DialogTitle className="sr-only">
                      {editingEvent ? 'Edit event' : 'New event'}
                    </DialogTitle>
                  </DialogHeader>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      entryMode === 'OUT_OF_OFFICE'
                        ? 'Out of office'
                        : 'Add title'
                    }
                    className="w-full border-0 border-b border-border bg-transparent pb-2 text-xl outline-none placeholder:text-muted-foreground/60 focus:border-primary"
                  />
                </div>

                <div className="flex gap-1 px-6 py-2">
                  {(['EVENT', 'MEETING', 'OUT_OF_OFFICE'] as const).map(
                    (mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setEntryMode(mode)}
                        className={cn(
                          'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                          entryMode === mode
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {mode === 'EVENT'
                          ? 'Event'
                          : mode === 'MEETING'
                            ? 'Meeting'
                            : 'Out of office'}
                      </button>
                    ),
                  )}
                </div>

                <form className="space-y-1 px-6 pb-6" onSubmit={submitEvent}>
                  {/* Date & Time */}
                  <div className="flex items-start gap-3 py-2">
                    <Clock className="mt-2 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="allDay"
                          checked={allDay}
                          onCheckedChange={(v) =>
                            handleAllDayToggle(Boolean(v))
                          }
                        />
                        <Label htmlFor="allDay" className="text-sm font-normal">
                          All day
                        </Label>
                      </div>
                      {allDay ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            type="date"
                            required
                            value={startDate}
                            onChange={(e) => {
                              const next = e.target.value;
                              setStartDate(next);
                              if (endDate < next) {
                                setEndDate(next);
                              }
                            }}
                            className="h-8 min-w-0 flex-1 text-sm"
                          />
                          <span className="text-sm text-muted-foreground">
                            –
                          </span>
                          <Input
                            type="date"
                            required
                            value={endDate}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-8 min-w-0 flex-1 text-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            type="datetime-local"
                            required
                            value={startAt}
                            onChange={(e) => {
                              const next = e.target.value;
                              setStartAt(next);
                              if (
                                new Date(next).getTime() >=
                                new Date(endAt).getTime()
                              ) {
                                const plusHour = new Date(next);
                                plusHour.setHours(plusHour.getHours() + 1);
                                setEndAt(toInputDateTime(plusHour));
                              }
                            }}
                            className="h-8 min-w-0 flex-1 text-sm"
                          />
                          <span className="text-sm text-muted-foreground">
                            –
                          </span>
                          <Input
                            type="datetime-local"
                            required
                            value={endAt}
                            min={startAt}
                            onChange={(e) => setEndAt(e.target.value)}
                            className="h-8 min-w-0 flex-1 text-sm"
                          />
                        </div>
                      )}
                      {formError && (
                        <p className="text-xs text-destructive">{formError}</p>
                      )}
                      <Select
                        value={frequency}
                        onValueChange={(value) =>
                          setFrequency(
                            value as
                              | 'NONE'
                              | 'DAILY'
                              | 'WEEKLY'
                              | 'MONTHLY'
                              | 'YEARLY',
                          )
                        }
                      >
                        <SelectTrigger className="h-7 w-auto gap-1 border-0 px-0 text-xs text-muted-foreground shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Does not repeat</SelectItem>
                          <SelectItem value="DAILY">Daily</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Participant (Meeting only) */}
                  {entryMode === 'MEETING' && (
                    <div className="flex items-center gap-3 py-2">
                      <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="flex-1">
                        <Select
                          value={participantUserId}
                          onValueChange={(value) => setParticipantUserId(value)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select coach or client" />
                          </SelectTrigger>
                          <SelectContent>
                            {associatedUsers.map((associate) => (
                              <SelectItem
                                key={associate.userId}
                                value={associate.userId}
                              >
                                {(associate.displayName ?? associate.email) +
                                  ` (${associate.role})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {associatedUsers.length === 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            No associated coach or client found yet.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div
                    ref={locationWrapperRef}
                    className="relative flex items-start gap-3 py-2"
                  >
                    <MapPin className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      {location ? (
                        <div className="flex items-center gap-2">
                          <span className="flex-1 truncate text-sm">
                            {location}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setLocation('')}
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setLocation('Online')}
                              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-muted"
                            >
                              <Globe className="h-3 w-3" />
                              Online
                            </button>
                          </div>
                          <Input
                            placeholder="Search for a place"
                            value={mapbox.query}
                            onChange={(e) => {
                              mapbox.setQuery(e.target.value);
                              setShowLocationResults(true);
                            }}
                            onFocus={() => setShowLocationResults(true)}
                            onBlur={() =>
                              setTimeout(
                                () => setShowLocationResults(false),
                                200,
                              )
                            }
                            className="h-8 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
                          />
                          {showLocationResults && mapbox.results.length > 0 && (
                            <div className="absolute right-0 left-8 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                              {mapbox.results.map((place) => (
                                <button
                                  key={place.id}
                                  type="button"
                                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() =>
                                    selectMapboxPlace(
                                      place.name,
                                      place.formattedAddress,
                                    )
                                  }
                                >
                                  <span className="font-medium">
                                    {place.name}
                                  </span>
                                  {place.formattedAddress && (
                                    <span className="text-xs text-muted-foreground">
                                      {place.formattedAddress}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                          {mapbox.isSearching && (
                            <p className="text-xs text-muted-foreground">
                              Searching...
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex items-start gap-3 py-2">
                    <AlignLeft className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <Textarea
                      placeholder="Add description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[48px] resize-none border-0 px-0 text-sm shadow-none focus-visible:ring-0"
                    />
                  </div>

                  {/* Visibility */}
                  <div className="flex items-center gap-3 py-2">
                    <Eye className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <Select
                      value={
                        entryMode === 'OUT_OF_OFFICE' ? 'PRIVATE' : visibility
                      }
                      onValueChange={(value) =>
                        setVisibility(value as 'PUBLIC' | 'PRIVATE')
                      }
                      disabled={entryMode === 'OUT_OF_OFFICE'}
                    >
                      <SelectTrigger className="h-8 w-auto gap-1 border-0 px-0 text-sm shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PUBLIC">Public</SelectItem>
                        <SelectItem value="PRIVATE">Private (busy)</SelectItem>
                      </SelectContent>
                    </Select>
                    {entryMode === 'OUT_OF_OFFICE' && (
                      <span className="text-xs text-muted-foreground">
                        Forced private
                      </span>
                    )}
                  </div>

                  {/* Advanced recurrence (when not NONE) */}
                  {frequency !== 'NONE' && (
                    <div className="ml-8 space-y-3 rounded-lg border bg-muted/20 p-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label htmlFor="interval" className="text-xs">
                            Every
                          </Label>
                          <Input
                            id="interval"
                            type="number"
                            min={1}
                            value={interval}
                            onChange={(e) => setInterval(e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="until" className="text-xs">
                            Until
                          </Label>
                          <Input
                            id="until"
                            type="datetime-local"
                            value={until}
                            onChange={(e) => setUntil(e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="count" className="text-xs">
                            Max occurrences
                          </Label>
                          <Input
                            id="count"
                            type="number"
                            min={1}
                            value={count}
                            onChange={(e) => setCount(e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                      {frequency === 'WEEKLY' && (
                        <div className="space-y-1">
                          <Label className="text-xs">Repeat on</Label>
                          <div className="flex gap-1">
                            {WEEKDAY_OPTIONS.map((day) => {
                              const selected = weekdaySelection.includes(
                                day.value,
                              );
                              return (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() => {
                                    setWeekdaySelection((current) =>
                                      current.includes(day.value)
                                        ? current.filter((v) => v !== day.value)
                                        : [...current, day.value],
                                    );
                                  }}
                                  className={cn(
                                    'flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors',
                                    selected
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                                  )}
                                >
                                  {day.label[0]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-2 pt-4">
                    {editingEvent && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mr-auto"
                          onClick={async () => {
                            const ok = await addToDeviceCalendar({
                              title: editingEvent.title,
                              notes: editingEvent.description ?? undefined,
                              location: editingEvent.location ?? undefined,
                              startDate: new Date(editingEvent.occurrenceStart),
                              endDate: new Date(editingEvent.occurrenceEnd),
                              allDay: editingEvent.allDay,
                            });
                            if (ok) toast.success('Added to device calendar');
                            else toast.error('Could not export event');
                          }}
                        >
                          Export
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          aria-label="Delete event"
                          title="Delete"
                          disabled={deleteMutation.isPending}
                          onClick={async () => {
                            await deleteMutation.mutateAsync(
                              editingEvent.eventId,
                            );
                            setEditingEvent(null);
                            setIsCreateOpen(false);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      type="submit"
                      disabled={
                        createMutation.isPending || updateMutation.isPending
                      }
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? 'Saving...'
                        : 'Save'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-3 text-sm font-medium">
                {anchorDate.toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
                {'SMTWTFS'.split('').map((item, index) => (
                  <span key={index}>{item}</span>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {miniMonthDays.map((day) => {
                  const inMonth = day.getMonth() === anchorDate.getMonth();
                  const isToday = isSameDay(day, new Date());
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setAnchorDate(startOfDay(day))}
                      className={cn(
                        'h-7 rounded text-xs',
                        inMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/50',
                        isToday && 'bg-primary text-primary-foreground',
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>View calendar</Label>
              <Select
                value={targetUserId || '__self__'}
                onValueChange={(value) =>
                  setTargetUserId(value === '__self__' ? '' : value)
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__self__">My calendar</SelectItem>
                  {associatedUsers.map((associate) => (
                    <SelectItem key={associate.userId} value={associate.userId}>
                      {(associate.displayName ?? associate.email) +
                        ` (${associate.role})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="showPrivate"
                checked={showPrivateEvents}
                onCheckedChange={(value) =>
                  setShowPrivateEvents(Boolean(value))
                }
              />
              <Label htmlFor="showPrivate" className="text-sm font-normal">
                Show private busy events
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card className={cn('overflow-hidden', isMobile && 'order-1')}>
          <CardHeader className="border-b bg-background/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveRange('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAnchorDate(startOfDay(new Date()))}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveRange('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <CardTitle className="text-lg">{viewTitle}</CardTitle>

              <Select
                value={viewMode}
                onValueChange={(v) => setViewMode(v as CalendarViewMode)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="14d">14 days</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {eventsQuery.isLoading && <p className="p-4">Loading events...</p>}
            {eventsQuery.isError && (
              <p className="p-4 text-destructive">Could not load events.</p>
            )}

            {!eventsQuery.isLoading && viewMode === 'month' && (
              <div className="grid grid-cols-7 border-b bg-muted/30">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div
                    key={d}
                    className="border-r p-2 text-xs font-medium last:border-r-0"
                  >
                    {d}
                  </div>
                ))}
              </div>
            )}

            {!eventsQuery.isLoading && viewMode === 'month' && (
              <div className="grid grid-cols-7">
                {daysInView.map((day) => {
                  const dayKey = startOfDay(day).toISOString();
                  const items = groupedByDay[dayKey] ?? [];
                  const inVisibleMonth =
                    day.getMonth() === visibleMonth.getMonth();

                  return (
                    <div
                      key={dayKey}
                      className="min-h-[150px] border-r border-b p-2 last:border-r-0"
                      onDoubleClick={() => openCreateForDay(day)}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={cn(
                            'text-xs font-medium',
                            inVisibleMonth
                              ? 'text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          {day.getDate()}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => openCreateForDay(day)}
                        >
                          +
                        </Button>
                      </div>

                      <div className="space-y-1">
                        {items.slice(0, 4).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="group relative w-full cursor-pointer rounded bg-primary/10 px-2 py-1 text-left text-[11px]"
                            onClick={() => openEditEvent(item)}
                          >
                            <p className="truncate font-medium">{item.title}</p>
                            <Pencil className="absolute top-1 right-1 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-70" />
                          </button>
                        ))}
                        {items.length > 4 && (
                          <p className="text-[11px] text-muted-foreground">
                            +{items.length - 4} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!eventsQuery.isLoading && viewMode !== 'month' && (
              <div className="overflow-auto">
                <div
                  className="grid min-w-[980px] border-b"
                  style={{
                    gridTemplateColumns: `72px repeat(${daysInView.length}, minmax(150px, 1fr))`,
                  }}
                >
                  <div className="border-r p-2 text-xs text-muted-foreground">
                    Time
                  </div>
                  {daysInView.map((day) => (
                    <div
                      key={day.toISOString()}
                      className="border-r p-2 text-xs font-medium last:border-r-0"
                    >
                      {formatDayLabel(day)}
                    </div>
                  ))}
                </div>

                <div
                  className="grid min-w-[980px]"
                  style={{
                    gridTemplateColumns: `72px repeat(${daysInView.length}, minmax(150px, 1fr))`,
                  }}
                >
                  <div
                    className="relative border-r"
                    style={{ height: `${24 * 48}px` }}
                  >
                    {hourSlots.map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t px-1 text-[10px] text-muted-foreground"
                        style={{ top: `${hour * 48}px` }}
                      >
                        {hour === 0
                          ? '12 AM'
                          : hour < 12
                            ? `${hour} AM`
                            : hour === 12
                              ? '12 PM'
                              : `${hour - 12} PM`}
                      </div>
                    ))}
                  </div>

                  {daysInView.map((day) => {
                    const key = getDateKey(day);
                    const dayItems =
                      groupedByDay[startOfDay(day).toISOString()] ?? [];

                    return (
                      <div
                        key={key}
                        className="relative border-r last:border-r-0"
                        style={{ height: `${24 * 48}px` }}
                      >
                        {hourSlots.map((hour) => (
                          <div
                            key={hour}
                            className="absolute left-0 right-0 border-t"
                            style={{ top: `${hour * 48}px` }}
                          />
                        ))}

                        {dayItems.map((item) => {
                          const start = new Date(item.occurrenceStart);
                          const end = new Date(item.occurrenceEnd);
                          const startMinutes =
                            start.getHours() * 60 + start.getMinutes();
                          const endMinutes =
                            end.getHours() * 60 + end.getMinutes();
                          const top = item.allDay
                            ? 0
                            : (startMinutes / 60) * 48;
                          const height = item.allDay
                            ? 24 * 48 - 2
                            : clamp(
                                ((endMinutes - startMinutes) / 60) * 48,
                                20,
                                300,
                              );

                          return (
                            <button
                              key={item.id}
                              type="button"
                              className="group absolute left-1 right-1 cursor-pointer rounded-md border border-primary/30 bg-primary/20 p-1 text-left"
                              style={{ top: `${top}px`, height: `${height}px` }}
                              onClick={() => openEditEvent(item)}
                            >
                              <p className="truncate text-[11px] font-medium">
                                {item.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {item.allDay
                                  ? '12:00 AM - 11:59 PM'
                                  : formatTime(item.occurrenceStart)}
                              </p>
                              <Pencil className="absolute top-1 right-1 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => openCreateForDay(day)}
                          className="absolute bottom-2 right-2 rounded bg-background/90 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          + event
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
