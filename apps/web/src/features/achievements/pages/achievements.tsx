import { useMemo, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { maybePromptReview } from '@/lib/app-review';
import {
  Lock,
  Trophy,
  Dumbbell,
  Flame,
  UtensilsCrossed,
  Users,
  MessageCircle,
  ShoppingBag,
  Award,
  Lightbulb,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useAchievements,
  useMyAchievements,
  useShareAchievement,
} from '@/features/achievements';
import { hapticsNotification } from '@/lib/haptics';
import type { AchievementResponse } from '@varaperformance/core';

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; stripe: string; icon: typeof Trophy }
> = {
  WORKOUT: {
    label: 'Training',
    color: 'emerald',
    stripe: 'from-emerald-500/70 to-teal-500/70',
    icon: Dumbbell,
  },
  NUTRITION: {
    label: 'Nutrition',
    color: 'rose',
    stripe: 'from-rose-500/70 to-pink-500/70',
    icon: UtensilsCrossed,
  },
  STREAK: {
    label: 'Streaks',
    color: 'orange',
    stripe: 'from-orange-500/70 to-amber-500/70',
    icon: Flame,
  },
  SOCIAL: {
    label: 'Community',
    color: 'blue',
    stripe: 'from-blue-500/70 to-cyan-500/70',
    icon: MessageCircle,
  },
  COACHING: {
    label: 'Coaching',
    color: 'violet',
    stripe: 'from-violet-500/70 to-purple-500/70',
    icon: Users,
  },
  COMMERCE: {
    label: 'Commerce',
    color: 'amber',
    stripe: 'from-amber-500/70 to-yellow-500/70',
    icon: ShoppingBag,
  },
};

export default function AchievementsPage() {
  const { data: allData, isLoading: loadingAll } = useAchievements();
  const { data: myData, isLoading: loadingMy } = useMyAchievements();
  const shareMutation = useShareAchievement();

  const allAchievements = useMemo(() => allData?.data?.items ?? [], [allData]);
  const myAchievements = useMemo(() => myData?.data?.items ?? [], [myData]);

  const handleShare = async (achievementId: string) => {
    try {
      await shareMutation.mutateAsync(achievementId);
      toast.success('Achievement shared to Elevate!');
      maybePromptReview();
    } catch {
      toast.error('Already shared or unable to share');
    }
  };

  const unlockedIds = useMemo(
    () => new Set(myAchievements.map((ua) => ua.achievement.id)),
    [myAchievements],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, AchievementResponse[]>();
    for (const a of allAchievements) {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    }
    return map;
  }, [allAchievements]);

  const isLoading = loadingAll || loadingMy;
  const progressPct = allAchievements.length
    ? (myAchievements.length / allAchievements.length) * 100
    : 0;

  const hapticFired = useRef(false);
  useEffect(() => {
    if (!isLoading && myAchievements.length > 0 && !hapticFired.current) {
      hapticFired.current = true;
      void hapticsNotification();
    }
  }, [isLoading, myAchievements.length]);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-yellow-500/10 via-transparent to-amber-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-yellow-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-amber-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Badge Collection
            </p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">
              Achievements
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Unlock badges by reaching milestones across your fitness journey.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                <Award className="h-3.5 w-3.5 text-yellow-500" />
                {isLoading
                  ? '...'
                  : `${myAchievements.length} of ${allAchievements.length} unlocked`}
              </div>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-linear-to-r from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <Trophy className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative mt-4">
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-yellow-500 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {myAchievements.length === 0 && !isLoading && (
          <div className="relative mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/8 px-3 py-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
              <p className="text-xs text-muted-foreground">
                Start logging workouts, tracking habits, and hitting your goals
                to unlock achievements.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Categories */}
      {isLoading ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2].map((j) => (
                  <Card
                    key={j}
                    className="relative overflow-hidden border-muted/70"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-muted" />
                    <CardContent className="pt-5">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : allAchievements.length === 0 ? (
        <Card className="overflow-hidden border-muted/70">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-yellow-500/50" />
              </div>
              <p className="font-medium text-muted-foreground">
                No achievements available yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back soon!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
          {Array.from(grouped.entries()).map(([category, achievements]) => {
            const config = CATEGORY_CONFIG[category] ?? {
              label: category,
              color: 'gray',
              stripe: 'from-gray-500/70 to-gray-400/70',
              icon: Trophy,
            };
            return (
              <div key={category} className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <config.icon className={`h-5 w-5 text-${config.color}-500`} />
                  {config.label}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {achievements.map((achievement) => {
                    const unlocked = unlockedIds.has(achievement.id);
                    return (
                      <Card
                        key={achievement.id}
                        className={cn(
                          'group relative overflow-hidden border-muted/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                          !unlocked && 'opacity-60',
                        )}
                      >
                        <div
                          className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r ${
                            unlocked ? config.stripe : 'from-muted to-muted'
                          }`}
                        />
                        <CardContent className="pt-5">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                                unlocked ? 'bg-yellow-500/15' : 'bg-muted',
                              )}
                            >
                              {unlocked ? (
                                <Trophy className="h-5 w-5 text-yellow-500" />
                              ) : (
                                <Lock className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">
                                  {achievement.name}
                                </p>
                                {unlocked && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                                  >
                                    Unlocked
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {achievement.description}
                              </p>
                              {unlocked && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1.5 h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => handleShare(achievement.id)}
                                  disabled={shareMutation.isPending}
                                >
                                  <Share2 className="h-3 w-3" />
                                  Share to Elevate
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
