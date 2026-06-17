import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetPassword } from '@/features/auth';

interface LocationState {
  email?: string;
}

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from location state
  const initialEmail = (location.state as LocationState)?.email ?? '';

  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetPasswordMutation = useResetPassword({
    onSuccess: () => {
      setSuccess(true);
      setErrorMessage(null);
    },
    onError: (error) => {
      const axiosError = error as {
        response?: { data?: { error?: { message?: string } } };
      };
      const message =
        axiosError.response?.data?.error?.message ||
        'Failed to reset password. Please try again.';
      setErrorMessage(message);
    },
  });

  // Focus first code input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleCodeChange = (index: number, value: string) => {
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
    const resetCode = code.join('');
    if (
      resetCode.length !== 6 ||
      !email ||
      !newPassword ||
      newPassword !== confirmPassword
    ) {
      return;
    }
    resetPasswordMutation.mutate({
      email,
      resetCode,
      newPassword,
    });
  };

  const isCodeComplete = code.every((digit) => digit !== '');
  const passwordsMatch = newPassword === confirmPassword;
  const isFormValid =
    isCodeComplete && email && newPassword.length >= 8 && passwordsMatch;

  if (success) {
    return (
      <div className="flex flex-col">
        <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden py-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-40 top-0 h-80 w-80 animate-pulse rounded-full bg-primary/20 blur-3xl" />
            <div
              className="absolute -right-40 bottom-0 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl"
              style={{ animationDelay: '1s' }}
            />
          </div>

          <div className="container relative z-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8 text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-4 py-1.5 text-sm text-green-600 dark:text-green-400">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Success
                </div>
                <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Password{' '}
                  <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    reset
                  </span>
                </h1>
                <p className="text-muted-foreground">
                  Your password has been successfully reset.
                </p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-xl backdrop-blur-sm">
                <div className="flex justify-center mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                    <svg
                      className="h-8 w-8 text-green-600 dark:text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="w-full shadow-lg shadow-primary/25"
                  onClick={() => navigate('/login')}
                >
                  Sign in with new password
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

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
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Reset password
              </div>
              <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Create a new{' '}
                <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  password
                </span>
              </h1>
              <p className="text-muted-foreground">
                Enter the 6-digit code from your email and your new password.
              </p>
            </div>

            {/* Reset Password Card */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-xl backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email field (if not passed from forgot password) */}
                {!(location.state as LocationState)?.email && (
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
                )}

                {/* Display email if passed from state */}
                {(location.state as LocationState)?.email && (
                  <div className="text-center text-sm text-muted-foreground mb-4">
                    Reset code sent to{' '}
                    <span className="font-medium text-foreground">{email}</span>
                  </div>
                )}

                {/* 6-digit code inputs */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Reset code</Label>
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
                        onChange={(e) =>
                          handleCodeChange(index, e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className="h-12 w-10 text-center text-xl font-semibold sm:h-14 sm:w-12"
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>
                </div>

                {/* New password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">
                    New password
                  </Label>
                  <Input
                    id="newPassword"
                    placeholder="••••••••"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-11"
                  />
                  {newPassword && newPassword.length < 8 && (
                    <p className="text-xs text-destructive">
                      Password must be at least 8 characters
                    </p>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium"
                  >
                    Confirm password
                  </Label>
                  <Input
                    id="confirmPassword"
                    placeholder="••••••••"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11"
                  />
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-destructive">
                      Passwords don't match
                    </p>
                  )}
                </div>

                {errorMessage && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full shadow-lg shadow-primary/25"
                  disabled={!isFormValid || resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
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
                      Resetting...
                    </>
                  ) : (
                    'Reset password'
                  )}
                </Button>
              </form>
            </div>

            {/* Footer links */}
            <div className="mt-8 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Need a new code?{' '}
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Request again
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ResetPasswordPage;
