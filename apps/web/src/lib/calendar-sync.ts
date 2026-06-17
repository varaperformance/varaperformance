import { CapacitorCalendar } from 'capacitor-calendar';
import { isNativeApp } from '@/lib/capacitor';

export interface CalendarSyncEvent {
  title: string;
  notes?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
}

/**
 * Add an event to the device calendar via native plugin.
 * Falls back to .ics download on web.
 */
export async function addToDeviceCalendar(
  event: CalendarSyncEvent,
): Promise<boolean> {
  if (isNativeApp()) {
    try {
      await CapacitorCalendar.createEvent({
        title: event.title,
        notes: event.notes,
        location: event.location,
        startDate: event.startDate.getTime(),
        endDate: event.endDate.getTime(),
        allDay: event.allDay ?? false,
      });
      return true;
    } catch {
      return false;
    }
  }

  // Web fallback: download .ics file
  const blob = new Blob([generateICS(event)], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Generate an ICS string for a calendar event.
 */
export function generateICS(event: CalendarSyncEvent): string {
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@varaperformance.com`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vara Performance//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${fmt(event.startDate)}`,
    `DTEND:${fmt(event.endDate)}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];
  if (event.notes) lines.push(`DESCRIPTION:${escapeICS(event.notes)}`);
  if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
