import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface StravaStatusResponse {
  connected: boolean;
  athleteId?: number;
  athleteName?: string | null;
  athleteUsername?: string | null;
  connectedAt?: string;
  lastSyncedAt?: string | null;
  activityCount?: number;
}

interface StravaConnectResponse {
  authorizeUrl: string;
}

interface StravaSyncResponse {
  importedCount: number;
  lastSyncedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const stravaKeys = {
  all: ['integrations', 'strava'] as const,
  status: () => [...stravaKeys.all, 'status'] as const,
};

const getStatus = async () => {
  const response = await api.get<ApiResponse<StravaStatusResponse>>(
    'integrations/strava/status',
  );
  return response.data;
};

const startConnect = async () => {
  const response = await api.post<ApiResponse<StravaConnectResponse>>(
    'integrations/strava/connect',
  );
  return response.data;
};

const disconnect = async () => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    'integrations/strava',
  );
  return response.data;
};

const syncActivities = async (limit = 30) => {
  const response = await api.post<ApiResponse<StravaSyncResponse>>(
    `integrations/strava/sync?limit=${limit}`,
  );
  return response.data;
};

export function useStravaStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: stravaKeys.status(),
    queryFn: getStatus,
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useStartStravaConnect(options?: {
  onSuccess?: (data: ApiResponse<StravaConnectResponse>) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: startConnect,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useSyncStravaActivities(options?: {
  onSuccess?: (data: ApiResponse<StravaSyncResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (limit?: number) => syncActivities(limit ?? 30),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: stravaKeys.status(),
      });
      queryClient.invalidateQueries({
        queryKey: ['workout-sessions'],
      });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useDisconnectStrava(options?: {
  onSuccess?: (data: ApiResponse<{ message: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnect,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: stravaKeys.status(),
      });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}
