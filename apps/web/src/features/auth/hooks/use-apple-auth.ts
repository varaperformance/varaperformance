import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { isNativeApp } from '@/lib/capacitor';
import { setAuthTokens } from '@/lib/auth-tokens';
import { SocialLogin } from '@capgo/capacitor-social-login';
import type { SuccessResponse } from '@varaperformance/core';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  needsConsent?: boolean;
  totpRequired?: true;
  oauthSessionToken?: string;
}

interface AppleNamePayload {
  firstName?: string;
  lastName?: string;
}

interface AppleUserPayload {
  email?: string;
  name?: AppleNamePayload;
}

const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID;
const APPLE_REDIRECT_URI = import.meta.env.VITE_APPLE_REDIRECT_URI;
const APPLE_SCOPE = import.meta.env.VITE_APPLE_SCOPE ?? 'name email';

let nativeAppleInitialized = false;
let appleScriptLoadingPromise: Promise<void> | null = null;
let appleWebInitialized = false;

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (options: {
          clientId: string;
          scope?: string;
          redirectURI?: string;
          state?: string;
          nonce?: string;
          usePopup?: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization?: {
            code?: string;
            id_token?: string;
          };
          user?: {
            email?: string;
            name?: {
              firstName?: string;
              lastName?: string;
            };
          };
        }>;
      };
    };
  }
}

const appleLogin = async ({
  identityToken,
  authorizationCode,
  user,
  registrationCode,
  dateOfBirth,
}: {
  identityToken: string;
  authorizationCode?: string;
  user?: AppleUserPayload;
  registrationCode?: string;
  dateOfBirth?: string;
}) => {
  const response = await api.post<SuccessResponse<AuthTokens>>(
    'idm/oauth/apple',
    {
      identityToken,
      authorizationCode,
      user,
      registrationCode,
      dateOfBirth,
    },
  );

  return response.data;
};

async function loadAppleScript(): Promise<void> {
  if (window.AppleID?.auth) {
    return;
  }

  if (appleScriptLoadingPromise) {
    return appleScriptLoadingPromise;
  }

  appleScriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"]',
    );

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Apple Sign-In script')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src =
      'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Apple Sign-In script'));
    document.head.appendChild(script);
  });

  return appleScriptLoadingPromise;
}

async function ensureAppleReady(): Promise<boolean> {
  if (!APPLE_CLIENT_ID) {
    console.warn('Apple Client ID is missing. Apple sign-in is disabled.');
    return false;
  }

  if (isNativeApp()) {
    if (nativeAppleInitialized) {
      return true;
    }

    try {
      await SocialLogin.initialize({
        apple: {
          clientId: APPLE_CLIENT_ID,
          redirectUrl: APPLE_REDIRECT_URI,
        },
      } as never);
      nativeAppleInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize native Apple auth:', error);
      return false;
    }
  }

  if (!APPLE_REDIRECT_URI) {
    console.warn(
      'Apple redirect URI is missing. Apple web sign-in is disabled.',
    );
    return false;
  }

  try {
    await loadAppleScript();
    if (!window.AppleID?.auth) {
      throw new Error('Apple Sign-In script loaded without AppleID.auth');
    }

    if (!appleWebInitialized) {
      window.AppleID.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: APPLE_SCOPE,
        redirectURI: APPLE_REDIRECT_URI,
        usePopup: true,
      });
      appleWebInitialized = true;
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize web Apple auth:', error);
    return false;
  }
}

export function useAppleAuth(options?: {
  onSuccess?: (data: SuccessResponse<AuthTokens>) => void;
  onNeedsConsent?: () => void;
  onTotpRequired?: (oauthSessionToken: string) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  const mutation = useMutation({
    mutationFn: appleLogin,
    onSuccess: async (data) => {
      // TOTP 2FA required — hand off to the login page's TOTP dialog
      if (data?.data?.totpRequired && data.data.oauthSessionToken) {
        optionsRef.current?.onTotpRequired?.(data.data.oauthSessionToken);
        return;
      }

      if (isNativeApp()) {
        const accessToken = data?.data?.accessToken;
        const refreshToken = data?.data?.refreshToken;

        if (!accessToken || !refreshToken) {
          throw new Error(
            'Native Apple auth response missing tokens. Backend may still be serving cookie mode.',
          );
        }

        setAuthTokens({ accessToken, refreshToken });
      }

      await queryClient.fetchQuery({
        queryKey: ['me'],
        queryFn: async () => {
          const response = await api.get('idm/me');
          return response.data;
        },
        staleTime: 0,
      });

      await queryClient
        .fetchQuery({
          queryKey: ['profile'],
          queryFn: async () => {
            const response = await api.get('profile');
            return response.data;
          },
          staleTime: 0,
        })
        .catch(() => {
          // Profile can be absent for newly provisioned OAuth users.
        });

      if (data.data?.needsConsent) {
        optionsRef.current?.onNeedsConsent?.();
      } else {
        optionsRef.current?.onSuccess?.(data);
      }
    },
    onError: (error) => optionsRef.current?.onError?.(error),
  });

  useEffect(() => {
    ensureAppleReady().then((ready) => setIsReady(ready));
  }, []);

  const signInWithApple = useCallback(
    async (opts?: { registrationCode?: string; dateOfBirth?: string }) => {
      const ready = await ensureAppleReady();
      if (!ready) {
        throw new Error('Apple sign-in is not configured');
      }

      if (isNativeApp()) {
        const loginResponse = await SocialLogin.login({
          provider: 'apple',
          options: {
            scopes: ['email', 'name'],
          },
        });

        const nativeIdentityToken = (
          loginResponse as { result?: { idToken?: string } }
        )?.result?.idToken;

        if (!nativeIdentityToken) {
          throw new Error(
            'Apple native sign-in did not return an identity token',
          );
        }

        await mutation.mutateAsync({
          identityToken: nativeIdentityToken,
          registrationCode: opts?.registrationCode,
          dateOfBirth: opts?.dateOfBirth,
        });

        return;
      }

      const appleAuth = window.AppleID?.auth;
      if (!appleAuth) {
        throw new Error('Apple Identity JS is not available in browser');
      }

      const result = await appleAuth.signIn();
      const identityToken = result.authorization?.id_token;
      const authorizationCode = result.authorization?.code;

      if (!identityToken) {
        throw new Error('Apple sign-in did not return an identity token');
      }

      await mutation.mutateAsync({
        identityToken,
        authorizationCode,
        user: result.user,
        registrationCode: opts?.registrationCode,
        dateOfBirth: opts?.dateOfBirth,
      });
    },
    [mutation],
  );

  return {
    signInWithApple,
    isNativePlatform: isNativeApp(),
    isLoading: mutation.isPending,
    isReady,
    isError: mutation.isError,
    error: mutation.error,
  };
}
