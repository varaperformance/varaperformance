import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppleAuth } from '@/features/auth';
import { useGoogleAuth } from '@/features/auth';
import { useRegister } from '@/features/auth';
import { useActiveLegalDocuments } from '@/features/auth';
import { REQUIRED_REGISTRATION_CONSENTS } from '@varaperformance/core';
import { MINIMUM_REGISTRATION_AGE } from '@varaperformance/core';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedHipaa, setAcceptedHipaa] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '/dashboard';
  const redirectTo =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/dashboard';
  const registrationCode = searchParams.get('registrationCode') || undefined;

  // SOC2/HIPAA: Fetch active legal document versions for consent tracking
  const { data: legalDocsResponse, isLoading: isLoadingLegalDocs } =
    useActiveLegalDocuments();
  const legalDocs = useMemo(
    () => legalDocsResponse?.data ?? [],
    [legalDocsResponse?.data],
  );

  // Get document versions for consent submission
  const termsDoc = useMemo(
    () => legalDocs.find((d) => d.type === 'TERMS_OF_SERVICE'),
    [legalDocs],
  );
  const privacyDoc = useMemo(
    () => legalDocs.find((d) => d.type === 'PRIVACY_POLICY'),
    [legalDocs],
  );
  const hipaaDoc = useMemo(
    () => legalDocs.find((d) => d.type === 'HIPAA_AUTHORIZATION'),
    [legalDocs],
  );

  // Check if all required consents are accepted
  const allConsentsAccepted = acceptedTerms && acceptedPrivacy && acceptedHipaa;

  const {
    renderButton,
    signInWithGoogle,
    isNativePlatform,
    isLoading: isGoogleLoading,
  } = useGoogleAuth({
    onSuccess: () => {
      navigate(redirectTo);
    },
    onNeedsConsent: () => {
      // SOC2/HIPAA: New OAuth user needs to accept legal documents
      navigate('/reconsent', { replace: true });
    },
    onError: () => {},
  });

  const { signInWithApple, isLoading: isAppleLoading } = useAppleAuth({
    onSuccess: () => {
      navigate(redirectTo);
    },
    onNeedsConsent: () => {
      navigate('/reconsent', { replace: true });
    },
    onError: () => {},
  });

  const registerMutation = useRegister({
    onSuccess: () => {
      // Navigate to verification page with email and password for auto-login after verification
      navigate('/verification', { state: { email, password, redirectTo } });
    },
    onError: () => {},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return;
    }
    if (!allConsentsAccepted) {
      return;
    }
    if (!dateOfBirth) {
      return;
    }

    // SOC2/HIPAA: Build consent array with document versions
    const consents = REQUIRED_REGISTRATION_CONSENTS.map((type) => ({
      type,
      version:
        type === 'TERMS_OF_SERVICE'
          ? (termsDoc?.version ?? '1.0')
          : type === 'PRIVACY_POLICY'
            ? (privacyDoc?.version ?? '1.0')
            : (hipaaDoc?.version ?? '1.0'),
    }));

    registerMutation.mutate({
      email,
      password,
      dateOfBirth,
      consents,
      registrationCode,
    });
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle({ registrationCode, dateOfBirth });
    } catch {
      // Error surfaces through OAuth hook callbacks.
    }
  };

  const handleAppleSignUp = async () => {
    try {
      await signInWithApple({ registrationCode, dateOfBirth });
    } catch {
      // Error surfaces through OAuth hook callbacks.
    }
  };

  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isNativePlatform) {
      renderButton(googleButtonRef.current);
    }
  }, [isNativePlatform, renderButton]);

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
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Join the community
              </div>
              <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Create your{' '}
                <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  account
                </span>
              </h1>
              <p className="text-muted-foreground">
                Start your fitness journey with Vara Performance
              </p>
            </div>

            {/* Register Card */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-xl backdrop-blur-sm">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    placeholder="••••••••"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                  />
                </div>

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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-sm font-medium">
                    Date of birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    max={
                      new Date(
                        new Date().getFullYear() - MINIMUM_REGISTRATION_AGE,
                        new Date().getMonth(),
                        new Date().getDate(),
                      )
                        .toISOString()
                        .split('T')[0]
                    }
                    className="h-11"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    You must be at least {MINIMUM_REGISTRATION_AGE} years old to
                    register.
                  </p>
                </div>

                {/* SOC2/HIPAA: Consent checkboxes with version tracking */}
                <div className="space-y-3 rounded-lg border border-border/50 bg-background/50 p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) =>
                        setAcceptedTerms(checked === true)
                      }
                      disabled={isLoadingLegalDocs}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm leading-relaxed text-muted-foreground"
                    >
                      I agree to the{' '}
                      <Link
                        to="/terms"
                        className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                        target="_blank"
                      >
                        Terms of Service
                      </Link>
                      {termsDoc?.version && (
                        <span className="ml-1 text-xs text-muted-foreground/70">
                          ({termsDoc.version})
                        </span>
                      )}
                    </label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="privacy"
                      checked={acceptedPrivacy}
                      onCheckedChange={(checked) =>
                        setAcceptedPrivacy(checked === true)
                      }
                      disabled={isLoadingLegalDocs}
                    />
                    <label
                      htmlFor="privacy"
                      className="text-sm leading-relaxed text-muted-foreground"
                    >
                      I agree to the{' '}
                      <Link
                        to="/privacy"
                        className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                        target="_blank"
                      >
                        Privacy Policy
                      </Link>
                      {privacyDoc?.version && (
                        <span className="ml-1 text-xs text-muted-foreground/70">
                          ({privacyDoc.version})
                        </span>
                      )}
                    </label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="hipaa"
                      checked={acceptedHipaa}
                      onCheckedChange={(checked) =>
                        setAcceptedHipaa(checked === true)
                      }
                      disabled={isLoadingLegalDocs}
                    />
                    <label
                      htmlFor="hipaa"
                      className="text-sm leading-relaxed text-muted-foreground"
                    >
                      I agree to the{' '}
                      <Link
                        to="/hipaa"
                        className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                        target="_blank"
                      >
                        HIPAA Authorization
                      </Link>
                      {hipaaDoc?.version && (
                        <span className="ml-1 text-xs text-muted-foreground/70">
                          ({hipaaDoc.version})
                        </span>
                      )}
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full shadow-lg shadow-primary/25"
                  disabled={
                    registerMutation.isPending ||
                    !allConsentsAccepted ||
                    !dateOfBirth ||
                    isLoadingLegalDocs
                  }
                >
                  {registerMutation.isPending ? (
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
                      Creating account...
                    </>
                  ) : (
                    'Create account'
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
                <Button
                  variant="outline"
                  className="h-11"
                  type="button"
                  disabled={isGoogleLoading}
                  onClick={handleGoogleSignUp}
                >
                  {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  type="button"
                  disabled={isAppleLoading}
                  onClick={handleAppleSignUp}
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
                Already have an account?{' '}
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

export default RegisterPage;
