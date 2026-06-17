import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEffectiveTimezone, type UnitSystem } from '@varaperformance/core';
import api from '@/lib/api';
import type {
  SuccessResponse,
  ProfileResponse,
  MinimalProfileResponse,
  PublicProfileResponse,
  PartialProfile,
  CreateGymFromPlace,
} from '@varaperformance/core';

// Re-export types for convenience
export type { ProfileResponse, MinimalProfileResponse, PublicProfileResponse };

export interface ProfileAddress {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileAddressInput {
  label?: string;
  recipientName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export const profileKeys = {
  all: ['profile'] as const,
  minimal: () => [...profileKeys.all] as const,
  details: () => ['profile-details'] as const,
  publicProfile: (displayName: string) =>
    ['public-profile', displayName] as const,
  checkDisplayName: (displayName: string) =>
    ['check-display-name', displayName] as const,
  gyms: () => ['profile-gyms'] as const,
  addresses: () => ['profile-addresses'] as const,
};

// API functions - minimal profile (no PII)
const getProfile = async () => {
  const response =
    await api.get<SuccessResponse<MinimalProfileResponse>>('profile');
  return response.data;
};

// API functions - full profile with PII
const getProfileDetails = async () => {
  const response =
    await api.get<SuccessResponse<ProfileResponse>>('profile/details');
  return response.data;
};

const getPublicProfileByDisplayName = async (displayName: string) => {
  const response = await api.get<SuccessResponse<PublicProfileResponse>>(
    `profile/public/${encodeURIComponent(displayName)}`,
  );
  return response.data;
};

const saveProfile = async (data: PartialProfile) => {
  const response = await api.put<SuccessResponse<ProfileResponse>>(
    'profile',
    data,
  );
  return response.data;
};

const completeProfile = async () => {
  const response =
    await api.post<SuccessResponse<ProfileResponse>>('profile/complete');
  return response.data;
};

const checkDisplayName = async (displayName: string) => {
  const response = await api.get<SuccessResponse<{ available: boolean }>>(
    `profile/check-display-name?displayName=${encodeURIComponent(displayName)}`,
  );
  return response.data;
};

/**
 * Fetch current user's minimal profile (no PII)
 * For auth checks and header display
 */
export function useProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: profileKeys.minimal(),
    queryFn: getProfile,
    enabled: options?.enabled ?? true,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Fetch current user's full profile with PII
 * Use only when PII is needed (profile view/edit pages)
 */
export function useProfileDetails(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: profileKeys.details(),
    queryFn: getProfileDetails,
    enabled: options?.enabled ?? true,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function usePublicProfileByDisplayName(
  displayName: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: profileKeys.publicProfile(displayName),
    queryFn: () => getPublicProfileByDisplayName(displayName),
    enabled: (options?.enabled ?? true) && displayName.trim().length > 0,
    retry: false,
    staleTime: 60 * 1000,
  });
}

/**
 * Check if user's profile is completed
 * Returns { isComplete, isLoading, profile }
 */
export function useProfileCompletion(options?: { enabled?: boolean }) {
  const query = useProfile(options);

  return {
    isComplete:
      query.data?.success === true && query.data.data.completedAt !== null,
    isLoading: query.isLoading,
    profile: query.data?.success === true ? query.data.data : null,
    error: query.error,
  };
}

/**
 * Save profile data (upsert)
 */
export function useSaveProfile(options?: {
  onSuccess?: (data: SuccessResponse<ProfileResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.details() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Mark profile as completed (after wizard completion)
 */
export function useCompleteProfile(options?: {
  onSuccess?: (data: SuccessResponse<ProfileResponse>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.details() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Check if a display name is available
 * Uses debounced query - only fetches when displayName is provided and at least 1 char
 */
export function useCheckDisplayName(
  displayName: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: profileKeys.checkDisplayName(displayName),
    queryFn: () => checkDisplayName(displayName),
    enabled: (options?.enabled ?? true) && displayName.length >= 1,
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });
}

// --- Gym-related APIs ---

export interface ProfileGym {
  id: string;
  mapboxId: string | null;
  name: string;
  location: {
    address: string;
    city: string;
    state: string | null;
    country: string;
  } | null;
}

const getProfileGyms = async () => {
  const response = await api.get<SuccessResponse<ProfileGym[]>>('profile/gyms');
  return response.data;
};

const associateGyms = async (places: CreateGymFromPlace[]) => {
  const response = await api.put<SuccessResponse<{ gymIds: string[] }>>(
    'profile/gyms',
    { places },
  );
  return response.data;
};

const getProfileAddresses = async () => {
  const response =
    await api.get<SuccessResponse<{ items: ProfileAddress[] }>>(
      'profile/addresses',
    );
  return response.data;
};

const createProfileAddress = async (payload: ProfileAddressInput) => {
  const response = await api.post<SuccessResponse<{ address: ProfileAddress }>>(
    'profile/addresses',
    payload,
  );
  return response.data;
};

const updateProfileAddress = async (payload: {
  addressId: string;
  data: Partial<ProfileAddressInput>;
}) => {
  const response = await api.put<SuccessResponse<{ address: ProfileAddress }>>(
    `profile/addresses/${payload.addressId}`,
    payload.data,
  );
  return response.data;
};

const deleteProfileAddress = async (addressId: string) => {
  const response = await api.post<SuccessResponse<{ deleted: boolean }>>(
    `profile/addresses/${addressId}/delete`,
  );
  return response.data;
};

/**
 * Fetch gyms associated with current user's profile
 */
export function useProfileGyms(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: profileKeys.gyms(),
    queryFn: getProfileGyms,
    enabled: options?.enabled ?? true,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Associate gyms with profile (creates gyms if they don't exist)
 */
export function useAssociateGyms(options?: {
  onSuccess?: (data: SuccessResponse<{ gymIds: string[] }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: associateGyms,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.gyms() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useProfileAddresses(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: profileKeys.addresses(),
    queryFn: getProfileAddresses,
    enabled: options?.enabled ?? true,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProfileAddress(options?: {
  onSuccess?: (data: SuccessResponse<{ address: ProfileAddress }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProfileAddress,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.addresses() });
      queryClient.invalidateQueries({ queryKey: profileKeys.details() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useUpdateProfileAddress(options?: {
  onSuccess?: (data: SuccessResponse<{ address: ProfileAddress }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfileAddress,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.addresses() });
      queryClient.invalidateQueries({ queryKey: profileKeys.details() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useDeleteProfileAddress(options?: {
  onSuccess?: (data: SuccessResponse<{ deleted: boolean }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProfileAddress,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.addresses() });
      queryClient.invalidateQueries({ queryKey: profileKeys.details() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

// --- Avatar upload ---

const uploadAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<SuccessResponse<{ avatarUrl: string }>>(
    'profile/avatar',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return response.data;
};

/**
 * Upload a new avatar image
 */
export function useUploadAvatar(options?: {
  onSuccess?: (data: SuccessResponse<{ avatarUrl: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.details() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

// --- Cover photo upload ---

const uploadCover = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<SuccessResponse<{ coverUrl: string }>>(
    'profile/cover',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return response.data;
};

/**
 * Upload a new cover photo
 */
export function useUploadCover(options?: {
  onSuccess?: (data: SuccessResponse<{ coverUrl: string }>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadCover,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.details() });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * Get user's effective timezone from profile or browser fallback.
 * Use this in health pages for timezone-aware date formatting.
 *
 * @returns IANA timezone string (e.g., 'America/New_York')
 */
export function useTimezone(): string {
  const { data } = useProfile();
  const profileTimezone = data?.success ? data.data.timezone : null;
  return getEffectiveTimezone(profileTimezone);
}

/**
 * Get user's unit preference from profile or default to metric.
 * Use this in health pages for unit-aware display and input.
 *
 * @returns UnitSystem ('imperial' or 'metric')
 */
export function useUnitPreference(): UnitSystem {
  const { data } = useProfile();
  const unit = data?.success ? data.data.unit : null;
  return unit ?? 'metric';
}
