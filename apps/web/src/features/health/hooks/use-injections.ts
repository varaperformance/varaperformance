import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  CreateInjectionLog,
  CreateInjectionProtocol,
  InjectionLogResponse,
  InjectionLogsListData,
  InjectionLogsQuery,
  InjectionProtocolResponse,
  SuccessResponse,
  UpdateInjectionProtocol,
} from '@varaperformance/core';

export type {
  InjectionProtocolResponse,
  InjectionLogResponse,
  InjectionLogsListData,
};

export const injectionKeys = {
  protocols: ['injection-protocols'] as const,
  logs: ['injection-logs'] as const,
  logsList: (query: InjectionLogsQuery) =>
    [...injectionKeys.logs, query] as const,
};

const getInjectionProtocols = async () => {
  const response = await api.get<SuccessResponse<InjectionProtocolResponse[]>>(
    'injections/protocols',
  );
  return response.data;
};

const createInjectionProtocol = async (data: CreateInjectionProtocol) => {
  const response = await api.post<SuccessResponse<InjectionProtocolResponse>>(
    'injections/protocols',
    data,
  );
  return response.data;
};

const updateInjectionProtocol = async ({
  id,
  data,
}: {
  id: string;
  data: UpdateInjectionProtocol;
}) => {
  const response = await api.patch<SuccessResponse<InjectionProtocolResponse>>(
    `injections/protocols/${id}`,
    data,
  );
  return response.data;
};

const deleteInjectionProtocol = async (id: string) => {
  const response = await api.delete<SuccessResponse<{ deleted: true }>>(
    `injections/protocols/${id}`,
  );
  return response.data;
};

const getInjectionLogs = async (query: InjectionLogsQuery) => {
  const params = new URLSearchParams();
  if (query.protocolId) params.set('protocolId', query.protocolId);
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  if (query.limit) params.set('limit', String(query.limit));

  const queryString = params.toString();
  const response = await api.get<SuccessResponse<InjectionLogsListData>>(
    `injections/logs${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const createInjectionLog = async (data: CreateInjectionLog) => {
  const response = await api.post<SuccessResponse<InjectionLogResponse>>(
    'injections/logs',
    data,
  );
  return response.data;
};

const deleteInjectionLog = async (id: string) => {
  const response = await api.delete<SuccessResponse<{ deleted: true }>>(
    `injections/logs/${id}`,
  );
  return response.data;
};

export function useInjectionProtocols(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: injectionKeys.protocols,
    queryFn: getInjectionProtocols,
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateInjectionProtocol(options?: {
  onSuccess?: (data: SuccessResponse<InjectionProtocolResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInjectionProtocol,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: injectionKeys.protocols });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useUpdateInjectionProtocol(options?: {
  onSuccess?: (data: SuccessResponse<InjectionProtocolResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateInjectionProtocol,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: injectionKeys.protocols });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useDeleteInjectionProtocol(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInjectionProtocol,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: injectionKeys.protocols });
      queryClient.invalidateQueries({ queryKey: injectionKeys.logs });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

export function useInjectionLogs(
  query: InjectionLogsQuery = { limit: 50 },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: injectionKeys.logsList(query),
    queryFn: () => getInjectionLogs(query),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateInjectionLog(options?: {
  onSuccess?: (data: SuccessResponse<InjectionLogResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInjectionLog,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: injectionKeys.logs });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useDeleteInjectionLog(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInjectionLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: injectionKeys.logs });
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}
