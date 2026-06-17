import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  CoachTierSubscriptionResponse,
  CoachTierCancelEligibility,
} from '@varaperformance/core';

export const coachTierKeys = {
  all: ['coach', 'me', 'tier-subscription'] as const,
  subscription: () => [...coachTierKeys.all] as const,
  cancelEligibility: () =>
    [...coachTierKeys.all, 'cancel-eligibility'] as const,
};

// ─── API Functions ────────────────────────────────────────────

async function getTierSubscription(): Promise<CoachTierSubscriptionResponse | null> {
  const { data } = await api.get<
    SuccessResponse<CoachTierSubscriptionResponse | null>
  >('coaching/payments/tier-subscription');
  return data.data;
}

async function createTierCheckout(): Promise<{
  checkoutUrl: string;
  checkoutSessionId: string;
}> {
  const { data } = await api.post<
    SuccessResponse<{ checkoutUrl: string; checkoutSessionId: string }>
  >('coaching/payments/tier-subscription/checkout');
  return data.data;
}

async function getCancelEligibility(): Promise<CoachTierCancelEligibility> {
  const { data } = await api.get<SuccessResponse<CoachTierCancelEligibility>>(
    'coaching/payments/tier-subscription/cancel-eligibility',
  );
  return data.data;
}

async function cancelTierSubscription(): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>(
    'coaching/payments/tier-subscription/cancel',
  );
  return data;
}

// ─── Hooks ────────────────────────────────────────────────────

export function useCoachTierSubscription() {
  return useQuery({
    queryKey: coachTierKeys.subscription(),
    queryFn: getTierSubscription,
    staleTime: 60 * 1000,
  });
}

export function useCoachTierCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTierCheckout,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: coachTierKeys.all,
      });
    },
  });
}

export function useCoachTierCancelEligibility(enabled = false) {
  return useQuery({
    queryKey: coachTierKeys.cancelEligibility(),
    queryFn: getCancelEligibility,
    staleTime: 30 * 1000,
    enabled,
  });
}

export function useCancelCoachTierSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelTierSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: coachTierKeys.all,
      });
    },
  });
}
