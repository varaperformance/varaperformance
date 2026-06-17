import { useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy,
  Plus,
  Users,
  Calendar,
  Target,
  Flame,
  Star,
} from 'lucide-react';
import { useChallenges, useMyChallenges } from '@/features/challenge';
import { CreateChallengeDialog } from './create-challenge';
import type { ChallengeResponse } from '@varaperformance/core';

const STATUS_BADGE: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  UPCOMING: { label: 'Upcoming', variant: 'outline' },
  ACTIVE: { label: 'Active', variant: 'default' },
  COMPLETED: { label: 'Completed', variant: 'secondary' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
  DRAFT: { label: 'Draft', variant: 'outline' },
};

const TYPE_LABEL: Record<string, string> = {
  WORKOUT_COUNT: 'Workouts',
  STREAK_DAYS: 'Streak',
  WEIGHT_LOSS: 'Weight Loss',
  STEPS_TOTAL: 'Steps',
  PR_COUNT: 'Personal Records',
  CUSTOM: 'Custom',
};

function ChallengeCard({ challenge }: { challenge: ChallengeResponse }) {
  const statusInfo = STATUS_BADGE[challenge.status] ?? STATUS_BADGE.UPCOMING;
  const [now] = useState(Date.now);
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(challenge.endDate).getTime() - now) / 86400000),
  );

  return (
    <Link to={`/challenges/${challenge.id}`}>
      <Card className="group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        {challenge.isOfficial && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-yellow-500/70 to-amber-500/70" />
        )}
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm truncate">
                  {challenge.title}
                </h3>
                {challenge.isOfficial && (
                  <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                )}
                <Badge variant={statusInfo.variant} className="text-[10px]">
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {challenge.description}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {challenge.goalValue} {challenge.goalUnit}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {challenge.participantCount}
              {challenge.maxParticipants ? `/${challenge.maxParticipants}` : ''}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {challenge.status === 'ACTIVE'
                ? `${daysLeft}d left`
                : new Date(challenge.startDate).toLocaleDateString()}
            </span>
            <span className="text-[10px] opacity-70">
              {TYPE_LABEL[challenge.type] ?? challenge.type}
            </span>
          </div>

          {challenge.isParticipant && challenge.myProgress !== undefined && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Your progress</span>
                <span className="font-medium">
                  {challenge.myProgress}/{challenge.goalValue}
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (challenge.myProgress / challenge.goalValue) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function ChallengesGrid({
  challenges,
  emptyMessage,
}: {
  challenges: ChallengeResponse[];
  emptyMessage: string;
}) {
  if (challenges.length === 0) {
    return (
      <Card className="overflow-hidden border-muted/70">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-blue-500/50" />
            </div>
            <p className="font-medium text-muted-foreground">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {challenges.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge} />
      ))}
    </div>
  );
}

export default function ChallengesPage() {
  const [tab, setTab] = useState('browse');
  const [createOpen, setCreateOpen] = useState(false);
  const { data: browseData, isLoading: loadingBrowse } = useChallenges();
  const { data: myData, isLoading: loadingMy } = useMyChallenges();

  const allChallenges = browseData?.data?.items ?? [];
  const officialChallenges = allChallenges.filter((c) => c.isOfficial);
  const communityChallenges = allChallenges.filter((c) => !c.isOfficial);
  const myChallenges = myData?.data;

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-blue-500/10 via-transparent to-cyan-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Push Your Limits
            </p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">
              Challenges
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Join official Vara challenges or create your own to compete with
              the community.
            </p>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create Challenge
          </Button>
        </div>
      </section>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="browse" className="gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            My Challenges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-4 space-y-6">
          {loadingBrowse ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden border-muted/70">
                  <CardContent className="pt-5 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {officialChallenges.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Vara Challenges
                  </h2>
                  <ChallengesGrid
                    challenges={officialChallenges}
                    emptyMessage="No official challenges right now"
                  />
                </div>
              )}

              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Community Challenges
                </h2>
                <ChallengesGrid
                  challenges={communityChallenges}
                  emptyMessage="No community challenges yet — be the first to create one!"
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="my" className="mt-4 space-y-6">
          {loadingMy ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden border-muted/70">
                  <CardContent className="pt-5 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Challenges I Joined</h2>
                <ChallengesGrid
                  challenges={myChallenges?.joined ?? []}
                  emptyMessage="You haven't joined any challenges yet"
                />
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Challenges I Created</h2>
                <ChallengesGrid
                  challenges={myChallenges?.created ?? []}
                  emptyMessage="You haven't created any challenges yet"
                />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <CreateChallengeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
