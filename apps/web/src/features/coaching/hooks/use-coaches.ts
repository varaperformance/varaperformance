import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApplyCoachApplication,
  CreateCoachReview,
  CreateCoachPackage,
  SuccessResponse,
  ErrorResponse,
  CoachResponse,
  CoachListData,
  CoachListItem,
  CoachFilters,
  CoachPackageResponse,
  CoachReviewsData,
  CoachingContractResponse,
  ContractSignatureResponse,
  BookingPaymentResult,
  UpdateCoachPackage,
  UserBookingsListData,
} from '@varaperformance/core';

// Re-export types for convenience
export type {
  CoachResponse,
  CoachCertification,
  CreateCoachReview,
  CoachListData,
  CoachListItem,
  CoachFilters,
  CoachPackageResponse,
  CoachReviewResponse,
  CoachReviewsData,
  CoachSpecialty,
  BillingCycle,
  CoachingContractResponse,
  ContractSignatureResponse,
  BookingPaymentResult,
  UserBookingsListData,
  UserBookingResponse,
} from '@varaperformance/core';

export const coachKeys = {
  all: ['coaches'] as const,
  list: (filters?: CoachFilters) => [...coachKeys.all, filters] as const,
  featured: (limit?: number) => [...coachKeys.all, 'featured', limit] as const,
  detail: (slug: string | undefined) => ['coach', slug] as const,
  reviews: (coachId: string | undefined, page: number, limit: number) =>
    ['coach', coachId, 'reviews', page, limit] as const,
  reviewsPrefix: (coachId: string) => ['coach', coachId, 'reviews'] as const,
  contract: (coachId: string | undefined) =>
    ['coach', coachId, 'contract'] as const,
  mePackages: () => ['coach', 'me', 'packages'] as const,
  me: () => ['coach', 'me'] as const,
  coachPrefix: ['coach'] as const,
  bookings: ['bookings'] as const,
  myCoaches: ['my-coaches'] as const,
  userBookings: ['user-bookings'] as const,
};

// API functions
const getCoaches = async (filters?: CoachFilters) => {
  const params = new URLSearchParams();

  if (filters?.specialty) params.set('specialty', filters.specialty);
  if (filters?.available !== undefined)
    params.set('available', String(filters.available));
  if (filters?.featured !== undefined)
    params.set('featured', String(filters.featured));
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);

  const queryString = params.toString();
  const response = await api.get<SuccessResponse<CoachListData>>(
    `coaches${queryString ? `?${queryString}` : ''}`,
  );
  return response.data;
};

const getCoachBySlug = async (slug: string) => {
  const response = await api.get<SuccessResponse<CoachResponse>>(
    `coaches/${slug}`,
  );
  return response.data;
};

const getFeaturedCoaches = async (limit?: number) => {
  const params = limit ? `?limit=${limit}` : '';
  const response = await api.get<SuccessResponse<CoachListItem[]>>(
    `coaches/featured${params}`,
  );
  return response.data;
};

const getCoachReviews = async (coachId: string, page = 1, limit = 10) => {
  const response = await api.get<SuccessResponse<CoachReviewsData>>(
    `coaches/${coachId}/reviews?page=${page}&limit=${limit}`,
  );
  return response.data;
};

const createCoachReview = async ({
  coachId,
  data,
}: {
  coachId: string;
  data: CreateCoachReview;
}) => {
  const response = await api.post<SuccessResponse>(
    `coaches/${coachId}/reviews`,
    data,
  );
  return response.data;
};

const getCoachContract = async (coachId: string) => {
  const response = await api.get<SuccessResponse<CoachingContractResponse>>(
    `coaches/${coachId}/contract`,
  );
  return response.data;
};

const getMyCoachPackages = async () => {
  const response =
    await api.get<SuccessResponse<CoachPackageResponse[]>>(
      `coaches/me/packages`,
    );
  return response.data;
};

const signContract = async (params: {
  bookingId: string;
  contractId: string;
  signature: string;
}) => {
  const response = await api.post<SuccessResponse<ContractSignatureResponse>>(
    `coaches/contracts/sign`,
    params,
  );
  return response.data;
};

