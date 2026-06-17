import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  ErrorResponse,
  CoachResponse,
} from '@varaperformance/core';

// Dashboard stats type
export interface CoachDashboardStats {
  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;
  clientGrowthPercent: number;
  totalRevenueCents: number;
  monthlyRevenueCents: number;
  revenueChangePercent: number;
  avgRating: number;
  reviewCount: number;
}

// Client data from coach perspective
export interface CoachClient {
  bookingId: string;
  referenceCode: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  package: {
    id: string;
    name: string;
    priceInCents: number;
    billingCycle: string;
  };
  subscription: {
    id: string;
    status: string;
    stripeSubscriptionId: string | null;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelledAt: string | null;
    scheduledCancellationAt: string | null;
  } | null;
}

export interface CoachClientsData {
  clients: CoachClient[];
  total: number;
  page: number;
  limit: number;
}

// Client details with intake questionnaire
export interface ClientIntake {
  firstName?: string;
  lastName?: string;
  phone?: string;
  goals?: string;
  experience?: string;
  injuries?: string;
}

export interface ContractSignatureInfo {
  id: string;
  signedAt: string;
  signatureAlgorithm: string;
  userSignatureInput: string | null;
  contractVersion: string;
  contractTitle: string;
  isVerified: boolean;
  verificationMessage: string;
}

export interface ClientDetails extends CoachClient {
  intake: ClientIntake | null;
  contractSignature: ContractSignatureInfo | null;
}

