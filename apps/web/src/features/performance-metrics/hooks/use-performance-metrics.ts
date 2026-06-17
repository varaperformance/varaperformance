import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  CreatePerformanceMetric,
  PerformanceMetricResponse,
  PerformanceMetricQuery,
  PerformanceStats,
  SuccessResponse,
} from '@varaperformance/core';

export const performanceMetricsKeys = {
  all: ['performance-metrics'] as const,
  list: (query?: PerformanceMetricQuery) =>
    [...performanceMetricsKeys.all, query] as const,
  stats: (metricName?: string, startDate?: string, endDate?: string) =>
    [
      ...performanceMetricsKeys.all,
      'stats',
      metricName,
      startDate,
      endDate,
    ] as const,
};

const createMetric = async (data: CreatePerformanceMetric) => {
  const response = await api.post<SuccessResponse<PerformanceMetricResponse>>(
    'performance-metrics',
    data,
  );
  return response.data;
};

const getMetrics = async (query?: PerformanceMetricQuery) => {
  const params = new URLSearchParams();
  if (query?.userId) params.set('userId', query.userId);
  if (query?.metricName) params.set('metricName', query.metricName);
  if (query?.rating) params.set('rating', query.rating);
  if (query?.startDate) params.set('startDate', query.startDate);
  if (query?.endDate) params.set('endDate', query.endDate);
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));

  const queryString = params.toString();
  const response = await api.get<SuccessResponse<PerformanceMetricResponse[]>>(
    `performance-metrics${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const getStats = async (
  metricName?: string,
  startDate?: string,
  endDate?: string,
) => {
  const params = new URLSearchParams();
  if (metricName) params.set('metricName', metricName);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const queryString = params.toString();
  const response = await api.get<SuccessResponse<PerformanceStats>>(
    `performance-metrics/stats${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

export function useCreatePerformanceMetric() {
  return useMutation({
    mutationFn: createMetric,
  });
}

export function usePerformanceMetrics(query?: PerformanceMetricQuery) {
  return useQuery({
    queryKey: performanceMetricsKeys.list(query),
    queryFn: () => getMetrics(query),
  });
}

export function usePerformanceStats(
  metricName?: string,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: performanceMetricsKeys.stats(metricName, startDate, endDate),
    queryFn: () => getStats(metricName, startDate, endDate),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
