import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForgotPassword } from '@/features/auth';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const forgotPasswordMutation = useForgotPassword({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      // Still show success for security (don't reveal if email exists)
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    forgotPasswordMutation.mutate({ email });
  };

  const handleContinue = () => {
    navigate('/reset-password', { state: { email } });
  };

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
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                Account recovery
              </div>
              <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {submitted ? (
                  <>
                    Check your{' '}
                    <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      email
                    </span>
                  </>
                ) : (
                  <>
                    Forgot your{' '}
                    <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      password?
                    </span>
                  </>
                )}
              </h1>
              <p className="text-muted-foreground">
                {submitted
                  ? "If an account exists with that email, we've sent a 6-digit reset code."
                  : "Enter your email address and we'll send you a reset code."}
              </p>
            </div>

            {/* Card */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-xl backdrop-blur-sm">
              {submitted ? (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <svg
                        className="h-8 w-8 text-primary"
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
                    </div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    We sent a 6-digit code to{' '}
                    <span className="font-medium text-foreground">{email}</span>
                  </p>
                  <Button
                    type="button"
                    size="lg"
                    className="w-full shadow-lg shadow-primary/25"
                    onClick={handleContinue}
                  >
                    Enter reset code
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Didn't receive the email?{' '}
                    <button
                      type="button"
                      className="font-medium text-primary transition-colors hover:text-primary/80"
                      onClick={() => {
                        setSubmitted(false);
                        forgotPasswordMutation.reset();
                      }}
                    >
                      Try again
                    </button>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
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
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full shadow-lg shadow-primary/25"
                    disabled={!email || forgotPasswordMutation.isPending}
                  >
                    {forgotPasswordMutation.isPending ? (
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
                        Sending...
                      </>
                    ) : (
                      'Send reset code'
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Footer links */}
            <div className="mt-8 space-y-4 text-center">
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

export default ForgotPasswordPage;
