import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate, useLocation } from 'react-router';
import type { SuccessResponse } from '@varaperformance/core';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { formatCentsToCyclePrice } from '@/lib/pricing';
import { shareContent, canShare } from '@/lib/share';
import { buildDeepLinkUrl } from '@/lib/deep-links';
import api from '@/lib/api';
import {
  useCoach,
  useCoachReviews,
  useCreateCoachReview,
  specialtyConfig,
  type CoachSpecialty,
} from '@/features/coaching';
import { useAuth } from '@/features/auth';

const calculatePlatformFeeCents = (
  basePriceInCents: number,
  feePercent: number,
) => Math.round(basePriceInCents * (feePercent / 100));

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) return 'C';

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
};

const CoachProfilePage = () => {
  const isMobile = useIsMobile();
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const createReview = useCreateCoachReview();

  // Fetch coach data from API
  const { data: coachData, isLoading, isError } = useCoach(slug);

  const coach = coachData?.data;
  const coachName = coach?.profile?.displayName || 'Coach';
  const coachAvatar = coach?.profile?.avatarUrl;

  // Fetch reviews using coach.id (UUID) once we have the coach data
  const { data: reviewsData, isLoading: isReviewsLoading } = useCoachReviews(
    coach?.id,
  );
  const reviews = reviewsData?.success ? reviewsData.data : null;

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

  const handleBookNow = (packageName: string) => {
    setSelectedPackage(packageName);
    navigate(`/booking/${slug}?package=${encodeURIComponent(packageName)}`);
  };

  const submitReview = () => {
    if (!coach?.id) {
      return;
    }

    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    createReview.mutate(
      {
        coachId: coach.id,
        data: {
          coachId: coach.id,
          rating: reviewRating,
          title: reviewTitle.trim() || undefined,
          content: reviewContent.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setReviewTitle('');
          setReviewContent('');
        },
      },
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading coach profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !coach) {
    return (
      <div className="container py-20">
        <Card className="mx-auto max-w-md">
          <CardContent className="pt-6 text-center">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <h2 className="mt-4 text-lg font-semibold">Coach Not Found</h2>
            <p className="mt-2 text-muted-foreground">
              We couldn't find this coach. They may no longer be available.
            </p>
            <Button className="mt-6" asChild>
              <Link to="/coaches">Browse All Coaches</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 lg:h-80">
        <div className="h-full w-full bg-linear-to-r from-primary/25 via-primary/10 to-emerald-500/20" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Profile Header */}
      <div className="container relative -mt-20 pb-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-32 w-32 rounded-2xl border-4 border-background shadow-xl">
              <AvatarImage src={coachAvatar ?? undefined} alt={coachName} />
              <AvatarFallback className="rounded-2xl bg-primary/10 text-3xl font-bold text-primary">
                {getInitials(coachName)}
              </AvatarFallback>
            </Avatar>
            <div className="pb-2">
              <div className="mb-2 flex flex-wrap gap-2">
                {coach.specialties.map((s: CoachSpecialty) => {
                  const config = specialtyConfig[s];
                  return (
                    <span
                      key={s}
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        config?.color || 'bg-gray-500/10 text-gray-500',
                      )}
                    >
                      {config?.label || s}
                    </span>
                  );
                })}
              </div>
              <h1 className="text-3xl font-bold">{coachName}</h1>
              <p className="text-lg text-primary">{coach.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <svg
                    className="h-4 w-4 text-yellow-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="font-medium text-foreground">
                    {coach.rating}
                  </span>
                  <span>({coach.reviewCount} reviews)</span>
                </div>
                <span>•</span>
                <span>{coach.clientCount} clients coached</span>
                <span>•</span>
                <span>{coach.location}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canShare() && slug && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  shareContent({
                    title: coachName,
                    text:
                      coach.title ??
                      `Check out ${coachName} on Vara Performance`,
                    url: buildDeepLinkUrl(`/coaching/${slug}`),
                  })
                }
              >
                Share
              </Button>
            )}
            {coach.isAvailable ? (
              <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                Available for new clients
              </span>
            ) : (
              <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                Currently at capacity
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container pb-20">
        <div
          className={cn(
            'grid gap-8',
            isMobile ? 'grid-cols-1' : 'lg:grid-cols-3',
          )}
        >
          {/* Main Content */}
          <div
            className={cn('space-y-8', isMobile ? 'order-1' : 'lg:col-span-2')}
          >
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-muted-foreground">
                  {coach.bio}
                </p>
              </CardContent>
            </Card>

            {/* Certifications */}
            <Card>
              <CardHeader>
                <CardTitle>Certifications & Qualifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {coach.designation === 'INFLUENCER' ? (
                    <span className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm">
                      Influencer
                    </span>
                  ) : coach.certifications.length > 0 ? (
                    coach.certifications.map((cert) => (
                      <span
                        key={cert}
                        className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm"
                      >
                        {cert}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No certifications listed.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Reviews
                  <span className="text-sm font-normal text-muted-foreground">
                    {coach.reviewCount} total
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Rating Summary */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg
                    className="h-5 w-5 text-yellow-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="text-lg font-semibold text-foreground">
                    {coach.rating}
                  </span>
                  <span>average from {coach.reviewCount} reviews</span>
                </div>

                {/* Review Form */}
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="mb-3 font-medium">Write a review</p>
                  {!isAuthenticated && (
                    <p className="mb-3 text-sm text-muted-foreground">
                      Log in to leave a review for this coach.
                    </p>
                  )}
                  <div className="grid gap-3">
                    <div>
                      <p className="mb-1 text-sm">Rating</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            className="rounded p-1"
                            onClick={() => setReviewRating(value)}
                            disabled={
                              !isAuthenticated || createReview.isPending
                            }
                            aria-label={`Rate ${value} stars`}
                          >
                            <svg
                              className={cn(
                                'h-5 w-5',
                                value <= reviewRating
                                  ? 'text-yellow-500'
                                  : 'text-muted',
                              )}
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Input
                      placeholder="Review title (optional)"
                      value={reviewTitle}
                      onChange={(event) => setReviewTitle(event.target.value)}
                      disabled={!isAuthenticated || createReview.isPending}
                    />

                    <Textarea
                      placeholder="Share your experience with this coach (optional)"
                      rows={4}
                      value={reviewContent}
                      onChange={(event) => setReviewContent(event.target.value)}
                      disabled={!isAuthenticated || createReview.isPending}
                    />

                    <div className="flex justify-end">
                      <Button
                        onClick={submitReview}
                        disabled={createReview.isPending}
                      >
                        {isAuthenticated
                          ? createReview.isPending
                            ? 'Submitting...'
                            : 'Submit Review'
                          : 'Log In to Review'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Reviews List */}
                {isReviewsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted" />
                          <div className="space-y-1">
                            <div className="h-4 w-24 rounded bg-muted" />
                            <div className="h-3 w-16 rounded bg-muted" />
                          </div>
                        </div>
                        <div className="h-16 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : reviews && reviews.items.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.items.map((review) => (
                      <div
                        key={review.id}
                        className="border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-start gap-3">
                          {review.user.avatarUrl ? (
                            <img
                              src={review.user.avatarUrl}
                              alt={review.user.displayName || 'User'}
                              className="h-10 w-10 shrink-0 rounded-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                              {(review.user.displayName ||
                                'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">
                                {review.user.displayName || 'Anonymous'}
                              </p>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={cn(
                                      'h-4 w-4',
                                      i < review.rating
                                        ? 'text-yellow-500'
                                        : 'text-muted',
                                    )}
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                  </svg>
                                ))}
                              </div>
                            </div>
                            {review.title && (
                              <p className="text-sm font-medium mt-1">
                                {review.title}
                              </p>
                            )}
                            {review.content && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {review.content}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString()}
                              {review.isVerified && (
                                <span className="ml-2 inline-flex items-center gap-1 text-green-500">
                                  <svg
                                    className="h-3 w-3"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Verified
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : coach.reviewCount === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No reviews yet. Be the first to leave a review!
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Packages */}
          <div className={cn('space-y-6', isMobile && 'order-2')}>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Coaching Packages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Displayed prices include the {platformFeePercent}% platform
                  fee charged at checkout.
                </p>
                {coach.packages.map((pkg, idx) => {
                  const platformFeeCents = calculatePlatformFeeCents(
                    pkg.priceInCents,
                    platformFeePercent,
                  );
                  const finalPriceInCents = pkg.priceInCents + platformFeeCents;

                  return (
                    <div
                      key={pkg.id}
                      className={cn(
                        'relative rounded-xl border p-4 transition-all',
                        idx === 1
                          ? 'border-primary bg-primary/5'
                          : 'border-border',
                        selectedPackage === pkg.name && 'ring-2 ring-primary',
                      )}
                    >
                      {idx === 1 && (
                        <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                          Most Popular
                        </span>
                      )}
                      <div className="mb-3 flex items-baseline justify-between">
                        <h4 className="font-semibold">{pkg.name}</h4>
                        <span className="text-lg font-bold text-primary">
                          {formatCentsToCyclePrice(
                            finalPriceInCents,
                            pkg.billingCycle,
                          )}
                        </span>
                      </div>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Includes{' '}
                        {formatCentsToCyclePrice(
                          platformFeeCents,
                          pkg.billingCycle,
                        )}{' '}
                        platform fee.
                      </p>
                      <ul className="mb-4 space-y-2">
                        {pkg.features.map((feature: string) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <svg
                              className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
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
                      <Button
                        className="w-full"
                        variant={idx === 1 ? 'default' : 'outline'}
                        onClick={() => handleBookNow(pkg.name)}
                        disabled={!coach.isAvailable}
                      >
                        {coach.isAvailable ? 'Book Now' : 'Join Waitlist'}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="font-medium">
                      {coach.experienceYears} years
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Clients Coached
                    </span>
                    <span className="font-medium">{coach.clientCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{coach.location}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Back Link */}
            <Button variant="ghost" className="w-full" asChild>
              <Link to="/coaches">
                <svg
                  className="mr-2 h-4 w-4"
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
                Back to all coaches
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachProfilePage;
