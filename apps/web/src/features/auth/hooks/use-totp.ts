import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SuccessResponse } from '@varaperformance/core';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TotpStatusData {
  totpEnabled: boolean;
  hasPassword: boolean;
}

interface TotpSetupData {
  secret: string;
  qrCodeDataUrl: string;
  uri: string;
}

interface TotpVerifyData {
  recoveryCodes: string[];
}

// ─── Query keys ─────────────────────────────────────────────────────────────

export const totpKeys = {
  status: ['totp', 'status'] as const,
};

// ─── API functions ──────────────────────────────────────────────────────────

const getTotpStatus = async () => {
  const response =
    await api.get<SuccessResponse<TotpStatusData>>('idm/totp/status');
  return response.data;
};

const setupTotp = async () => {
  const response =
    await api.post<SuccessResponse<TotpSetupData>>('idm/totp/setup');
  return response.data;
};

const verifyTotp = async (token: string) => {
  const response = await api.post<SuccessResponse<TotpVerifyData>>(
    'idm/totp/verify',
    { token },
  );
  return response.data;
};

const disableTotp = async (body: { password?: string; totpToken?: string }) => {
  const response = await api.post<SuccessResponse<null>>(
    'idm/totp/disable',
    body,
  );
  return response.data;
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useTotpStatus() {
  return useQuery({
    queryKey: totpKeys.status,
    queryFn: getTotpStatus,
    select: (data) => data.data,
  });
}

export function useTotpSetup(options?: {
  onSuccess?: (data: SuccessResponse<TotpSetupData>) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: setupTotp,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useTotpVerify(options?: {
  onSuccess?: (data: SuccessResponse<TotpVerifyData>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyTotp,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: totpKeys.status });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useTotpDisable(options?: {
  onSuccess?: (data: SuccessResponse<null>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disableTotp,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: totpKeys.status });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}
