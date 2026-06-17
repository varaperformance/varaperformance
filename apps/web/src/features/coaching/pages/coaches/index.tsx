import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { SuccessResponse } from '@varaperformance/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { ScrollIndicator } from '@/components/ui/scroll-indicator';
import api from '@/lib/api';
import {
  useCoaches,
  formatPrice,
  specialtyConfig,
  type CoachSpecialty,
  type CoachListItem,
} from '@/features/coaching';
import { useAuth } from '@/features/auth';

const COACHES_PER_PAGE = 12;

const calculatePlatformFeeCents = (
  basePriceInCents: number,
  feePercent: number,
) => Math.round(basePriceInCents * (feePercent / 100));

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) return 'C';

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function getDesignationBadge(designation: 'CERTIFIED' | 'INFLUENCER') {
  if (designation === 'INFLUENCER') {
    return {
      label: 'Influencer',
      className: 'bg-orange-100 text-orange-700',
    };
  }

  return {
    label: 'Certified',
    className: 'bg-blue-100 text-blue-700',
  };
}

const CoachesPage = () => {
  const { isAuthenticated } = useAuth();
  const [selectedSpecialty, setSelectedSpecialty] = useState<
    CoachSpecialty | 'all'
  >('all');
  const isMobile = useIsMobile();
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build filters for API query
  const filters = {
    specialty: selectedSpecialty === 'all' ? undefined : selectedSpecialty,
    available: showAvailableOnly ? true : undefined,
    search: debouncedSearch || undefined,
    page,
    limit: COACHES_PER_PAGE,
    sortBy: 'rating' as const,
    sortOrder: 'desc' as const,
  };

  const { data, isLoading, isError } = useCoaches(filters);

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
  const platformFeePercent = platformFeeData?.data?.percent;

  const coaches = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;
  const hasMore = coaches.length < total && page * COACHES_PER_PAGE < total;

  const featuredCoaches = coaches.filter((c: CoachListItem) => c.isFeatured);
  const regularCoaches = coaches.filter((c: CoachListItem) => !c.isFeatured);

  // Helper to reset page when filters change
  const handleSpecialtyChange = (specialty: CoachSpecialty | 'all') => {
    setSelectedSpecialty(specialty);
    setPage(1);
  };

  const handleAvailableChange = (checked: boolean) => {
    setShowAvailableOnly(checked);
    setPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Load more function
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setPage((prev) => prev + 1);
  }, [isLoading, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  // Helper to get display price
  const getDisplayPrice = (coach: CoachListItem) => {
    if (coach.startingPrice) {
      if (platformFeePercent === undefined) {
        return `Starting at ${formatPrice(coach.startingPrice)}`;
      }
      const feeInCents = calculatePlatformFeeCents(
        coach.startingPrice,
        platformFeePercent,
      );
      return formatPrice(coach.startingPrice + feeInCents);
    }
    return 'View profile for pricing';
  };

  // Get coach display name (from profile or fallback)
  const getCoachName = (coach: CoachListItem) => {
    return coach.profile?.displayName || 'Coach';
  };

  // Get coach avatar
  const getCoachAvatar = (coach: CoachListItem) => {
    return coach.profile?.avatarUrl || null;
  };

  // Format experience years
  const formatExperience = (years: number) => {
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section with Integrated Search */}
      <section className="relative overflow-hidden bg-linear-to-b from-muted/50 to-background pb-8 pt-16 md:pt-24">
        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-0 h-80 w-80 animate-pulse rounded-full bg-primary/20 blur-3xl" />
          <div
            className="absolute -right-40 top-20 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl"
            style={{ animationDelay: '1s' }}
          />
          <div
            className="absolute bottom-0 left-1/3 h-64 w-64 animate-pulse rounded-full bg-primary/15 blur-3xl"
            style={{ animationDelay: '2s' }}
          />
        </div>

        {/* Grid pattern overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-size-[4rem_4rem]" />

        <div className="container relative">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Expert Coaches
            </p>
            <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              Find Your{' '}
              <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Perfect
              </span>{' '}
              Coach
            </h1>
            <p className="mb-8 text-muted-foreground">
              Connect with expert coaches who specialize in your goals
            </p>

            {/* Modern Search Bar */}
            <div className="relative mx-auto max-w-xl">
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <Input
                  type="search"
                  placeholder="Search coaches by name, city, or specialty..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-12 rounded-full border-border/50 bg-background pl-12 pr-4 shadow-sm transition-shadow focus:shadow-md"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="border-b border-border/50 py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-12">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">50+</span>
              <span className="text-muted-foreground">Verified Coaches</span>
            </div>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">10,000+</span>
              <span className="text-muted-foreground">Members Coached</span>
            </div>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="font-semibold">4.9</span>
              <span className="text-muted-foreground">Avg Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-40 border-b border-border/50 bg-background/95 py-4 backdrop-blur-sm">
        <div className="container">
          <p className="mb-3 text-xs text-muted-foreground">
            {platformFeePercent === undefined
              ? 'Displayed starting prices include the platform fee charged at checkout.'
              : `Displayed starting prices include the ${platformFeePercent}% platform fee charged at checkout.`}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Specialty Pills */}
            <ScrollIndicator>
              <div className="flex items-center gap-2 pb-1">
                <button
                  onClick={() => handleSpecialtyChange('all')}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                    selectedSpecialty === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                  )}
                >
                  All
                </button>
                {(Object.keys(specialtyConfig) as CoachSpecialty[]).map(
                  (specialty) => (
                    <button
                      key={specialty}
                      onClick={() => handleSpecialtyChange(specialty)}
                      className={cn(
                        'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                        selectedSpecialty === specialty
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                      )}
                    >
                      {specialtyConfig[specialty].label}
                    </button>
                  ),
                )}
              </div>
            </ScrollIndicator>

            {/* Available Toggle */}
            <div className="flex shrink-0 items-center gap-2">
              <Switch
                id="available-now"
                checked={showAvailableOnly}
                onCheckedChange={handleAvailableChange}
              />
              <Label
                htmlFor="available-now"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Available now
              </Label>
            </div>
          </div>
        </div>
      </section>

      {/* No Results State */}
      {!isLoading && coaches.length === 0 && (
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-md text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <svg
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold">No coaches found</h3>
              <p className="mb-6 text-muted-foreground">
                {isError
                  ? 'Failed to load coaches. Please try again.'
                  : 'Try adjusting your filters or search terms to find more coaches.'}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  handleSearchChange('');
                  handleSpecialtyChange('all');
                  handleAvailableChange(false);
                }}
              >
                Clear all filters
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Featured Coaches */}
      {coaches.length > 0 && featuredCoaches.length > 0 && (
        <section className="py-12">
          <div className="container">
            <h2 className="mb-8 flex items-center gap-2 text-2xl font-bold">
              <svg
                className="h-6 w-6 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Featured Coaches
            </h2>
            <div className={cn('grid gap-6', !isMobile && 'md:grid-cols-2')}>
              {featuredCoaches.map((coach) => (
                <Card
                  key={coach.id}
                  className="group overflow-hidden border-primary/20 bg-linear-to-br from-primary/5 to-transparent"
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative h-48 w-full shrink-0 overflow-hidden sm:h-auto sm:w-48">
                        {getCoachAvatar(coach) ? (
                          <img
                            src={getCoachAvatar(coach) ?? undefined}
                            alt={getCoachName(coach)}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/15 via-primary/5 to-emerald-500/10 text-3xl font-bold text-primary">
                            {getInitials(getCoachName(coach))}
                          </div>
                        )}
                        {coach.isAvailable && (
                          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-green-500/90 px-2 py-1 text-xs font-medium text-white">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                            Available
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="mb-2">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                              getDesignationBadge(coach.designation).className,
                            )}
                          >
                            {getDesignationBadge(coach.designation).label}
                          </span>
                        </div>
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {coach.specialties.map((s) => (
                            <span
                              key={s}
                              className={cn(
                                'rounded-full px-2 py-0.5 text-xs font-medium',
                                specialtyConfig[s]?.color ||
                                  'bg-muted text-muted-foreground',
                              )}
                            >
                              {specialtyConfig[s]?.label || s}
                            </span>
                          ))}
                        </div>
                        <h3 className="text-xl font-bold">
                          {getCoachName(coach)}
                        </h3>
                        <p className="text-sm text-primary">{coach.title}</p>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {coach.bio}
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <svg
                              className="h-4 w-4 text-yellow-500"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="font-medium">
                              {coach.rating.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">
                              ({coach.reviewCount})
                            </span>
                          </div>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            {coach.clientCount} clients
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            {formatExperience(coach.experienceYears)}
                          </span>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-4">
                          <span className="text-lg font-bold text-primary">
                            {getDisplayPrice(coach)}
                          </span>
                          <Button size="sm" asChild>
                            <Link to={`/coaches/${coach.slug}`}>
                              View Profile
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Coaches */}
      {coaches.length > 0 && (
        <section className="py-12">
          <div className="container">
            <h2 className="mb-8 text-2xl font-bold">
              {featuredCoaches.length > 0 ? 'All Coaches' : 'Coaches'}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({total} {total === 1 ? 'coach' : 'coaches'})
              </span>
            </h2>
            <div
              className={cn(
                'grid gap-6',
                !isMobile && 'sm:grid-cols-2 lg:grid-cols-3',
              )}
            >
              {regularCoaches.map((coach) => (
                <Card
                  key={coach.id}
                  className="group overflow-hidden transition-shadow hover:shadow-lg"
                >
                  <CardContent className="p-0">
                    <div className="relative h-48 overflow-hidden">
                      {getCoachAvatar(coach) ? (
                        <img
                          src={getCoachAvatar(coach) ?? undefined}
                          alt={getCoachName(coach)}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/20 via-primary/5 to-emerald-500/10 text-4xl font-bold text-primary">
                          {getInitials(getCoachName(coach))}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                      {coach.isAvailable ? (
                        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-green-500/90 px-2 py-1 text-xs font-medium text-white">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                          Available
                        </div>
                      ) : (
                        <div className="absolute left-3 top-3 rounded-full bg-muted/90 px-2 py-1 text-xs font-medium">
                          Waitlist
                        </div>
                      )}
                      <div
                        className={cn(
                          'absolute right-3 top-3 rounded-full px-2 py-1 text-xs font-medium',
                          getDesignationBadge(coach.designation).className,
                        )}
                      >
                        {getDesignationBadge(coach.designation).label}
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex flex-wrap gap-1.5">
                          {coach.specialties.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
                            >
                              {specialtyConfig[s]?.label || s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="mb-1 flex items-start justify-between">
                        <div>
                          <h3 className="font-bold">{getCoachName(coach)}</h3>
                          <p className="text-sm text-primary">{coach.title}</p>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <svg
                            className="h-4 w-4 text-yellow-500"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="font-medium">
                            {coach.rating.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {coach.bio}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {formatExperience(coach.experienceYears)} exp
                        </span>
                        <span>•</span>
                        <span>{coach.clientCount} clients</span>
                        <span>•</span>
                        <span>{coach.location}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                        <span className="font-bold text-primary">
                          {getDisplayPrice(coach)}
                        </span>
                        <Button
                          size="sm"
                          variant={coach.isAvailable ? 'default' : 'outline'}
                          asChild
                        >
                          <Link to={`/coaches/${coach.slug}`}>
                            View Profile
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More / Infinite Scroll Trigger */}
            {hasMore && (
              <div
                ref={loadMoreRef}
                className="mt-8 flex flex-col items-center justify-center py-8"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm text-muted-foreground">
                      Loading more coaches...
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Showing {coaches.length} of {total} coaches
                  </p>
                )}
              </div>
            )}

            {!hasMore && total > COACHES_PER_PAGE && (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                You've seen all {total} coaches
              </p>
            )}
          </div>
        </section>
      )}

      {/* Become a Coach CTA */}
      <section className="border-t border-border/50 bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold">Are you a coach?</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join our platform and reach thousands of individuals looking for
              expert guidance. Set your own rates, manage your schedule, and
              grow your coaching business.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="shadow-lg shadow-primary/25" asChild>
                <Link
                  to={
                    isAuthenticated
                      ? '/coaches/apply'
                      : `/login?redirect=${encodeURIComponent('/coaches/apply')}`
                  }
                >
                  Apply to Coach
                </Link>
              </Button>
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoachesPage;
