export const calendarEventSelect = {
  id: true,
  ownerUserId: true,
  participantUserId: true,
  title: true,
  description: true,
  location: true,
  type: true,
  visibility: true,
  allDay: true,
  startAt: true,
  endAt: true,
  timezone: true,
  recurrenceFrequency: true,
  recurrenceInterval: true,
  recurrenceByWeekday: true,
  recurrenceUntil: true,
  recurrenceCount: true,
} as const;

export const calendarEventOwnershipSelect = {
  id: true,
  ownerUserId: true,
  startAt: true,
  endAt: true,
  type: true,
  participantUserId: true,
} as const;
