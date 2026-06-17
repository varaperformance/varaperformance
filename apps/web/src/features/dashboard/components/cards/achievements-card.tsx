import { Link } from 'react-router';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy,
  Flame,
  Dumbbell,
  Target,
  Zap,
  Heart,
  Star,
  Medal,
  Crown,
  Award,
  type LucideIcon,
} from 'lucide-react';

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  Trophy,
  Flame,
  Dumbbell,
  Target,
  Zap,
  Heart,
  Star,
  Medal,
  Crown,
  Award,
};

function resolveAchievementIcon(iconName?: string): LucideIcon | null {
  if (!iconName) return null;
  const pascal = iconName
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  return ACHIEVEMENT_ICONS[pascal] ?? null;
}

export interface UserAchievement {
  id: string;
  unlockedAt: string;
  achievement?: {
    name?: string;
    icon?: string;
  };
}

export function AchievementsCard({
  myAchievements,
  isLoading,
}: {
  myAchievements: UserAchievement[] | undefined;
  isLoading: boolean;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-4 w-4 text-yellow-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          Achievements
        </CardTitle>
        <CardDescription>Badges you've earned</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : myAchievements && myAchievements.length > 0 ? (
          <div className="space-y-2">
            {myAchievements.slice(0, 5).map((ua) => (
              <div
                key={ua.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2"
              >
                <span className="text-base">
                  {(() => {
                    const Icon = resolveAchievementIcon(ua.achievement?.icon);
                    return Icon ? <Icon className="h-4 w-4" /> : '🏅';
                  })()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {ua.achievement?.name ?? 'Achievement'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(ua.unlockedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="mt-1 w-full" asChild>
              <Link to="/achievements">View All</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-6 text-center">
            <p className="text-sm font-medium">No achievements yet</p>
            <p className="text-xs text-muted-foreground">
              Keep training to unlock badges.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