const applyAsCoach = async (data: ApplyCoachApplication) => {
  const response = await api.post<SuccessResponse>(`coaches/apply`, data);
  return response.data;
};

const uploadCoachCertificationPhoto = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<SuccessResponse<{ photoUrl: string }>>(
    `coaches/apply/certification-photo`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
};

const createMyCoachPackage = async (data: CreateCoachPackage) => {
  const response = await api.post<SuccessResponse<CoachPackageResponse>>(
    `coaches/me/packages`,
    data,
  );
  return response.data;
};

const updateMyCoachPackage = async ({
  packageId,
  data,
}: {
  packageId: string;
  data: UpdateCoachPackage;
}) => {
  const response = await api.patch<SuccessResponse<CoachPackageResponse>>(
    `coaches/me/packages/${packageId}`,
    data,
  );
  return response.data;
};

const archiveMyCoachPackage = async (packageId: string) => {
  const response = await api.patch<SuccessResponse<CoachPackageResponse>>(
    `coaches/me/packages/${packageId}/archive`,
  );
  return response.data;
};

const deleteMyCoachPackage = async (packageId: string) => {
  const response = await api.delete<
    SuccessResponse<{ deleted: true; packageId: string }> | ErrorResponse
  >(`coaches/me/packages/${packageId}`);
  return response.data;
};

const initiateBookingPayment = async (params: {
  coachId: string;
  packageId: string;
  paymentMethodId?: string;
  intake?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    goals?: string;
    experience?: string;
    injuries?: string;
  };
}) => {
  const response = await api.post<SuccessResponse<BookingPaymentResult>>(
    `coaching/payments/initiate`,
    params,
  );
  return response.data;
};

const completeBookingPayment = async (bookingId: string) => {
  const response = await api.post<
    SuccessResponse<{
      paymentProvider: 'STRIPE';
      checkoutUrl?: string;
    }>
  >(`coaching/payments/bookings/${bookingId}/pay`);
  return response.data;
};

/**
 * Fetch coaches with optional filters
 */
export function useCoaches(filters?: CoachFilters) {
  return useQuery({
    queryKey: coachKeys.list(filters),
    queryFn: () => getCoaches(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch a single coach by slug (profile displayName)
 */
export function useCoach(slug: string | undefined) {
  return useQuery({
    queryKey: coachKeys.detail(slug),
    queryFn: () => getCoachBySlug(slug!),
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch featured coaches for homepage
 */
export function useFeaturedCoaches(limit?: number) {
  return useQuery({
    queryKey: coachKeys.featured(limit),
    queryFn: () => getFeaturedCoaches(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes - featured don't change often
  });
}

/**
 * Fetch reviews for a specific coach
 */
export function useCoachReviews(
  coachId: string | undefined,
  page = 1,
  limit = 10,
) {
  return useQuery({
    queryKey: coachKeys.reviews(coachId, page, limit),
    queryFn: () => getCoachReviews(coachId!, page, limit),
    enabled: !!coachId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Create or update the authenticated user's review for a coach
 */
export function useCreateCoachReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCoachReview,
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: coachKeys.reviewsPrefix(variables.coachId),
      });
      queryClient.invalidateQueries({ queryKey: coachKeys.coachPrefix });
      queryClient.invalidateQueries({ queryKey: coachKeys.all });
    },
  });
}

/**
 * Fetch active contract for a coach
 */
export function useCoachContract(coachId: string | undefined) {
  return useQuery({
    queryKey: coachKeys.contract(coachId),
    queryFn: () => getCoachContract(coachId!),
    enabled: !!coachId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch logged-in coach's packages
 */
export function useMyCoachPackages() {
  return useQuery({
    queryKey: coachKeys.mePackages(),
    queryFn: getMyCoachPackages,
    staleTime: 60 * 1000,
  });
}

/**
 * Sign a contract for a booking
 */
export function useSignContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachKeys.bookings });
    },
  });
}

/**
 * Initiate a booking payment with subscription
 */
export function useInitiateBookingPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: initiateBookingPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachKeys.bookings });
    },
  });
}

