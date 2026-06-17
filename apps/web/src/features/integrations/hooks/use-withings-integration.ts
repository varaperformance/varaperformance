import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { weightKeys } from '@/features/health/hooks/use-weight';

interface WithingsStatusResponse {
  connected: boolean;
  withingsUserId?: string;
  connectedAt?: string;
  lastSyncedAt?: string | null;
  importedMeasureGroups?: number;
}

interface WithingsConnectResponse {
  authorizeUrl: string;
}

interface WithingsSyncResponse {
  importedCount: number;
  lastSyncedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const withingsKeys = {
  all: ['integrations', 'withings'] as const,
  status: () => [...withingsKeys.all, 'status'] as const,
};

const getStatus = async () => {
  const response = await api.get<ApiResponse<WithingsStatusResponse>>(
    'integrations/withings/status',
  );
  return response.data;
};

const startConnect = async () => {
  const response = await api.post<ApiResponse<WithingsConnectResponse>>(
    'integrations/withings/connect',
  );
  return response.data;
};

const disconnect = async () => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    'integrations/withings',
  );
  return response.data;
};

const sync = async () => {
  const response = await api.post<ApiResponse<WithingsSyncResponse>>(
    'integrations/withings/sync',
  );
  return response.data;
};

export function useWithingsStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: withingsKeys.status(),
    queryFn: getStatus,
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useStartWithingsConnect(options?: {
  onSuccess?: (data: ApiResponse<WithingsConnectResponse>) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: startConnect,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useSyncWithings(options?: {
  onSuccess?: (data: ApiResponse<WithingsSyncResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sync,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: withingsKeys.status() });
      queryClient.invalidateQueries({ queryKey: weightKeys.all });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useDisconnectWithings(options?: {
  onSuccess?: (data: ApiResponse<{ message: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnect,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: withingsKeys.status() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}
