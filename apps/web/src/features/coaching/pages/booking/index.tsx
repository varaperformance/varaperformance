import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import coachFallbackImg from '@/assets/images/unsplash/coach-fallback.jpg';
import { addToDeviceCalendar } from '@/lib/calendar-sync';
import { toast } from 'sonner';
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
  useLocation,
} from 'react-router';
import type { SuccessResponse } from '@varaperformance/core';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { formatCentsToCyclePrice, formatMoneyCents } from '@/lib/pricing';
import api from '@/lib/api';
import { useAuth } from '@/features/auth';
import {
  useCoach,
  useCoachContract,
  useSignContract,
  useInitiateBookingPayment,
  type CoachPackageResponse,
} from '@/features/coaching';
import { useCoachAvailability } from '@/features/coaching';

type BookingStep = 'package' | 'info' | 'contract' | 'success';

const calculatePlatformFeeCents = (
  basePriceInCents: number,
  feePercent: number,
) => Math.round(basePriceInCents * (feePercent / 100));

const billingCycleLabel = (billingCycle: string) => {
  if (billingCycle === 'MONTHLY') return 'Monthly';
  if (billingCycle === 'QUARTERLY') return 'Quarterly';
  return 'Yearly';
};

const BookingPage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isMobile = useIsMobile();
  const preselectedPackage = searchParams.get('package');

  // Fetch coach data from API
  const {
    data: coachData,
    isLoading: isCoachLoading,
    isError,
  } = useCoach(slug);

  const coach = coachData?.data;
  const coachName = coach?.profile?.displayName || 'Coach';
  const coachAvatar = coach?.profile?.avatarUrl || coachFallbackImg;
  const coachTitle = coach?.title || 'Fitness Coach';
  const packages: CoachPackageResponse[] = coach?.packages ?? [];

  const { data: platformFeeData } = useQuery({
    queryKey: ['platform-fee', 'public'],
    queryFn: async () => {
      const response = await api.get<SuccessResponse<{ percent: number }>>(
        'payments/settings/platform-fee',
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const platformFeePercent = platformFeeData?.data?.percent ?? 15;

  // Fetch coach availability for display
  const { data: availabilityData } = useCoachAvailability(coach?.id ?? '');
  const availabilitySlots = availabilityData?.data?.items ?? [];
  const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Fetch contract using coach.id (UUID)
  const { data: contractData, isLoading: isContractLoading } = useCoachContract(
    coach?.id,
  );
  const contract = contractData?.success ? contractData.data : null;

  // Mutations
  const signContractMutation = useSignContract();
  const paymentMutation = useInitiateBookingPayment();

  const [step, setStep] = useState<BookingStep>(
    preselectedPackage ? 'info' : 'package',
  );
  const [selectedPackage, setSelectedPackage] = useState(
    preselectedPackage || packages[0]?.name || '',
  );
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    goals: '',
    experience: '',
    injuries: '',
  });
  const [contractAgreed, setContractAgreed] = useState(false);
  const [signature, setSignature] = useState('');
  const [bookingData, setBookingData] = useState<{
    id: string;
    referenceCode: string;
  } | null>(null);

  const selectedPkg = packages.find((p) => p.name === selectedPackage);
  const selectedPkgBasePriceCents = selectedPkg?.priceInCents ?? 0;
  const selectedPkgPlatformFeeCents = calculatePlatformFeeCents(
    selectedPkgBasePriceCents,
    platformFeePercent,
  );
  const selectedPkgFinalPriceCents =
    selectedPkgBasePriceCents + selectedPkgPlatformFeeCents;
  const selectedPkgFinalPrice = selectedPkg
    ? formatCentsToCyclePrice(
        selectedPkgFinalPriceCents,
        selectedPkg.billingCycle,
      )
    : '';

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePackageSelect = (pkgName: string) => {
    setSelectedPackage(pkgName);
    setStep('info');
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('contract');
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Contract accepted - submit booking request (no payment yet)

    if (!coach?.id || !selectedPkg?.id) {
      console.error('Missing IDs:', {
        coachId: coach?.id,
        packageId: selectedPkg?.id,
      });
      return;
    }

    // Validate UUIDs before sending
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(coach.id)) {
      console.error('Invalid coach UUID:', coach.id);
      return;
    }
    if (!uuidRegex.test(selectedPkg.id)) {
      console.error('Invalid package UUID:', selectedPkg.id);
      return;
    }

    try {
      const result = await paymentMutation.mutateAsync({
        coachId: coach.id,
        packageId: selectedPkg.id,
        intake: {
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          phone: formData.phone || undefined,
          goals: formData.goals || undefined,
          experience: formData.experience || undefined,
          injuries: formData.injuries || undefined,
        },
      });

      if (result.success && result.data) {
        setBookingData({
          id: result.data.booking.id,
          referenceCode: result.data.booking.referenceCode,
        });

        // Sign the contract
        if (contract?.id && signature) {
          try {
            await signContractMutation.mutateAsync({
              bookingId: result.data.booking.id,
              contractId: contract.id,
              signature,
            });
          } catch {
            console.error('Contract signing failed but booking submitted');
          }
        }

        setStep('success');
      }
    } catch (error) {
      console.error('Booking request failed:', error);
    }
  };

  const steps = [
    { key: 'package', label: 'Package' },
    { key: 'info', label: 'Info' },
    { key: 'contract', label: 'Contract' },
    { key: 'success', label: 'Complete' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // Show loading state while fetching coach data
  if (isCoachLoading) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container max-w-4xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  // Show error state if coach not found
  if (isError || !coach) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Coach Not Found</CardTitle>
              <CardDescription>
                We couldn't find this coach. They may no longer be available.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link to="/coaches">Browse Coaches</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show login prompt if user is not authenticated
  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
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
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
              </div>
              <CardTitle className="text-2xl">Sign in to continue</CardTitle>
              <CardDescription>
                You need to be signed in to book a coaching session with{' '}
                {coachName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <img
                  src={coachAvatar}
                  alt={coachName}
                  className="h-12 w-12 rounded-lg object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <p className="font-medium">{coachName}</p>
                  <p className="text-sm text-muted-foreground">{coachTitle}</p>
                </div>
              </div>
              {preselectedPackage && (
                <div className="rounded-lg bg-primary/5 p-3">
                  <p className="text-sm text-muted-foreground">
                    Selected package:
                  </p>
                  <p className="font-medium">{preselectedPackage}</p>
                </div>
              )}
              <div className="space-y-2 pt-2">
                <Button
                  className="w-full"
                  onClick={() =>
                    navigate(
                      `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`,
                    )
                  }
                >
                  Sign in
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    navigate(
                      `/register?redirect=${encodeURIComponent(location.pathname + location.search)}`,
                    )
                  }
                >
                  Create an account
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                By signing in, you agree to our{' '}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </CardContent>
          </Card>
          <div className="mt-6 text-center">
            <Link
              to={`/coaches/${slug}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
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
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
              Back to coach profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link
            to={`/coaches/${slug}`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
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
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
            Back to profile
          </Link>
          <h1 className="text-3xl font-bold">Book with {coachName}</h1>
          <p className="mt-2 text-muted-foreground">{coachTitle}</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    i < currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : i === currentStepIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {i < currentStepIndex ? (
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
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    'ml-2 hidden text-sm sm:block',
                    i <= currentStepIndex
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      'mx-4 h-0.5 w-8 sm:w-16',
                      i < currentStepIndex ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className={cn('grid gap-6', !isMobile && 'lg:grid-cols-3')}>
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === 'package' && (
              <Card>
                <CardHeader>
                  <CardTitle>Choose Your Package</CardTitle>
                  <CardDescription>
                    Select the coaching package that fits your needs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {packages.map((pkg) => {
                    const packageFeeCents = calculatePlatformFeeCents(
                      pkg.priceInCents,
                      platformFeePercent,
                    );
                    const packageFinalPriceCents =
                      pkg.priceInCents + packageFeeCents;

                    return (
                      <button
                        key={pkg.name}
                        onClick={() => handlePackageSelect(pkg.name)}
                        className={cn(
                          'w-full rounded-xl border p-4 text-left transition-all hover:border-primary/50',
                          selectedPackage === pkg.name
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'border-border',
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="font-semibold">{pkg.name}</h3>
                          <span className="text-lg font-bold text-primary">
                            {formatCentsToCyclePrice(
                              packageFinalPriceCents,
                              pkg.billingCycle,
                            )}
                          </span>
                        </div>
                        <p className="mb-2 text-xs text-muted-foreground">
                          Includes {formatMoneyCents(packageFeeCents)} platform
                          fee.
                        </p>
                        <ul className="space-y-1">
                          {pkg.features.slice(0, 3).map((feature) => (
                            <li
                              key={feature}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <svg
                                className="h-4 w-4 text-green-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m4.5 12.75 6 6 9-13.5"
                                />
                              </svg>
                              {feature}
                            </li>
                          ))}
                          {pkg.features.length > 3 && (
                            <li className="text-sm text-muted-foreground">
                              +{pkg.features.length - 3} more features
                            </li>
                          )}
                        </ul>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {step === 'info' && (
              <Card>
                <CardHeader>
                  <CardTitle>Tell Us About Yourself</CardTitle>
                  <CardDescription>
                    This helps {coachName} personalize your program
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInfoSubmit} className="space-y-4">
                    <div
                      className={cn(
                        'grid gap-4',
                        !isMobile && 'sm:grid-cols-2',
                      )}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experience">Training Experience *</Label>
                      <select
                        id="experience"
                        name="experience"
                        value={formData.experience}
                        onChange={handleInputChange}
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Select your experience level</option>
                        <option value="beginner">Beginner (0-1 years)</option>
                        <option value="intermediate">
                          Intermediate (1-3 years)
                        </option>
                        <option value="advanced">
                          Experienced (3-5 years)
                        </option>
                        <option value="elite">Experienced (5+ years)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goals">What are your main goals? *</Label>
                      <textarea
                        id="goals"
                        name="goals"
                        value={formData.goals}
                        onChange={handleInputChange}
                        required
                        rows={3}
                        placeholder="E.g., Build strength, improve energy, feel healthier, prepare for an event..."
                        className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="injuries">
                        Any injuries or limitations? (optional)
                      </Label>
                      <textarea
                        id="injuries"
                        name="injuries"
                        value={formData.injuries}
                        onChange={handleInputChange}
                        rows={2}
                        placeholder="E.g., Previous knee injury, lower back issues..."
                        className="flex min-h-15 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep('package')}
                      >
                        Back
                      </Button>
                      <Button type="submit" className="flex-1">
                        Continue to Contract
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {step === 'contract' && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {contract?.title || 'Coaching Agreement'}
                  </CardTitle>
                  <CardDescription>
                    Please review and accept the coaching contract
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isContractLoading ? (
                    <div className="space-y-4">
                      <div className="h-64 animate-pulse rounded-lg bg-muted" />
                      <div className="h-20 animate-pulse rounded-lg bg-muted" />
                      <div className="h-12 animate-pulse rounded-lg bg-muted" />
                    </div>
                  ) : !contract ? (
                    <div className="space-y-6">
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                        <p className="font-medium">No contract available</p>
                        <p className="mt-1 text-sm">
                          This coach has not set up a coaching agreement yet.
                          Please contact them directly to proceed with booking.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep('info')}
                      >
                        Back
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleContractSubmit} className="space-y-6">
                      {/* Contract Terms */}
                      <div className="max-h-80 space-y-4 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4 text-sm">
                        <div className="whitespace-pre-wrap text-muted-foreground">
                          {contract.content}
                        </div>
                      </div>

                      {/* Policy Summary */}
                      <div className="rounded-lg bg-primary/5 p-4">
                        <h4 className="mb-3 font-semibold">Policies</h4>
                        <div className="space-y-3 text-sm">
                          {contract.cancellationPolicy && (
                            <div>
                              <p className="font-medium text-foreground">
                                Cancellation Policy
                              </p>
                              <p className="text-muted-foreground">
                                {contract.cancellationPolicy}
                              </p>
                            </div>
                          )}
                          {contract.refundPolicy && (
                            <div>
                              <p className="font-medium text-foreground">
                                Refund Policy
                              </p>
                              <p className="text-muted-foreground">
                                {contract.refundPolicy}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 border-t border-border pt-3">
                          <p className="text-sm text-muted-foreground">
                            Package:{' '}
                            <span className="font-medium text-foreground">
                              {selectedPackage}
                            </span>{' '}
                            — {selectedPkgFinalPrice}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Base {formatMoneyCents(selectedPkgBasePriceCents)} +
                            fee ({platformFeePercent}%){' '}
                            {formatMoneyCents(selectedPkgPlatformFeeCents)}
                          </p>
                        </div>
                      </div>

                      {/* Agreement Checkbox */}
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                        <input
                          type="checkbox"
                          checked={contractAgreed}
                          onChange={(e) => setContractAgreed(e.target.checked)}
                          required
                          className="mt-1 h-5 w-5 rounded border-border"
                        />
                        <div>
                          <span className="font-medium">
                            I have read and agree to the Coaching Agreement
                          </span>
                          <p className="mt-1 text-sm text-muted-foreground">
                            By checking this box, I acknowledge that I have
                            read, understood, and agree to be bound by the terms
                            and conditions outlined in this coaching agreement.
                          </p>
                        </div>
                      </label>

                      {/* Digital Signature */}
                      <div className="space-y-2">
                        <Label htmlFor="signature">Digital Signature *</Label>
                        <Input
                          id="signature"
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                          placeholder="Type your full legal name"
                          required
                          className="font-serif italic"
                        />
                        <p className="text-xs text-muted-foreground">
                          By typing your name above, you are providing a legally
                          binding electronic signature.
                        </p>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep('info')}
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={!contractAgreed || !signature.trim()}
                        >
                          Accept & Continue to Payment
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 'success' && selectedPkg && bookingData && (
              <Card className="overflow-hidden">
                <div className="bg-linear-to-r from-green-500/10 to-emerald-500/10 p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                    <svg
                      className="h-8 w-8 text-green-500"
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
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Request Submitted!
                  </h2>
                  <p className="text-muted-foreground">
                    Your coaching request has been sent to {coachName}
                  </p>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference</span>
                      <span className="font-mono font-medium">
                        {bookingData.referenceCode}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Package</span>
                      <span className="font-medium">{selectedPkg.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="text-yellow-500 font-medium">
                        Pending Review
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
                    <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                      What happens next?
                    </h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                      <li>{coachName} will review your request</li>
                      <li>
                        Once approved, you'll receive an email to complete
                        payment
                      </li>
                      <li>After payment, your coaching begins!</li>
                    </ol>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={async () => {
                        const ok = await addToDeviceCalendar({
                          title: `Coaching: ${selectedPkg.name} with ${coachName}`,
                          notes: `Booking ref: ${bookingData.referenceCode}`,
                          startDate: new Date(),
                          endDate: new Date(Date.now() + 60 * 60 * 1000),
                        });
                        if (ok) toast.success('Added to calendar');
                        else toast.error('Could not add to calendar');
                      }}
                    >
                      Add to Calendar
                    </Button>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" asChild>
                        <Link to={`/coaches/${slug}`}>View Coach Profile</Link>
                      </Button>
                      <Button className="flex-1" asChild>
                        <Link to="/my-coaching">View My Bookings</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {paymentMutation.isError && step === 'contract' && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
                {(paymentMutation.error as Error)?.message ||
                  'Payment setup failed. Please try again.'}
              </div>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="space-y-4 lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src={coachAvatar}
                    alt={coachName}
                    className="h-12 w-12 rounded-lg object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div>
                    <p className="font-medium">{coachName}</p>
                    <p className="text-sm text-muted-foreground">
                      {coachTitle}
                    </p>
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Package</span>
                    <span className="font-medium">{selectedPackage}</span>
                  </div>
                  {selectedPkg && (
                    <>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-muted-foreground">Billing</span>
                        <span>
                          {billingCycleLabel(selectedPkg.billingCycle)}
                        </span>
                      </div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Package</span>
                        <span>
                          {formatMoneyCents(selectedPkgBasePriceCents)}
                        </span>
                      </div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Platform fee ({platformFeePercent}%)
                        </span>
                        <span>
                          {formatMoneyCents(selectedPkgPlatformFeeCents)}
                        </span>
                      </div>
                      <div className="border-t border-border pt-4">
                        <div className="flex items-center justify-between text-lg font-bold">
                          <span>Total</span>
                          <span className="text-primary">
                            {selectedPkgFinalPrice}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Cancel anytime. No commitment.
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {selectedPkg && (
                  <div className="border-t border-border pt-4">
                    <p className="mb-2 text-sm font-medium">Includes:</p>
                    <ul className="space-y-1">
                      {selectedPkg.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <svg
                            className="h-3 w-3 text-green-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m4.5 12.75 6 6 9-13.5"
                            />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Progress indicator */}
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-sm font-medium">Booking Progress</p>
                  <div className="space-y-2">
                    {steps.map((s, i) => (
                      <div
                        key={s.key}
                        className="flex items-center gap-2 text-xs"
                      >
                        <div
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full',
                            i < currentStepIndex
                              ? 'bg-green-500 text-white'
                              : i === currentStepIndex
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {i < currentStepIndex ? (
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m4.5 12.75 6 6 9-13.5"
                              />
                            </svg>
                          ) : (
                            i + 1
                          )}
                        </div>
                        <span
                          className={cn(
                            i <= currentStepIndex
                              ? 'text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {availabilitySlots.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Availability</CardTitle>
                  <CardDescription className="text-xs">
                    Shown in your timezone ({clientTimezone})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(() => {
                    const DAYS = [
                      'MONDAY',
                      'TUESDAY',
                      'WEDNESDAY',
                      'THURSDAY',
                      'FRIDAY',
                      'SATURDAY',
                      'SUNDAY',
                    ];
                    const DAY_LABELS: Record<string, string> = {
                      MONDAY: 'Mon',
                      TUESDAY: 'Tue',
                      WEDNESDAY: 'Wed',
                      THURSDAY: 'Thu',
                      FRIDAY: 'Fri',
                      SATURDAY: 'Sat',
                      SUNDAY: 'Sun',
                    };

                    const convertTime = (
                      time: string,
                      _fromTz: string,
                      toTz: string,
                    ) => {
                      const [h, m] = time.split(':').map(Number);
                      const ref = new Date();
                      ref.setHours(h, m, 0, 0);
                      try {
                        return ref.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZone: toTz,
                          hour12: true,
                        });
                      } catch {
                        return time;
                      }
                    };

                    const grouped = DAYS.reduce<
                      Record<string, typeof availabilitySlots>
                    >((acc, day) => {
                      const daySlots = availabilitySlots.filter(
                        (s) => s.dayOfWeek === day,
                      );
                      if (daySlots.length > 0) acc[day] = daySlots;
                      return acc;
                    }, {});

                    return Object.entries(grouped).map(([day, slots]) => (
                      <div key={day} className="flex items-start gap-2 text-xs">
                        <span className="w-8 font-medium text-muted-foreground">
                          {DAY_LABELS[day]}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {slots.map((slot) => (
                            <span
                              key={slot.id}
                              className="rounded-md bg-primary/10 px-1.5 py-0.5 text-primary"
                            >
                              {convertTime(
                                slot.startTime,
                                slot.timezone,
                                clientTimezone,
                              )}
                              –
                              {convertTime(
                                slot.endTime,
                                slot.timezone,
                                clientTimezone,
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