/**
 * Complete payment for an approved booking
 */
export function useCompleteBookingPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeBookingPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachKeys.bookings });
      queryClient.invalidateQueries({ queryKey: coachKeys.myCoaches });
    },
  });
}

/**
 * Submit coach application for authenticated user
 */
export function useApplyCoach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyAsCoach,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin', 'coaches'] });
    },
  });
}

/**
 * Upload a coach certification photo and return a local uploads URL
 */
export function useUploadCoachCertificationPhoto() {
  return useMutation({
    mutationFn: uploadCoachCertificationPhoto,
  });
}

/**
 * Create package for logged-in coach
 */
export function useCreateMyCoachPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMyCoachPackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachKeys.mePackages() });
      queryClient.invalidateQueries({ queryKey: coachKeys.me() });
      queryClient.invalidateQueries({ queryKey: coachKeys.all });
    },
  });
}

/**
 * Update package for logged-in coach
 */
export function useUpdateMyCoachPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMyCoachPackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachKeys.mePackages() });
      queryClient.invalidateQueries({ queryKey: coachKeys.me() });
      queryClient.invalidateQueries({ queryKey: coachKeys.all });
    },
  });
}

/**
 * Archive package for logged-in coach
 */
export function useArchiveMyCoachPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveMyCoachPackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachKeys.mePackages() });
      queryClient.invalidateQueries({ queryKey: coachKeys.me() });
      queryClient.invalidateQueries({ queryKey: coachKeys.all });
    },
  });
}

/**
 * Permanently delete package for logged-in coach
 */
export function useDeleteMyCoachPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMyCoachPackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachKeys.mePackages() });
      queryClient.invalidateQueries({ queryKey: coachKeys.me() });
      queryClient.invalidateQueries({ queryKey: coachKeys.all });
    },
  });
}

/**
 * Format price from cents to display string
 */
export function formatPrice(
  priceInCents: number,
  billingCycle: string = 'MONTHLY',
): string {
  const dollars = priceInCents / 100;
  const cycleLabel =
    billingCycle === 'MONTHLY'
      ? '/month'
      : billingCycle === 'QUARTERLY'
        ? '/quarter'
        : '/year';
  return `$${dollars}${cycleLabel}`;
}

/**
 * Get specialty label and color for display
 */
export const specialtyConfig: Record<string, { label: string; color: string }> =
  {
    STRENGTH: { label: 'Strength', color: 'bg-red-500/10 text-red-500' },
    BODYBUILDING: {
      label: 'Bodybuilding',
      color: 'bg-purple-500/10 text-purple-500',
    },
    POWERLIFTING: {
      label: 'Powerlifting',
      color: 'bg-orange-500/10 text-orange-500',
    },
    CROSSFIT: { label: 'CrossFit', color: 'bg-blue-500/10 text-blue-500' },
    NUTRITION: { label: 'Nutrition', color: 'bg-green-500/10 text-green-500' },
    MOBILITY: { label: 'Mobility', color: 'bg-cyan-500/10 text-cyan-500' },
    ENDURANCE: {
      label: 'Endurance',
      color: 'bg-yellow-500/10 text-yellow-500',
    },
  };

// ============================================
// User Bookings API
// ============================================

const getUserBookings = async () => {
  const response = await api.get<SuccessResponse<UserBookingsListData>>(
    `coaching/payments/bookings`,
  );
  return response.data;
};

const cancelUserBooking = async (params: {
  bookingId: string;
  reason?: string;
}) => {
  const response = await api.post<SuccessResponse<null>>(
    `coaching/payments/bookings/${params.bookingId}/cancel`,
    { reason: params.reason },
  );
  return response.data;
};

/**
 * Fetch user's coaching bookings
 */
export function useUserBookings() {
  return useQuery({
    queryKey: coachKeys.userBookings,
    queryFn: getUserBookings,
    staleTime: 60 * 1000,
  });
}

/**
 * Cancel a user booking
 */
export function useCancelUserBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelUserBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coachKeys.userBookings });
    },
  });
}
