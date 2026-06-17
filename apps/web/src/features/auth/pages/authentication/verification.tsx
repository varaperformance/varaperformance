import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useVerifyEmail,
  useLogin,
  useResendVerification,
} from '@/features/auth';
import api from '@/lib/api';
import type { SuccessResponse, ProfileResponse } from '@varaperformance/core';

interface LocationState {
  email?: string;
  password?: string;
  redirectTo?: string;
}

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

const VerificationPage = () => {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const location = useLocation();
  const { email, password, redirectTo } =
    (location.state as LocationState) ?? {};
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const loginMutation = useLogin({
    onSuccess: async () => {
      await checkProfileAndNavigate(navigate, redirectTo || '/dashboard');
    },
    onError: () => {
      // Fall back to login page if auto-login fails
      navigate('/login?verified=true');
    },
  });

  const verifyMutation = useVerifyEmail({
    onSuccess: () => {
      // Auto-login if we have credentials from login page redirect
      if (email && password) {
        loginMutation.mutate({ email, password });
      } else {
        navigate('/login?verified=true');
      }
    },
    onError: () => {},
  });

  const resendMutation = useResendVerification({
    onSuccess: () => {
      setResendMessage('A new verification code has been sent.');
      setResendCooldown(30);
    },
    onError: (error) => {
      setResendMessage(error.message || 'Unable to resend code right now.');
    },
  });

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timerId = window.setInterval(() => {
      setResendCooldown((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (pastedData.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < pastedData.length; i++) {
        newCode[i] = pastedData[i];
      }
      setCode(newCode);
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) return;
    verifyMutation.mutate({ verificationCode });
  };

  const isComplete = code.every((digit) => digit !== '');
  const canResend =
    Boolean(email) && resendCooldown === 0 && !resendMutation.isPending;

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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Check your email
              </div>
              <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Verify your{' '}
                <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  email
                </span>
              </h1>
              <p className="text-muted-foreground">
                {email ? (
                  <>
                    We sent a 6-digit code to{' '}
                    <span className="font-medium text-foreground">{email}</span>
                  </>
                ) : (
                  'Enter the 6-digit code we sent to your email'
                )}
              </p>
            </div>

            {/* Verification Card */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-xl backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 6-digit code inputs */}
                <div className="flex justify-center gap-2 sm:gap-3">
                  {code.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className="h-14 w-12 text-center text-2xl font-semibold sm:h-16 sm:w-14"
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full shadow-lg shadow-primary/25"
                  disabled={!isComplete || verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
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
                      Verifying...
                    </>
                  ) : (
                    'Verify email'
                  )}
                </Button>
              </form>

              {/* Resend code */}
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    className="font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
                    disabled={!canResend}
                    onClick={() => {
                      if (!email || resendCooldown > 0) return;
                      setResendMessage(null);
                      resendMutation.mutate({ email });
                    }}
                  >
                    {resendMutation.isPending
                      ? 'Sending...'
                      : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : 'Resend'}
                  </button>
                </p>
                {!email && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Restart sign up to resend a verification code.
                  </p>
                )}
                {resendMessage && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {resendMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Footer links */}
            <div className="mt-8 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Wrong email?{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Sign up again
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VerificationPage;
