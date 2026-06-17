import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  AvailabilitySlotResponse,
  CreateAvailability,
  UpdateAvailability,
} from '@varaperformance/core';

export const availabilityKeys = {
  all: ['availability'] as const,
  me: () => [...availabilityKeys.all, 'me'] as const,
  coach: (coachId: string) => [...availabilityKeys.all, coachId] as const,
};

const getMyAvailability = async () => {
  const response = await api.get<
    SuccessResponse<{ items: AvailabilitySlotResponse[] }>
  >('coaching/availability/me');
  return response.data;
};

const getCoachAvailability = async (coachId: string) => {
  const response = await api.get<
    SuccessResponse<{ items: AvailabilitySlotResponse[] }>
  >(`coaching/availability?coachId=${coachId}`);
  return response.data;
};

const createSlot = async (data: CreateAvailability) => {
  const response = await api.post<SuccessResponse<AvailabilitySlotResponse>>(
    'coaching/availability',
    data,
  );
  return response.data;
};

const updateSlot = async ({
  id,
  ...data
}: UpdateAvailability & { id: string }) => {
  const response = await api.patch<SuccessResponse<AvailabilitySlotResponse>>(
    `coaching/availability/${id}`,
    data,
  );
  return response.data;
};

const deleteSlot = async (id: string) => {
  await api.delete(`coaching/availability/${id}`);
};

export function useMyAvailability() {
  return useQuery({
    queryKey: availabilityKeys.me(),
    queryFn: getMyAvailability,
  });
}

export function useCoachAvailability(coachId: string) {
  return useQuery({
    queryKey: availabilityKeys.coach(coachId),
    queryFn: () => getCoachAvailability(coachId),
    enabled: !!coachId,
  });
}

export function useCreateAvailabilitySlot(options?: {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

export function useUpdateAvailabilitySlot(options?: {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

export function useDeleteAvailabilitySlot(options?: {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}
