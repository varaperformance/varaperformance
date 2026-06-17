import { Link, useParams } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  MealAttachmentCards,
  PrAttachmentCards,
  RecipeAttachmentCards,
  WorkoutPlanAttachmentCards,
} from '@/components/elevate/attachment-cards';
import { useAuth } from '@/features/auth';
import { usePublicProfileByDisplayName } from '@/features/profile';
import { useUserAchievements } from '@/features/achievements';
import {
  useElevateFeed,
  useGymPartners,
  useSendPartnerRequest,
} from '@/features/social';
import {
  extractMealAttachmentsFromContent,
  extractPrAttachmentsFromContent,
  extractRecipeAttachmentsFromContent,
  extractWorkoutPlanAttachmentsFromContent,
  stripAttachmentMetaFromContent,
} from '@/lib/elevate-attachments';
import {
  Activity,
  Bookmark,
  Dumbbell,
  Flame,
  Users,
  Globe,
  Lock,
  UserPlus,
  Check,
  Clock3,
  MessageCircle,
  Settings,
  ExternalLink,
  MapPin,
  Trophy,
} from 'lucide-react';
import gymCoverImg from '@/assets/images/unsplash/gym-cover.jpg';

const DEFAULT_COVER_IMAGE = gymCoverImg;

const SOCIAL_LINKS: Record<
  string,
  { label: string; href: (value: string) => string }
> = {
  instagram: { label: 'Instagram', href: (v) => `https://instagram.com/${v}` },
  threads: { label: 'Threads', href: (v) => `https://threads.net/@${v}` },
  twitter: { label: 'X', href: (v) => `https://twitter.com/${v}` },
  facebook: { label: 'Facebook', href: (v) => `https://facebook.com/${v}` },
  linkedin: { label: 'LinkedIn', href: (v) => `https://linkedin.com/in/${v}` },
  github: { label: 'GitHub', href: (v) => `https://github.com/${v}` },
};

const SocialIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'twitter':
      return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'threads':
      return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717-1.33 1.66-2.025 4.032-2.048 7.037v.124c.023 3.025.718 5.406 2.066 7.07 1.429 1.762 3.622 2.664 6.52 2.68 2.386-.017 4.258-.61 5.574-1.763 1.263-1.105 1.903-2.546 1.903-4.285 0-1.312-.416-2.33-1.237-3.027-.689-.583-1.546-.894-2.604-.949-.555 1.633-1.452 2.812-2.668 3.506-1.082.618-2.28.813-3.39.576-1.1-.234-2.023-.835-2.668-1.74-.728-1.02-.97-2.347-.668-3.648.506-2.18 2.285-3.682 4.587-3.875.943-.08 1.928.088 2.876.489l.27-.737c-.126-1.252-.61-2.197-1.445-2.813-.793-.586-1.836-.885-3.1-.889-1.263.002-2.306.305-3.1.9-.83.623-1.388 1.524-1.664 2.682l-1.992-.46c.365-1.565 1.131-2.794 2.276-3.652 1.17-.878 2.61-1.326 4.28-1.335h.01c1.668.01 3.108.458 4.28 1.332 1.03.77 1.742 1.832 2.12 3.16.44.126.863.278 1.263.456 1.328.59 2.387 1.52 3.15 2.762.807 1.313 1.217 2.923 1.217 4.782 0 2.29-.837 4.265-2.489 5.875-1.6 1.56-3.834 2.398-6.643 2.493h-.142zm-1.63-8.358c.665.082 1.326-.019 1.87-.284.728-.355 1.29-1.01 1.67-1.94-.64-.158-1.286-.225-1.918-.203-1.378.115-2.331.93-2.58 2.002-.147.632-.023 1.215.364 1.64.263.29.606.47.994.555.005 0 .01 0 .014.002l.1.015.085.012.101.011.096.008.106.005.098.002z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'github':
      return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );
    default:
      return null;
  }
};

