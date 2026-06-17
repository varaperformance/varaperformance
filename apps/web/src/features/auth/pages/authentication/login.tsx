import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useAppleAuth } from '@/features/auth';
import { useGoogleAuth } from '@/features/auth';
import { useLogin } from '@/features/auth';
import api from '@/lib/api';
import { isNativeApp } from '@/lib/capacitor';
import { setAuthTokens } from '@/lib/auth-tokens';
import type { SuccessResponse, ProfileResponse } from '@varaperformance/core';

/**
 * Check if user's profile is complete and navigate accordingly
 */
async function checkProfileAndNavigate(
  navigate: ReturnType<typeof useNavigate>,
  defaultPath: string,
) {
  try {
    const response = await api.get<SuccessResponse<ProfileResponse>>('profile');
    if (response.data.success && response.data.data.completedAt === null) {
      navigate('/profile/create', { replace: true });
    } else {
      navigate(defaultPath, { replace: true });
    }
  } catch {
    // Profile doesn't exist or error - redirect to create
    navigate('/profile/create', { replace: true });
  }
}

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [showTotpDialog, setShowTotpDialog] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [oauthSessionToken, setOauthSessionToken] = useState<string | null>(
    null,
  );
  const [isOAuthTotpPending, setIsOAuthTotpPending] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Check URL query param first, then location state, then default to dashboard
  const rawRedirect =
    searchParams.get('redirect') ||
    location.state?.from?.pathname ||
    '/dashboard';
  const from =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/dashboard';

  const getAuthErrorMessage = (error: unknown): string => {
    const axiosError = error as {
      response?: { data?: { error?: { code?: string; message?: string } } };
    };

    const code = axiosError.response?.data?.error?.code;
    const message = axiosError.response?.data?.error?.message;

    if (code === 'FORBIDDEN' && message?.includes('deactivated')) {
      return 'Your account is deactivated. Contact support if you think this is a mistake.';
    }

    if (code === 'FORBIDDEN' && message?.includes('Date of birth')) {
      navigate('/register', { replace: true });
      return '';
    }

    return message ?? 'Unable to sign in right now. Please try again.';
  };

  const {
    renderButton,
    signInWithGoogle,
    isNativePlatform,
    isReady: isGoogleReady,
    isLoading: isGoogleLoading,
  } = useGoogleAuth({
    onSuccess: async () => {
      await checkProfileAndNavigate(navigate, from);
    },
    onNeedsConsent: () => {
      // SOC2/HIPAA: New OAuth user needs to accept legal documents
      navigate('/reconsent', { replace: true });
    },
    onTotpRequired: (sessionToken) => {
      setOauthSessionToken(sessionToken);
      setTotpCode('');
      setUseRecoveryCode(false);
      setShowTotpDialog(true);
    },
    onError: (error) => {
      setAuthError(getAuthErrorMessage(error));
    },
  });

  const { signInWithApple, isLoading: isAppleLoading } = useAppleAuth({
    onSuccess: async () => {
      await checkProfileAndNavigate(navigate, from);
    },
    onNeedsConsent: () => {
      navigate('/reconsent', { replace: true });
    },
    onTotpRequired: (sessionToken) => {
      setOauthSessionToken(sessionToken);
      setTotpCode('');
      setUseRecoveryCode(false);
      setShowTotpDialog(true);
    },
    onError: (error) => {
      setAuthError(getAuthErrorMessage(error));
    },
  });

  const loginMutation = useLogin({
    onSuccess: async (data) => {
      if (data?.data && 'totpRequired' in data.data && data.data.totpRequired) {
        setTotpCode('');
        setUseRecoveryCode(false);
        setShowTotpDialog(true);
        return;
      }
      await checkProfileAndNavigate(navigate, from);
    },
    onError: (error) => {
      // Check if user is not verified - redirect to verification page
      const axiosError = error as {
        response?: { data?: { error?: { code?: string; message?: string } } };
      };
      if (
        axiosError.response?.data?.error?.code === 'CONFLICT' &&
        axiosError.response?.data?.error?.message === 'User is not verified'
      ) {
        navigate('/verification', {
          state: { email, password, redirectTo: from },
        });
        return;
      }

      setAuthError(getAuthErrorMessage(error));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    loginMutation.mutate({ email, password });
  };

  const handleTotpSubmit = async () => {
    if (!totpCode.trim()) return;
    setAuthError(null);
    setShowTotpDialog(false);

    if (oauthSessionToken) {
      // OAuth TOTP flow — call the dedicated verify endpoint
      setIsOAuthTotpPending(true);
      try {
        const payload: Record<string, string> = { oauthSessionToken };
        if (useRecoveryCode) {
          payload.recoveryCode = totpCode.trim();
        } else {
          payload.totpToken = totpCode.trim();
        }

        const response = await api.post('idm/oauth/verify-totp', payload);
        const data = response.data?.data;

        if (isNativeApp() && data?.accessToken && data?.refreshToken) {
          setAuthTokens({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
        }

        setOauthSessionToken(null);

        // Populate auth state so AuthProvider sees the user as logged in
        await queryClient.fetchQuery({
          queryKey: ['me'],
          queryFn: async () => {
            const r = await api.get('idm/me');
            return r.data;
          },
          staleTime: 0,
        });

        await checkProfileAndNavigate(navigate, from);
      } catch (error) {
        setAuthError(getAuthErrorMessage(error));
      } finally {
        setIsOAuthTotpPending(false);
      }
    } else {
      // Local login TOTP flow — re-submit credentials with TOTP code
      if (useRecoveryCode) {
        loginMutation.mutate({
          email,
          password,
          recoveryCode: totpCode.trim(),
        });
      } else {
        loginMutation.mutate({
          email,
          password,
          totpToken: totpCode.trim(),
        });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setAuthError(null);
      await signInWithApple();
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    }
  };

  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isNativePlatform && isGoogleReady) {
      renderButton(googleButtonRef.current);
    }
  }, [isNativePlatform, isGoogleReady, renderButton]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden py-12">
        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-0 h-80 w-80 animate-pulse rounded-full bg-primary/20 blur-3xl" />
          <div
            className="absolute -right-40 bottom-0 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl"
            style={{ animationDelay: '1s' }}
          />
          <div
            className="absolute bottom-1/4 left-1/3 h-64 w-64 animate-pulse rounded-full bg-primary/15 blur-3xl"
            style={{ animationDelay: '2s' }}
          />
        </div>

        <div className="container relative z-10">
          <div className="mx-auto max-w-md">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Welcome back
              </div>
              <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Sign in to your{' '}
                <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  account
                </span>
              </h1>
              <p className="text-muted-foreground">
                Continue your fitness journey where you left off
              </p>
            </div>

            {/* Login Card */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-xl backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-5">
                {authError ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {authError}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    placeholder="you@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full shadow-lg shadow-primary/25"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <svg
                        className="mr-2 h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Social login buttons */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {isNativePlatform ? (
                  <Button
                    variant="outline"
                    className="h-11"
                    type="button"
                    disabled={isGoogleLoading}
                    onClick={handleGoogleSignIn}
                  >
                    {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
                  </Button>
                ) : (
                  <div
                    ref={googleButtonRef}
                    className="flex h-11 items-center justify-center overflow-hidden rounded-md border border-border/50 bg-background"
                  />
                )}
                <Button
                  variant="outline"
                  className="h-11"
                  type="button"
                  disabled={isAppleLoading}
                  onClick={handleAppleSignIn}
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  {isAppleLoading ? 'Signing in...' : 'Continue with Apple'}
                </Button>
              </div>
            </div>

            {/* Footer links */}
            <div className="mt-8 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Sign up for free
                </Link>
              </p>
              <p className="text-xs text-muted-foreground">
                Need help or want updates? Join our Discord community at{' '}
                <a
                  href="https://discord.gg/MGrfchn2kh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  discord.gg/MGrfchn2kh
                </a>
                .
              </p>
              <p className="text-xs text-muted-foreground">
                By signing in, you agree to our{' '}
                <Link
                  to="/terms"
                  className="underline underline-offset-4 transition-colors hover:text-foreground"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  to="/privacy"
                  className="underline underline-offset-4 transition-colors hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TOTP Verification Dialog */}
      <Dialog open={showTotpDialog} onOpenChange={setShowTotpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              {useRecoveryCode
                ? 'Enter one of your recovery codes.'
                : 'Enter the 6-digit code from your authenticator app.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Input
              inputMode={useRecoveryCode ? 'text' : 'numeric'}
              maxLength={useRecoveryCode ? 20 : 6}
              placeholder={useRecoveryCode ? 'Recovery code' : '000000'}
              value={totpCode}
              onChange={(e) =>
                setTotpCode(
                  useRecoveryCode
                    ? e.target.value
                    : e.target.value.replace(/\D/g, ''),
                )
              }
              className={
                useRecoveryCode ? '' : 'text-center text-lg tracking-[0.5em]'
              }
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTotpSubmit();
              }}
            />
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-primary"
              onClick={() => {
                setUseRecoveryCode((prev) => !prev);
                setTotpCode('');
              }}
            >
              {useRecoveryCode
                ? 'Use authenticator code instead'
                : 'Use a recovery code instead'}
            </button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTotpDialog(false);
                setOauthSessionToken(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTotpSubmit}
              disabled={
                !totpCode.trim() ||
                loginMutation.isPending ||
                isOAuthTotpPending
              }
            >
              {loginMutation.isPending || isOAuthTotpPending
                ? 'Verifying...'
                : 'Verify'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
