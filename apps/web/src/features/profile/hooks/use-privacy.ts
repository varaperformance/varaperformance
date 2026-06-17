import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SuccessResponse } from '@varaperformance/core';

export const privacyKeys = {
  deletionEligibility: () => ['deletion-eligibility'] as const,
};

/**
 * GDPR Art. 15 & 20: Download all personal data as JSON.
 */
const exportData = async () => {
  const response =
    await api.get<SuccessResponse<Record<string, unknown>>>('privacy/export');
  return response.data;
};

/**
 * Check whether account is eligible for deletion.
 */
const fetchDeletionEligibility = async () => {
  const response = await api.get<
    SuccessResponse<{ eligible: boolean; blockers: string[] }>
  >('privacy/deletion-eligibility');
  return response.data.data;
};

/**
 * GDPR Art. 17: Delete account and all personal data.
 */
const deleteAccount = async () => {
  const response = await api.delete<SuccessResponse<{ message: string }>>(
    'privacy/account',
    { data: { confirmation: 'DELETE MY ACCOUNT' } },
  );
  return response.data;
};

/**
 * Hook to export user data (GDPR Art. 15, 20)
 */
export function useExportData() {
  return useMutation({
    mutationFn: exportData,
  });
}

/**
 * Hook to check deletion eligibility before showing the delete dialog.
 */
export function useDeletionEligibility(enabled: boolean) {
  return useQuery({
    queryKey: privacyKeys.deletionEligibility(),
    queryFn: fetchDeletionEligibility,
    enabled,
    staleTime: 0,
  });
}

/**
 * Hook to delete user account (GDPR Art. 17)
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: deleteAccount,
  });
}

/**
 * GDPR Art. 18: Restrict processing of personal data.
 */
const restrictProcessing = async () => {
  const response =
    await api.post<SuccessResponse<{ message: string; isRestricted: boolean }>>(
      'privacy/restrict',
    );
  return response.data;
};

/**
 * GDPR Art. 18: Lift restriction on processing.
 */
const unrestrictProcessing = async () => {
  const response =
    await api.post<SuccessResponse<{ message: string; isRestricted: boolean }>>(
      'privacy/unrestrict',
    );
  return response.data;
};

/**
 * Hook to restrict processing (GDPR Art. 18)
 */
export function useRestrictProcessing() {
  return useMutation({
    mutationFn: restrictProcessing,
  });
}

/**
 * Hook to unrestrict processing (GDPR Art. 18)
 */
export function useUnrestrictProcessing() {
  return useMutation({
    mutationFn: unrestrictProcessing,
  });
}