const formatPostTypeLabel = (type: string) =>
  type
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function PublicProfilePage() {
  const { displayName = '' } = useParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { data, isLoading } = usePublicProfileByDisplayName(displayName, {
    enabled: displayName.trim().length > 0,
  });
  const { data: publicPostsData, isLoading: isPublicPostsLoading } =
    useElevateFeed({
      page: 1,
      limit: 6,
      userId: data?.success ? data.data.userId : undefined,
    });

  const { data: achievementsData } = useUserAchievements(
    data?.success ? data.data.userId : undefined,
  );

  const isAuthenticated = Boolean(user?.sub);

  const {
    data: acceptedPartners,
    isLoading: isAcceptedPartnersLoading,
    isError: isAcceptedPartnersError,
  } = useGymPartners(
    {
      status: 'ACCEPTED',
      limit: 50,
    },
    { enabled: isAuthenticated },
  );
  const {
    data: pendingPartners,
    isLoading: isPendingPartnersLoading,
    isError: isPendingPartnersError,
  } = useGymPartners(
    {
      status: 'PENDING',
      limit: 50,
    },
    { enabled: isAuthenticated },
  );

  const sendPartnerRequest = useSendPartnerRequest({
    onSuccess: () => toast.success('Gym partner request sent'),
    onError: () => toast.error('Unable to send partner request'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div
          className={cn(
            'grid gap-4',
            isMobile ? 'grid-cols-1' : 'md:grid-cols-3',
          )}
        >
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  if (!data?.success) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <Card className="card-elevated border-border/70 bg-card">
          <CardContent className="space-y-3 p-6">
            <h1 className="text-xl font-semibold">Profile unavailable</h1>
            <p className="text-sm text-muted-foreground">
              This profile is private or does not exist.
            </p>
            <Button asChild variant="outline">
              <Link to="/elevate">Back to Elevate</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = data.data;
  const isOwnProfile = user?.sub === profile.userId;

  const accepted =
    acceptedPartners?.success &&
    acceptedPartners.data.partners.some(
      (partner) => partner.user.id === profile.userId,
    );

  const pendingSent =
    pendingPartners?.success &&
    pendingPartners.data.partners.some(
      (partner) => partner.user.id === profile.userId && partner.isRequester,
    );

  const pendingReceived =
    pendingPartners?.success &&
    pendingPartners.data.partners.some(
      (partner) => partner.user.id === profile.userId && !partner.isRequester,
    );

  const relationshipStatusLoading =
    isAuthenticated &&
    !isOwnProfile &&
    (isAcceptedPartnersLoading || isPendingPartnersLoading);

  const relationshipStatusUnknown =
    isAuthenticated &&
    !isOwnProfile &&
    (isAcceptedPartnersError || isPendingPartnersError);

  const socials = Object.entries(profile.socials).filter(([, value]) =>
    Boolean(value),
  );
  const publicPosts = publicPostsData?.success
    ? publicPostsData.data.posts.filter((post) => post.privacy === 'PUBLIC')
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative h-36 w-full overflow-hidden md:h-44 lg:h-52">
        <img
          src={profile.coverUrl || DEFAULT_COVER_IMAGE}
          alt="Profile cover"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="relative px-4 sm:px-6 lg:px-8 xl:px-10">
        <section className="-mt-12 mb-6 rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || 'Profile avatar'}
                  className="h-24 w-24 rounded-2xl border-2 border-background object-cover shadow-md sm:h-28 sm:w-28"
                />
              ) : (
                <Skeleton className="h-24 w-24 rounded-2xl border-2 border-background sm:h-28 sm:w-28" />
              )}

              <div className="pt-1">
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Elevate Profile
                </p>
                <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
                  @{profile.displayName || 'member'}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1.5">
                    {profile.isProfilePublic ? (
                      <>
                        <Globe className="h-3.5 w-3.5" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        Private
                      </>
                    )}
                  </Badge>
                  {profile.gyms[0] && (
                    <Badge variant="outline" className="gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {profile.gyms[0].name}
                    </Badge>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                  <span>
                    <span className="font-semibold text-foreground">
                      {profile.stats.workouts}
                    </span>{' '}
                    <span className="text-muted-foreground">workouts</span>
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {profile.stats.gymPartners}
                    </span>{' '}
                    <span className="text-muted-foreground">gym partners</span>
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {profile.stats.prsThisYear}
                    </span>{' '}
                    <span className="text-muted-foreground">PRs this year</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-full border border-border/70 bg-background/60 p-1">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/elevate" className="h-9 px-3">
                  Back to Elevate
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              {isOwnProfile ? (
                <Button asChild size="sm" className="h-9">
                  <Link to="/elevate/studio?section=profile" className="px-3">
                    <Settings className="mr-2 h-4 w-4" />
                    Edit in Studio
                  </Link>
                </Button>
              ) : !isAuthenticated ? (
                <Button asChild size="sm" className="h-9 px-3">
                  <Link to="/login">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Log In to Connect
                  </Link>
                </Button>
              ) : relationshipStatusLoading ? (
                <Button disabled size="sm" className="h-9 px-3">
                  <Clock3 className="mr-2 h-4 w-4" />
                  Checking Status
                </Button>
              ) : relationshipStatusUnknown ? (
                <Button asChild variant="secondary" size="sm" className="h-9">
                  <Link to="/partners" className="px-3">
                    <Users className="mr-2 h-4 w-4" />
                    Manage in Partners
                  </Link>
                </Button>
              ) : accepted ? (
                <Button disabled size="sm" className="h-9 px-3">
                  <Check className="mr-2 h-4 w-4" />
                  Gym Partner
                </Button>
              ) : pendingSent ? (
                <Button
                  disabled
                  variant="secondary"
                  size="sm"
                  className="h-9 px-3"
                >
                  <Clock3 className="mr-2 h-4 w-4" />
                  Request Sent
                </Button>
              ) : pendingReceived ? (
                <Button asChild variant="secondary" size="sm" className="h-9">
                  <Link to="/partners" className="px-3">
                    <Clock3 className="mr-2 h-4 w-4" />
                    Respond in Partners
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    sendPartnerRequest.mutate({ receiverId: profile.userId })
                  }
                  disabled={sendPartnerRequest.isPending}
                  size="sm"
                  className="h-9 px-3"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Gym Partner
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="pb-6">
          <Card className="card-elevated border-border/70 bg-card">
            <CardContent className="p-1">
              <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-muted/40 p-1">
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm">
                  Posts
                </button>
                <button className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  About
                </button>
                <button className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  Gyms
                </button>
                <button className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  Socials
                </button>
              </div>
            </CardContent>
          </Card>

          <div
            className={cn(
              'mt-4 grid gap-4',
              isMobile ? 'flex flex-col' : 'lg:grid-cols-[300px_minmax(0,1fr)]',
            )}
          >
            <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <Card className="card-elevated border-border/70 bg-card">
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold">Intro</h3>
                  <p className="mt-3 text-sm text-foreground/90">
                    {profile.bio?.trim() || 'No bio provided yet.'}
                  </p>
                </CardContent>
              </Card>

              <Card className="card-elevated border-border/70 bg-card">
                <CardContent className="p-4">
                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Stats
                    </p>
                    <h3 className="font-semibold">Profile Snapshot</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Dumbbell className="h-4 w-4" />
                        Workouts
                      </span>
                      <span className="text-sm font-semibold">
                        {profile.stats.workouts}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Gym Partners
                      </span>
                      <span className="text-sm font-semibold">
                        {profile.stats.gymPartners}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Flame className="h-4 w-4" />
                        PRs This Year
                      </span>
                      <span className="text-sm font-semibold">
                        {profile.stats.prsThisYear}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {achievementsData?.data?.items &&
                achievementsData.data.items.length > 0 && (
                  <Card className="card-elevated border-border/70 bg-card">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Achievements
                        </h2>
                        <Badge variant="secondary" className="text-[10px]">
                          <Trophy className="mr-1 h-3 w-3" />
                          {achievementsData.data.items.length}
                        </Badge>
                      </div>
                      <div
                        className={cn(
                          'grid gap-2',
                          isMobile ? 'grid-cols-2' : 'grid-cols-3',
                        )}
                      >
                        {achievementsData.data.items.map((ua) => (
                          <div
                            key={ua.id}
                            className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-muted/20 p-2 text-center"
                            title={`${ua.achievement.name} — ${ua.achievement.description}`}
                          >
                            <span className="text-xl">
                              {ua.achievement.icon}
                            </span>
                            <span className="line-clamp-2 text-[10px] font-medium leading-tight">
                              {ua.achievement.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              <Card className="card-elevated border-border/70 bg-card">
                <CardContent className="space-y-3 p-4">
                  <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Socials
                  </h2>
                  {socials.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No social links added.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {socials.map(([key, value]) => {
                        const link = SOCIAL_LINKS[key];
                        if (!link || !value) return null;
                        return (
                          <a
                            key={key}
                            href={link.href(value)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={link.label}
                            aria-label={link.label}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                          >
                            <SocialIcon platform={key} />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="card-elevated border-border/70 bg-card">
                <CardContent className="space-y-3 p-4">
                  <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Gyms
                  </h2>
                  {profile.gyms.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No gyms added yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {profile.gyms.map((gym) => (
                        <div
                          key={gym.id}
                          className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
                        >
                          <p className="text-sm font-medium">{gym.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[gym.city, gym.state, gym.country]
                              .filter(Boolean)
                              .join(', ') || 'Location hidden'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="card-elevated border-primary/20 bg-linear-to-br from-card via-card to-primary/5">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Elevate Feed
                      </p>
                      <p className="mt-1 text-sm text-foreground/90">
                        Public posts from @{profile.displayName || 'member'}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {publicPosts.length} posts
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {isPublicPostsLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Card
                      key={index}
                      className="card-elevated border-border/70 bg-card"
                    >
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-36 w-full rounded-lg" />
                      </CardContent>
                    </Card>
                  ))
                ) : publicPosts.length === 0 ? (
                  <Card className="card-elevated border-border/70 bg-card">
                    <CardContent className="p-8 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <Activity className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <h2 className="text-lg font-semibold">
                        No public posts yet
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        This member has not shared public Elevate updates yet.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  publicPosts.map((post) => {
                    const attachedPrs = extractPrAttachmentsFromContent(
                      post.content,
                    );
                    const attachedRecipes = extractRecipeAttachmentsFromContent(
                      post.content,
                    );
                    const attachedWorkoutPlans =
                      extractWorkoutPlanAttachmentsFromContent(post.content);
                    const attachedMeals = extractMealAttachmentsFromContent(
                      post.content,
                    );
                    const visibleContent = stripAttachmentMetaFromContent(
                      post.content,
                    );

                    return (
                      <Card
                        key={post.id}
                        className="card-elevated card-hoverable border-border/70 bg-card"
                      >
                        <CardContent className="p-4">
                          <div className="mb-4 flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {post.author.avatarUrl ? (
                                <img
                                  src={post.author.avatarUrl}
                                  alt={post.author.displayName || 'Author'}
                                  className="h-11 w-11 rounded-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <Skeleton className="h-11 w-11 rounded-full" />
                              )}
                              <div>
                                <p className="text-sm font-semibold">
                                  {post.author.displayName || 'Member'}
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Globe className="h-3 w-3" />
                                  <span>Public</span>
                                  <span>•</span>
                                  {formatDistanceToNow(
                                    new Date(post.createdAt),
                                    {
                                      addSuffix: true,
                                    },
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase"
                            >
                              {formatPostTypeLabel(post.type)}
                            </Badge>
                          </div>

                          {visibleContent ? (
                            <p className="mb-3 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
                              {visibleContent}
                            </p>
                          ) : null}

                          <PrAttachmentCards attachments={attachedPrs} />
                          <RecipeAttachmentCards
                            attachments={attachedRecipes}
                            linkPublicRecipes
                          />
                          <WorkoutPlanAttachmentCards
                            attachments={attachedWorkoutPlans}
                            linkPublicPlans
                          />
                          <MealAttachmentCards attachments={attachedMeals} />

                          {post.images.length > 0 && (
                            <div
                              className={[
                                'mb-4 grid gap-2 overflow-hidden rounded-xl',
                                post.images.length === 1
                                  ? 'grid-cols-1'
                                  : 'grid-cols-2',
                              ].join(' ')}
                            >
                              {post.images.slice(0, 4).map((image, index) => (
                                <div
                                  key={`${post.id}-${index}`}
                                  className={[
                                    'overflow-hidden rounded-lg border border-border/60 bg-muted/20',
                                    post.images.length === 1
                                      ? 'aspect-video'
                                      : 'aspect-square',
                                  ].join(' ')}
                                >
                                  <img
                                    src={image}
                                    alt={`Post media ${index + 1}`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-border/50 pt-4">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <Flame className="h-3.5 w-3.5" />
                                {post.highFiveCount}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <MessageCircle className="h-3.5 w-3.5" />
                                {post.commentCount}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                              >
                                <Link
                                  to="/elevate"
                                  aria-label="Open in Elevate"
                                >
                                  <Flame className="mr-1.5 h-3.5 w-3.5" />
                                  High-Five
                                </Link>
                              </Button>
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                              >
                                <Link
                                  to="/elevate"
                                  aria-label="Open comments in Elevate"
                                >
                                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                                  Comment
                                </Link>
                              </Button>
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <Link
                                  to="/elevate"
                                  aria-label="Open save in Elevate"
                                >
                                  <Bookmark className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            Interactions open in Elevate.
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!user && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
            <p className="text-sm font-medium text-foreground">
              Log in or create an account to connect with members on Elevate.
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/login">Log In</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
