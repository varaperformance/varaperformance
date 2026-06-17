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

export interface Challenge {
  id: string;
  title: string;
  type: string;
  status: string;
  participantCount?: number;
}

export interface MyChallenges {
  joined?: Challenge[];
  created?: Challenge[];
}

export function ChallengesCard({
  myChallenges,
  isLoading,
}: {
  myChallenges: MyChallenges | undefined;
  isLoading: boolean;
}) {
  const allChallenges = [
    ...(myChallenges?.joined ?? []),
    ...(myChallenges?.created ?? []),
  ];
  const activeChallenges = allChallenges.filter((c) => c.status === 'ACTIVE');

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-4 w-4 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
            />
          </svg>
          Challenges
        </CardTitle>
        <CardDescription>Active challenges you've joined</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : allChallenges.length > 0 ? (
          <div className="space-y-2">
            {activeChallenges.length > 0 ? (
              activeChallenges.slice(0, 5).map((challenge) => (
                <Link
                  key={challenge.id}
                  to={`/challenges/${challenge.id}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {challenge.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {challenge.type} • {challenge.participantCount ?? 0}{' '}
                      participants
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed py-4 text-center">
                <p className="text-sm font-medium">No active challenges</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  All your challenges have ended.
                </p>
              </div>
            )}
            <Button variant="ghost" size="sm" className="mt-1 w-full" asChild>
              <Link to="/challenges">Browse Challenges</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-6 text-center">
            <p className="text-sm font-medium">No challenges</p>
            <p className="text-xs text-muted-foreground">
              Join challenges to compete with others.
            </p>
            <Button className="mt-2" size="sm" asChild>
              <Link to="/challenges">Browse Challenges</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
