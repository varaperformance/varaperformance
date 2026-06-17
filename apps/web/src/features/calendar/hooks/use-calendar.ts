import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  CalendarOccurrence,
  CreateCalendarEvent,
  SuccessResponse,
  UpdateCalendarEvent,
} from '@varaperformance/core';

interface CalendarRangeInput {
  startIso: string;
  endIso: string;
  targetUserId?: string;
}

export interface CalendarAssociatedUser {
  userId: string;
  role: 'coach' | 'client';
  displayName: string | null;
  email: string;
}

export const calendarKeys = {
  all: ['calendar'] as const,
  eventsPrefix: () => [...calendarKeys.all, 'events'] as const,
  events: (input: CalendarRangeInput) =>
    [...calendarKeys.all, 'events', input] as const,
  associations: () => [...calendarKeys.all, 'associations'] as const,
};

async function getCalendarEvents({
  startIso,
  endIso,
  targetUserId,
}: CalendarRangeInput) {
  const params = new URLSearchParams({
    start: startIso,
    end: endIso,
  });

  const endpoint = targetUserId
    ? `calendar/users/${targetUserId}/events?${params.toString()}`
    : `calendar/events?${params.toString()}`;

  const response =
    await api.get<SuccessResponse<{ items: CalendarOccurrence[] }>>(endpoint);
  return response.data;
}

async function createCalendarEvent(payload: CreateCalendarEvent) {
  const response = await api.post<SuccessResponse<{ id: string }>>(
    'calendar/events',
    payload,
  );
  return response.data;
}

async function updateCalendarEvent(params: {
  eventId: string;
  payload: UpdateCalendarEvent;
}) {
  const response = await api.patch<SuccessResponse<{ id: string }>>(
    `calendar/events/${params.eventId}`,
    params.payload,
  );
  return response.data;
}

async function deleteCalendarEvent(eventId: string) {
  const response = await api.delete<SuccessResponse<{ id: string }>>(
    `calendar/events/${eventId}`,
  );
  return response.data;
}

async function getCalendarAssociations() {
  const response = await api.get<
    SuccessResponse<{ items: CalendarAssociatedUser[] }>
  >('calendar/associations');
  return response.data;
}

export function useCalendarEvents(input: CalendarRangeInput) {
  return useQuery({
    queryKey: calendarKeys.events(input),
    queryFn: () => getCalendarEvents(input),
    enabled: Boolean(input.startIso && input.endIso),
    staleTime: 30 * 1000,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.eventsPrefix() });
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.eventsPrefix() });
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.eventsPrefix() });
    },
  });
}

export function useCalendarAssociations() {
  return useQuery({
    queryKey: calendarKeys.associations(),
    queryFn: getCalendarAssociations,
    staleTime: 5 * 60 * 1000,
  });
}
