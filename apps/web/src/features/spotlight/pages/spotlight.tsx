import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Flame, Play, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { spotlightSelectors, usePublicSpotlight } from '@/features/spotlight';
import { useAuth } from '@/features/auth';
import api from '@/lib/api';
import type { SiteStatResponse } from '@varaperformance/core';

interface StatsApiResponse {
  success: boolean;
  data: SiteStatResponse[];
}

const formatStatValue = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

const fetchSiteStats = async (): Promise<Record<string, string>> => {
  const response = await api.get<StatsApiResponse>('/status/stats');
  const map: Record<string, string> = {};
  for (const s of response.data.data) {
    map[s.key] = s.value;
  }
  return map;
};

const InstagramIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TwitterIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

function formatMemberSince(value: string | null) {
  if (!value) {
    return 'Recent member';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });
}

const SpotlightPage = () => {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const { data, isLoading, isError } = usePublicSpotlight(24);
  const spotlightStories = data?.data ?? [];
  const { featured, previous } = spotlightSelectors(spotlightStories);

  const { data: stats } = useQuery({
    queryKey: ['site-stats'],
    queryFn: fetchSiteStats,
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  const activeUsers = stats?.active_users
    ? formatStatValue(Number(stats.active_users))
    : '--';
  const personalRecords = stats?.personal_records
    ? formatStatValue(Number(stats.personal_records))
    : '--';
  const workoutsLogged = stats?.workouts_logged
    ? formatStatValue(Number(stats.workouts_logged))
    : '--';

  return (
    <div className="flex flex-col">
      {isLoading && (
        <section className="container py-28 text-center text-muted-foreground">
          Loading spotlight stories...
        </section>
      )}

      {isError && (
        <section className="container py-28 text-center">
          <h2 className="text-2xl font-semibold">Unable to load spotlight</h2>
          <p className="mt-3 text-muted-foreground">
            Please try again in a moment.
          </p>
        </section>
      )}

      {/* Featured Member Section */}
      {!isLoading && !isError && featured && (
        <section className="relative">
          {/* Full-width featured hero */}
          <div
            className={`relative w-full transition-all duration-700 ease-out ${playingVideo === featured.id ? 'aspect-video' : 'min-h-screen'}`}
          >
            {playingVideo === featured.id && featured.videoUrl ? (
              <div className="absolute inset-0 bg-black">
                <iframe
                  src={`${featured.videoUrl}?autoplay=1`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <button
                  onClick={() => setPlayingVideo(null)}
                  className="absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <>
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img
                    src={featured.imageUrl}
                    alt={featured.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/70 to-transparent" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/30" />
                </div>

                {/* Page Title - Top */}
                <div className="absolute inset-x-0 top-0 z-10">
                  <div className="container pt-8">
                    <p className="text-sm font-medium uppercase tracking-widest text-white/60">
                      Member Spotlight
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="container relative flex h-full min-h-screen items-center py-20">
                  <div className="max-w-2xl">
                    <div className="mb-6 flex items-center gap-3">
                      <Badge className="border-0 bg-primary px-3 py-1 text-primary-foreground">
                        <Flame className="mr-1.5 h-3.5 w-3.5" />
                        Featured This Month
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-white/20 bg-white/10 text-white backdrop-blur-sm"
                      >
                        {featured.sport}
                      </Badge>
                    </div>

                    <h2 className="mb-2 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
                      {featured.name}
                    </h2>
                    <p className="mb-6 text-lg text-white/60">
                      {featured.username ?? `@${featured.slug}`}
                    </p>

                    <p className="mb-4 text-2xl font-medium text-white/90 md:text-3xl">
                      {featured.tagline}
                    </p>
                    <p className="mb-6 max-w-xl text-base text-white/70 leading-relaxed">
                      {featured.story}
                    </p>

                    {featured.quote && (
                      <blockquote className="mb-8 border-l-2 border-primary pl-4">
                        <p className="text-lg italic text-white/80">
                          &ldquo;{featured.quote}&rdquo;
                        </p>
                      </blockquote>
                    )}

                    <div className="mb-8 flex flex-wrap gap-2">
                      {featured.achievements.map((achievement) => (
                        <Badge
                          key={achievement}
                          variant="secondary"
                          className="bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                        >
                          {achievement}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      {featured.videoUrl && (
                        <button
                          onClick={() => setPlayingVideo(featured.id)}
                          className="group flex items-center gap-3 rounded-full bg-white px-6 py-3 font-medium text-black transition-all hover:bg-white/90 hover:shadow-xl"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-110">
                            <Play
                              className="h-4 w-4 ml-0.5"
                              fill="currentColor"
                            />
                          </div>
                          Watch Their Story
                        </button>
                      )}

                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Calendar className="h-4 w-4" />
                        Member since {formatMemberSince(featured.memberSince)}
                      </div>

                      {(featured.twitterUrl || featured.instagramUrl) && (
                        <div className="flex gap-3">
                          {featured.twitterUrl && (
                            <a
                              href={featured.twitterUrl}
                              className="text-white/60 transition-colors hover:text-white"
                            >
                              <TwitterIcon />
                            </a>
                          )}
                          {featured.instagramUrl && (
                            <a
                              href={featured.instagramUrl}
                              className="text-white/60 transition-colors hover:text-white"
                            >
                              <InstagramIcon />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Previous Spotlights */}
      <section className="py-24">
        <div className="container">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
                Community
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Previous Spotlights
              </h2>
            </div>
            <Button variant="outline" className="hidden md:flex">
              View All
            </Button>
          </div>

          <div
            className={cn(
              'grid gap-4',
              isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-4',
            )}
          >
            {previous.map((member) => {
              const isPlaying = playingVideo === member.id;
              return (
                <div
                  key={member.id}
                  className={`group relative overflow-hidden rounded-2xl bg-card transition-all duration-500 ${isPlaying ? 'md:col-span-2 lg:col-span-2 lg:row-span-2' : ''}`}
                >
                  <div
                    className={`relative transition-all duration-500 ${isPlaying ? 'aspect-video' : 'aspect-4/5 cursor-pointer'}`}
                    onClick={() =>
                      !isPlaying &&
                      member.videoUrl &&
                      setPlayingVideo(member.id)
                    }
                  >
                    {isPlaying && member.videoUrl ? (
                      <div className="absolute inset-0 bg-black">
                        <iframe
                          src={`${member.videoUrl}?autoplay=1`}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlayingVideo(null);
                          }}
                          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <img
                          src={member.imageUrl}
                          alt={member.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />

                        {/* Play button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-90">
                            {member.videoUrl && (
                              <Play
                                className="h-6 w-6 ml-1"
                                fill="currentColor"
                              />
                            )}
                          </div>
                        </div>

                        {/* Content overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-5">
                          <Badge className="mb-3 border-0 bg-white/10 text-white backdrop-blur-sm">
                            {member.sport}
                          </Badge>
                          <h3 className="mb-1 text-xl font-bold text-white">
                            {member.name}
                          </h3>
                          <p className="mb-3 text-sm text-white/70">
                            {member.tagline}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-white/50">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatMemberSince(member.memberSince)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Button variant="outline">View All Spotlights</Button>
          </div>
        </div>
      </section>

      {!isLoading && !isError && spotlightStories.length === 0 && (
        <section className="container py-24 text-center">
          <h2 className="text-2xl font-semibold">No spotlight stories yet</h2>
          <p className="mt-3 text-muted-foreground">
            Check back soon for featured transformations from the community.
          </p>
        </section>
      )}

      {/* Stats Strip */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="container">
          <div
            className={cn(
              'grid divide-x divide-border/50',
              isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4',
            )}
          >
            <div className="px-4 py-8 text-center md:py-12">
              <p className="text-3xl font-bold md:text-4xl">{activeUsers}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Active members
              </p>
            </div>
            <div className="px-4 py-8 text-center md:py-12">
              <p className="text-3xl font-bold md:text-4xl">
                {personalRecords}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">PRs logged</p>
            </div>
            <div className="px-4 py-8 text-center md:py-12">
              <p className="text-3xl font-bold md:text-4xl">{workoutsLogged}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Workouts logged
              </p>
            </div>
            <div className="px-4 py-8 text-center md:py-12">
              <p className="text-3xl font-bold md:text-4xl">
                {spotlightStories.length}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Featured</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center md:px-16 md:py-24">
            {/* Background pattern */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_40%)]" />

            <div className="relative">
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-primary-foreground md:text-5xl">
                Want to be featured?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-primary-foreground/80">
                Share your transformation story with our community. We spotlight
                members who inspire others through dedication and consistent
                progress.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="h-12 px-8 font-semibold"
                >
                  <Link
                    to={
                      isAuthenticated
                        ? '/spotlight/submit'
                        : `/login?redirect=${encodeURIComponent('/spotlight/submit')}`
                    }
                  >
                    Submit Your Story
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SpotlightPage;
