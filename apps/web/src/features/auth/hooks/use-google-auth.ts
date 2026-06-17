import { useEffect, useCallback, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getCapacitorPlatform, isNativeApp } from '@/lib/capacitor';
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

const GOOGLE_WEB_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ??
  import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID ?? GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_SERVER_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_IOS_SERVER_CLIENT_ID ?? GOOGLE_WEB_CLIENT_ID;

let socialLoginInitialized = false;

let gisInitialized = false;
let gisScriptLoadingPromise: Promise<void> | null = null;

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            ux_mode?: 'popup' | 'redirect';
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              size?: 'large' | 'medium' | 'small';
              width?: number | string;
            },
          ) => void;
          prompt: (notification?: (value: unknown) => void) => void;
        };
      };
    };
  }
}

type GooglePlatform = 'web' | 'ios' | 'android';

function getGooglePlatform(): GooglePlatform {
  const platform = getCapacitorPlatform();
  if (platform === 'ios' || platform === 'android') {
    return platform;
  }
  return 'web';
}

const googleLogin = async ({
  idToken,
  registrationCode,
  dateOfBirth,
}: {
  idToken: string;
  registrationCode?: string;
  dateOfBirth?: string;
}) => {
  const platform = getGooglePlatform();
  const response = await api.post<SuccessResponse<AuthTokens>>(
    'idm/oauth/google',
    {
      idToken,
      platform,
      registrationCode,
      dateOfBirth,
    },
  );
  return response.data;
};

async function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return;
  }

  if (gisScriptLoadingPromise) {
    return gisScriptLoadingPromise;
  }

  gisScriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Identity script')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity script'));
    document.head.appendChild(script);
  });

  return gisScriptLoadingPromise;
}

async function ensureGoogleInitialized(
  onWebCredential?: (credential: string) => Promise<void>,
): Promise<boolean> {
  if (socialLoginInitialized) {
    return true;
  }

  if (!GOOGLE_WEB_CLIENT_ID) {
    console.warn(
      'Google Web Client ID is missing. Google sign-in is disabled.',
    );
    return false;
  }

  if (isNativeApp() && !GOOGLE_IOS_CLIENT_ID) {
    console.warn(
      'Google iOS Client ID is missing. Native Google sign-in is disabled.',
    );
    return false;
  }

  if (!isNativeApp()) {
    try {
      await loadGoogleIdentityScript();
      if (!window.google?.accounts?.id) {
        throw new Error('Google Identity script loaded without accounts.id');
      }

      if (onWebCredential && !gisInitialized) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          ux_mode: 'popup',
          callback: async (response) => {
            if (!response.credential) {
              return;
            }
            await onWebCredential(response.credential);
          },
        });
        gisInitialized = true;
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize web Google auth:', error);
      return false;
    }
  }

  try {
    await SocialLogin.initialize({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iOSClientId: GOOGLE_IOS_CLIENT_ID,
        iOSServerClientId: GOOGLE_IOS_SERVER_CLIENT_ID,
        mode: 'online',
      },
    });
    socialLoginInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize Google auth:', error);
    return false;
  }
}

