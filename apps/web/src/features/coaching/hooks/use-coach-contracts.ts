import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  PaginatedResponse,
  CoachContractResponse,
  CoachContractListItem,
  CoachContractVersion,
  CreateCoachContract,
  CreateCoachContractVersion,
} from '@varaperformance/core';

export const coachContractKeys = {
  all: ['coach', 'contracts'] as const,
  list: (params?: { page?: number; limit?: number; activeOnly?: boolean }) =>
    [...coachContractKeys.all, params] as const,
  detail: (id: string | null) => [...coachContractKeys.all, id] as const,
  versions: () => [...coachContractKeys.all, 'versions'] as const,
  verify: (id: string | null) =>
    [...coachContractKeys.all, id, 'verify'] as const,
};

// API functions
const getContracts = async (params?: {
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}) => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.activeOnly) searchParams.set('activeOnly', 'true');

  const queryString = searchParams.toString();
  const response = await api.get<PaginatedResponse<CoachContractListItem>>(
    `coaches/me/contracts${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const getContract = async (id: string) => {
  const response = await api.get<SuccessResponse<CoachContractResponse>>(
    `coaches/me/contracts/${id}`,
  );
  return response.data;
};

const getVersionHistory = async () => {
  const response = await api.get<SuccessResponse<CoachContractVersion[]>>(
    'coaches/me/contracts/versions',
  );
  return response.data;
};

const createContract = async (data: CreateCoachContract) => {
  const response = await api.post<SuccessResponse<CoachContractResponse>>(
    'coaches/me/contracts',
    data,
  );
  return response.data;
};

const createContractVersion = async (params: {
  id: string;
  data: CreateCoachContractVersion;
}) => {
  const response = await api.post<
    SuccessResponse<{
      contract: CoachContractResponse;
      previousVersion: string;
      message: string;
    }>
  >(`coaches/me/contracts/${params.id}/version`, params.data);
  return response.data;
};

const verifyIntegrity = async (id: string) => {
  const response = await api.get<
    SuccessResponse<{ isValid: boolean; message: string }>
  >(`coaches/me/contracts/${id}/verify`);
  return response.data;
};

// Hooks

/**
 * Get paginated list of coach contracts
 */
export function useCoachContracts(params?: {
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}) {
  return useQuery({
    queryKey: coachContractKeys.list(params),
    queryFn: () => getContracts(params),
    staleTime: 60 * 1000,
  });
}

/**
 * Get single contract by ID
 */
export function useCoachContract(id: string | null) {
  return useQuery({
    queryKey: coachContractKeys.detail(id),
    queryFn: () => getContract(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

/**
 * Get version history for contracts
 */
export function useContractVersionHistory() {
  return useQuery({
    queryKey: coachContractKeys.versions(),
    queryFn: getVersionHistory,
    staleTime: 60 * 1000,
  });
}

/**
 * Create a new contract
 */
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachContractKeys.all });
    },
  });
}

/**
 * Create a new version of an existing contract
 */
export function useCreateContractVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createContractVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachContractKeys.all });
    },
  });
}

/**
 * Verify contract integrity
 */
export function useVerifyContractIntegrity(id: string | null) {
  return useQuery({
    queryKey: coachContractKeys.verify(id),
    queryFn: () => verifyIntegrity(id!),
    enabled: !!id,
    staleTime: 0, // Always fetch fresh for integrity check
  });
}
