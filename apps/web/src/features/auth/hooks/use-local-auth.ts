import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import axios from 'axios';
import api from '@/lib/api';
import { isNativeApp } from '@/lib/capacitor';
import { setAuthTokens } from '@/lib/auth-tokens';
import {
  RegisterUserWithConsentsSchema,
  LoginUserSchema,
  VerifyUserSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  type SuccessResponse,
} from '@varaperformance/core';

// Infer types from Zod schemas
type RegisterUserWithConsentsDto = z.infer<
  typeof RegisterUserWithConsentsSchema
>;
type LoginUserDto = z.infer<typeof LoginUserSchema>;
type VerifyUserDto = z.infer<typeof VerifyUserSchema>;
type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

// Response types
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface User {
  id: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  roles?: string[];
  permissions?: string[];
  iat: number;
  exp: number;
}

// API functions
const register = async (data: RegisterUserWithConsentsDto) => {
  const response = await api.post<SuccessResponse<User>>('idm/register', data);
  return response.data;
};

const login = async (data: LoginUserDto) => {
  const response = await api.post<
    SuccessResponse<AuthTokens | { totpRequired: true }>
  >('idm/login', data);
  return response.data;
};

const verifyEmail = async (data: VerifyUserDto) => {
  const response = await api.post<SuccessResponse<User>>('idm/verify', data);
  return response.data;
};

const resendVerification = async (data: ForgotPasswordDto) => {
  const response = await api.post<SuccessResponse<null>>(
    'idm/resend-verification',
    data,
  );
  return response.data;
};

const refreshTokens = async (data?: RefreshTokenDto) => {
  const response = await api.post<SuccessResponse<AuthTokens>>(
    'idm/refresh',
    data ?? {},
  );
  return response.data;
};

const forgotPassword = async (data: ForgotPasswordDto) => {
  const response = await api.post<SuccessResponse<null>>(
    'idm/forgot-password',
    data,
  );
  return response.data;
};

const resetPassword = async (data: ResetPasswordDto) => {
  const response = await api.post<SuccessResponse<null>>(
    'idm/reset-password',
    data,
  );
  return response.data;
};

interface MeResponse {
  success: boolean;
  data: {
    user: JwtPayload;
  };
}

interface RegistrationAccessStatus {
  privateModeEnabled: boolean;
}

interface UserRegistrationCode {
  id: string;
  code: string;
  usedAt: string | null;
  usedByUserId: string | null;
  createdAt: string;
}

interface MyRegistrationCodesData {
  codes: UserRegistrationCode[];
  total: number;
  used: number;
  remaining: number;
}

const getMe = async () => {
  const response = await api.get<MeResponse>('idm/me');
  return response.data;
};

const getRegistrationAccessStatus = async () => {
  const response = await api.get<SuccessResponse<RegistrationAccessStatus>>(
    'idm/registration/access',
  );
  return response.data;
};

const validateRegistrationCode = async (code: string) => {
  const response = await api.post<
    SuccessResponse<{ valid: boolean; code: string }>
  >('idm/registration/validate-code', { code });
  return response.data;
};

const getMyRegistrationCodes = async () => {
  const response = await api.get<SuccessResponse<MyRegistrationCodesData>>(
    'idm/registration/codes',
  );
  return response.data;
};

// Hooks
export function useRegister(options?: {
  onSuccess?: (data: SuccessResponse<User>) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: register,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useLogin(options?: {
  onSuccess?: (
    data: SuccessResponse<AuthTokens | { totpRequired: true }>,
  ) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      const payload = data?.data;
      if (payload && 'accessToken' in payload && 'refreshToken' in payload) {
        if (isNativeApp()) {
          setAuthTokens({
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['me'] });
      }
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useVerifyEmail(options?: {
  onSuccess?: (data: SuccessResponse<User>) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useResendVerification(options?: {
  onSuccess?: (data: SuccessResponse<null>) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: resendVerification,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useRefreshTokens(options?: {
  onSuccess?: (data: SuccessResponse<AuthTokens>) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: refreshTokens,
    onSuccess: (data) => {
      if (
        isNativeApp() &&
        data?.data?.accessToken &&
        data?.data?.refreshToken
      ) {
        setAuthTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        });
      }
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useForgotPassword(options?: {
  onSuccess?: (data: SuccessResponse<null>) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: forgotPassword,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useResetPassword(options?: {
  onSuccess?: (data: SuccessResponse<null>) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: resetPassword,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: options?.enabled ?? true,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        // Auth failures and rate-limits should not be retried.
        if (status === 401 || status === 403 || status === 429) {
          return false;
        }
      }

      // Retry transient/network/server failures a couple times.
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false,
  });
}

export function useRegistrationAccessStatus() {
  return useQuery({
    queryKey: ['registration-access'],
    queryFn: getRegistrationAccessStatus,
  });
}

export function useValidateRegistrationCode(options?: {
  onSuccess?: (data: SuccessResponse<{ valid: boolean; code: string }>) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: validateRegistrationCode,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useMyRegistrationCodes(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['my-registration-codes'],
    queryFn: getMyRegistrationCodes,
    enabled: options?.enabled ?? true,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Clear any local state/cookies if needed
      // The browser will automatically clear httpOnly cookies on the backend
      return Promise.resolve();
    },
    onSuccess: () => {
      // Clear all cached queries
      queryClient.clear();
    },
  });
}