export function useGoogleAuth(options?: {
  onSuccess?: (data: SuccessResponse<AuthTokens>) => void;
  onNeedsConsent?: () => void;
  onTotpRequired?: (oauthSessionToken: string) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const nativePlatform = isNativeApp();
  const [isReady, setIsReady] = useState(socialLoginInitialized);
  const registrationCodeRef = useRef<string | undefined>(undefined);
  const dateOfBirthRef = useRef<string | undefined>(undefined);
  const webSignInResolveRef = useRef<(() => void) | null>(null);
  const webSignInRejectRef = useRef<((error: Error) => void) | null>(null);

  // Use ref to always have access to latest options callbacks
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const mutation = useMutation({
    mutationFn: googleLogin,
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
            'Native auth response missing tokens. Backend rollout may still be serving browser cookie mode.',
          );
        }

        setAuthTokens({
          accessToken,
          refreshToken,
        });
      }

      // Explicitly fetch and cache the user data before navigating
      // This ensures AuthProvider has the authenticated state
      await queryClient.fetchQuery({
        queryKey: ['me'],
        queryFn: async () => {
          const response = await api.get('idm/me');
          return response.data;
        },
        staleTime: 0, // Force fresh fetch
      });

      // Also prefetch profile since ProtectedRoute needs it
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
          // Profile might not exist for new users - that's OK
        });

      // Check if user needs to consent to legal documents
      if (data.data?.needsConsent) {
        optionsRef.current?.onNeedsConsent?.();
      } else {
        optionsRef.current?.onSuccess?.(data);
      }
    },
    onError: (error) => optionsRef.current?.onError?.(error),
  });

  useEffect(() => {
    ensureGoogleInitialized(async (credential) => {
      try {
        await mutation.mutateAsync({
          idToken: credential,
          registrationCode: registrationCodeRef.current,
          dateOfBirth: dateOfBirthRef.current,
        });
        webSignInResolveRef.current?.();
      } catch (error) {
        webSignInRejectRef.current?.(
          error instanceof Error
            ? error
            : new Error('Google web sign-in failed'),
        );
      } finally {
        webSignInResolveRef.current = null;
        webSignInRejectRef.current = null;
      }
    }).then((ready) => {
      setIsReady(ready);
    });
  }, [mutation]);

  const renderButton = useCallback((container: HTMLDivElement | null) => {
    if (!container || isNativeApp()) {
      return;
    }

    if (!window.google?.accounts?.id) {
      return;
    }

    container.innerHTML = '';
    window.google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: '100%',
    });
  }, []);

  const signInWithGoogle = useCallback(
    async (opts?: { registrationCode?: string; dateOfBirth?: string }) => {
      registrationCodeRef.current = opts?.registrationCode;
      dateOfBirthRef.current = opts?.dateOfBirth;
      const ready = await ensureGoogleInitialized(async (credential) => {
        try {
          await mutation.mutateAsync({
            idToken: credential,
            registrationCode: registrationCodeRef.current,
            dateOfBirth: dateOfBirthRef.current,
          });
          webSignInResolveRef.current?.();
        } catch (error) {
          webSignInRejectRef.current?.(
            error instanceof Error
              ? error
              : new Error('Google web sign-in failed'),
          );
        } finally {
          webSignInResolveRef.current = null;
          webSignInRejectRef.current = null;
        }
      });
      if (!ready) {
        throw new Error('Google sign-in is not configured');
      }

      if (!isNativeApp()) {
        if (!window.google?.accounts?.id) {
          throw new Error('Google Identity is not available in browser');
        }

        return new Promise<void>((resolve, reject) => {
          webSignInResolveRef.current = resolve;
          webSignInRejectRef.current = reject;

          window.google?.accounts?.id?.prompt();

          window.setTimeout(() => {
            if (webSignInResolveRef.current) {
              webSignInResolveRef.current = null;
              webSignInRejectRef.current = null;
              reject(new Error('Google sign-in was not completed'));
            }
          }, 10000);
        });
      }

      const loginResponse = await SocialLogin.login({
        provider: 'google',
        options: {
          scopes: ['email', 'profile', 'openid'],
        },
      });

      if (loginResponse.result.responseType !== 'online') {
        throw new Error(
          'Google login returned offline response without ID token',
        );
      }

      const idToken = loginResponse.result.idToken;

      if (!idToken) {
        throw new Error('Google sign-in did not return an ID token');
      }

      await mutation.mutateAsync({
        idToken,
        registrationCode: registrationCodeRef.current,
        dateOfBirth: dateOfBirthRef.current,
      });
    },
    [mutation],
  );

  return {
    renderButton,
    signInWithGoogle,
    isNativePlatform: nativePlatform,
    isLoading: mutation.isPending,
    isReady,
    isError: mutation.isError,
    error: mutation.error,
  };
}