export interface ClientMetrics {
  bookingId: string;
  userId: string;
  window: {
    days: number;
    since: string;
  };
  summary: {
    workoutSessions: number;
    foodEntries: number;
    weightEntries: number;
    waterEntries: number;
    totalCalories: number;
    totalWaterOunces: number;
    latestWeight: {
      value: number;
      unit: 'LB' | 'KG';
      loggedAt: string;
    } | null;
    weightChange: {
      value: number;
      unit: 'LB' | 'KG';
    } | null;
  };
  workoutLogs: Array<{
    id: string;
    title: string | null;
    startedAt: string;
    endedAt: string | null;
    durationMinutes: number | null;
    exerciseCount: number;
    setCount: number;
    exercises: string[];
  }>;
  foodDiary: Array<{
    id: string;
    loggedAt: string;
    mealType: string;
    name: string;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  weightLogs: Array<{
    id: string;
    loggedAt: string;
    value: number;
    unit: 'LB' | 'KG';
    bodyFat: number | null;
    muscleMass: number | null;
  }>;
  waterLogs: Array<{
    id: string;
    loggedAt: string;
    amount: number;
    unit: 'OZ' | 'ML' | 'L' | 'CUPS';
    amountOunces: number;
  }>;
}

// Monthly revenue data for charts
export interface MonthlyRevenueData {
  month: string;
  year: number;
  revenueCents: number;
  clientCount: number;
}

export interface StripeConnectStatus {
  stripeAccountId: string | null;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export interface CoachClientAnalytics {
  totalActiveClients: number;
  periodDays: number;
  workoutConsistency: Array<{
    displayName: string;
    workouts: number;
    foodEntries: number;
  }>;
  averageWorkoutsPerWeek: number;
  averageFoodEntriesPerDay: number;
  clientsLoggingWorkouts: number;
  clientsLoggingFood: number;
  clientsLoggingWeight: number;
}

// Activity timeline types
export interface ActivityTimelineEvent {
  id: string;
  type: 'workout' | 'nutrition' | 'weight' | 'habit' | 'pr' | 'achievement';
  timestamp: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface ClientActivityTimeline {
  bookingId: string;
  periodDays: number;
  events: ActivityTimelineEvent[];
}

export const coachDashboardKeys = {
  me: ['coach', 'me'] as const,
  dashboard: () => [...coachDashboardKeys.me, 'dashboard'] as const,
  clientsPrefix: () => [...coachDashboardKeys.me, 'clients'] as const,
  clients: (params?: { status?: string; page?: number; limit?: number }) =>
    [...coachDashboardKeys.me, 'clients', params] as const,
  clientDetail: (bookingId: string | null) =>
    [...coachDashboardKeys.me, 'clients', bookingId] as const,
  clientMetrics: (bookingId: string | null, days: number) =>
    [...coachDashboardKeys.me, 'clients', bookingId, 'metrics', days] as const,
  clientActivity: (bookingId: string | null, days: number, limit: number) =>
    [
      ...coachDashboardKeys.me,
      'clients',
      bookingId,
      'activity',
      days,
      limit,
    ] as const,
  stripeConnect: () => [...coachDashboardKeys.me, 'stripe-connect'] as const,
  revenue: (months: number) =>
    [...coachDashboardKeys.me, 'revenue', months] as const,
  analytics: (days: number) =>
    [...coachDashboardKeys.me, 'analytics', days] as const,
};

// API functions
const getMyCoachProfile = async () => {
  const response = await api.get<SuccessResponse<CoachResponse>>('coaches/me');
  return response.data;
};

const getDashboardStats = async () => {
  const response = await api.get<SuccessResponse<CoachDashboardStats>>(
    'coaches/me/dashboard',
  );
  return response.data;
};

const getMyClients = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const queryString = searchParams.toString();
  const response = await api.get<SuccessResponse<CoachClientsData>>(
    `coaches/me/clients${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const getRevenueHistory = async (months = 6) => {
  const response = await api.get<SuccessResponse<MonthlyRevenueData[]>>(
    `coaches/me/revenue?months=${months}`,
  );
  return response.data;
};

const getClientDetails = async (bookingId: string) => {
  const response = await api.get<SuccessResponse<ClientDetails>>(
    `coaches/me/clients/${bookingId}`,
  );
  return response.data;
};

const getClientMetrics = async (bookingId: string, days = 30) => {
  const response = await api.get<
    SuccessResponse<ClientMetrics> | ErrorResponse
  >(`coaches/me/clients/${bookingId}/metrics?days=${days}`);
  return response.data;
};

// Booking management
const updateBookingStatus = async (params: {
  bookingId: string;
  status: 'APPROVED' | 'COMPLETED' | 'CANCELLED';
}) => {
  const response = await api.patch<
    SuccessResponse<{ bookingId: string; status: string }>
  >(`coaches/me/clients/${params.bookingId}/status`, { status: params.status });
  return response.data;
};

const updateCoachAvailability = async (isAvailable: boolean) => {
  const response = await api.patch<SuccessResponse<{ isAvailable: boolean }>>(
    'coaches/me/availability',
    { isAvailable },
  );
  return response.data;
};

const getStripeConnectStatus = async () => {
  const response = await api.get<SuccessResponse<StripeConnectStatus>>(
    'coaching/payments/stripe/connect/status',
  );
  return response.data;
};

const createStripeOnboardingLink = async (params?: {
  returnUrl?: string;
  refreshUrl?: string;
}) => {
  const response = await api.post<SuccessResponse<{ url: string }>>(
    'coaching/payments/stripe/connect/onboarding-link',
    params ?? {},
  );
  return response.data;
};

const disconnectStripeConnect = async () => {
  const response = await api.post<SuccessResponse<{ disconnected: boolean }>>(
    'coaching/payments/stripe/connect/disconnect',
  );
  return response.data;
};

// Subscription management
const pauseSubscription = async (subscriptionId: string) => {
  const response = await api.post<SuccessResponse<null>>(
    `coaching/payments/subscriptions/${subscriptionId}/pause`,
  );
  return response.data;
};

const resumeSubscription = async (subscriptionId: string) => {
  const response = await api.post<SuccessResponse<null>>(
    `coaching/payments/subscriptions/${subscriptionId}/resume`,
  );
  return response.data;
};

const cancelSubscription = async (subscriptionId: string) => {
  const response = await api.post<SuccessResponse<null>>(
    `coaching/payments/subscriptions/${subscriptionId}/cancel`,
  );
  return response.data;
};

const getClientAnalytics = async (days = 30) => {
  const response = await api.get<
    SuccessResponse<CoachClientAnalytics> | ErrorResponse
  >(`coaches/me/analytics?days=${days}`);
  return response.data;
};

const getClientActivityTimeline = async (
  bookingId: string,
  days = 30,
  limit = 50,
) => {
  const response = await api.get<
    SuccessResponse<ClientActivityTimeline> | ErrorResponse
  >(`coaches/me/clients/${bookingId}/activity?days=${days}&limit=${limit}`);
  return response.data;
};

const exportClientsCsv = async () => {
  const response = await api.get<
    SuccessResponse<{ csv: string }> | ErrorResponse
  >('coaches/me/clients/export');
  return response.data;
};

// Hooks

/**
 * Get current user's coach profile
 */
export function useMyCoachProfile() {
  return useQuery({
    queryKey: coachDashboardKeys.me,
    queryFn: getMyCoachProfile,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get coach dashboard stats
 */
export function useCoachDashboard() {
  return useQuery({
    queryKey: coachDashboardKeys.dashboard(),
    queryFn: getDashboardStats,
    staleTime: 60 * 1000, // 1 minute - stats can change
  });
}

/**
 * Get coach's clients
 */
export function useCoachClients(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: coachDashboardKeys.clients(params),
    queryFn: () => getMyClients(params),
    staleTime: 60 * 1000,
  });
}

/**
 * Get client details including intake form
 */
export function useClientDetails(bookingId: string | null) {
  return useQuery({
    queryKey: coachDashboardKeys.clientDetail(bookingId),
    queryFn: () => getClientDetails(bookingId!),
    enabled: !!bookingId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get active-subscription client metrics for coach view
 */
export function useClientMetrics(bookingId: string | null, days = 30) {
  return useQuery({
    queryKey: coachDashboardKeys.clientMetrics(bookingId, days),
    queryFn: () => getClientMetrics(bookingId!, days),
    enabled: !!bookingId,
    staleTime: 60 * 1000,
    retry: false,
  });
}

/**
 * Update booking status (confirm, complete, cancel)
 */
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBookingStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: coachDashboardKeys.clientsPrefix(),
      });
      queryClient.invalidateQueries({
        queryKey: coachDashboardKeys.dashboard(),
      });
    },
  });
}

/**
 * Toggle coach availability state
 */
export function useUpdateCoachAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCoachAvailability,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachDashboardKeys.me });
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
    },
  });
}

/**
 * Get Stripe Connect onboarding/account status for coach payouts
 */
export function useStripeConnectStatus() {
  return useQuery({
    queryKey: coachDashboardKeys.stripeConnect(),
    queryFn: getStripeConnectStatus,
    staleTime: 60 * 1000,
  });
}

/**
 * Create Stripe Connect onboarding link
 */
export function useCreateStripeOnboardingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStripeOnboardingLink,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: coachDashboardKeys.stripeConnect(),
      });
    },
  });
}

/**
 * Disconnect/delete coach Stripe Connect account
 */
export function useDisconnectStripeConnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectStripeConnect,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: coachDashboardKeys.stripeConnect(),
      });
      queryClient.invalidateQueries({ queryKey: coachDashboardKeys.me });
    },
  });
}

/**
 * Get coach revenue history for charts
 */
export function useCoachRevenueHistory(months = 6) {
  return useQuery({
    queryKey: coachDashboardKeys.revenue(months),
    queryFn: () => getRevenueHistory(months),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Pause a client's subscription
 */
export function usePauseSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pauseSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: coachDashboardKeys.clientsPrefix(),
      });
      queryClient.invalidateQueries({
        queryKey: coachDashboardKeys.dashboard(),
      });
    },
  });
}

/**
 * Resume a client's subscription
 */
export function useResumeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: coachDashboardKeys.clientsPrefix(),
      });
      queryClient.invalidateQueries({
        queryKey: coachDashboardKeys.dashboard(),
      });
    },
  });
}

/**
 * Cancel a client's subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: coachDashboardKeys.clientsPrefix(),
      });
      queryClient.invalidateQueries({
        queryKey: coachDashboardKeys.dashboard(),
      });
    },
  });
}

/**
 * Get aggregate client analytics for coach dashboard
 */
export function useCoachClientAnalytics(days = 30) {
  return useQuery({
    queryKey: coachDashboardKeys.analytics(days),
    queryFn: () => getClientAnalytics(days),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Export client list as CSV
 */
export function useExportClientsCsv() {
  return useMutation({
    mutationFn: exportClientsCsv,
  });
}

/**
 * Get client activity timeline for coach view
 */
export function useClientActivityTimeline(
  bookingId: string | null,
  days = 30,
  limit = 50,
) {
  return useQuery({
    queryKey: coachDashboardKeys.clientActivity(bookingId, days, limit),
    queryFn: () => getClientActivityTimeline(bookingId!, days, limit),
    enabled: !!bookingId,
    staleTime: 60 * 1000,
  });
}
