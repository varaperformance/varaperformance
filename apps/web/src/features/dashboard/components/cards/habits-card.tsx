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

export interface Habit {
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
  currentStreak: number;
  lastCompletedDate: string | null;
}

export function HabitsCard({
  habits,
  isLoading,
  todayKey,
}: {
  habits: Habit[] | undefined;
  isLoading: boolean;
  todayKey: string;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Habits
        </CardTitle>
        <CardDescription>Active habit streaks</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : habits && habits.filter((h) => h.isActive).length > 0 ? (
          <div className="space-y-2">
            {habits
              .filter((h) => h.isActive)
              .sort((a, b) => b.currentStreak - a.currentStreak)
              .slice(0, 5)
              .map((habit) => (
                <div
                  key={habit.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{habit.icon}</span>
                    <span className="text-sm font-medium">{habit.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {habit.currentStreak > 0 && (
                      <span className="text-xs font-medium text-orange-500">
                        🔥 {habit.currentStreak}d
                      </span>
                    )}
                    {habit.lastCompletedDate &&
                      habit.lastCompletedDate.split('T')[0] === todayKey && (
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                      )}
                  </div>
                </div>
              ))}
            <Button variant="ghost" size="sm" className="mt-1 w-full" asChild>
              <Link to="/habits">View All Habits</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-6 text-center">
            <p className="text-sm font-medium">No active habits</p>
            <p className="text-xs text-muted-foreground">
              Create habits to track daily routines.
            </p>
            <Button className="mt-2" size="sm" asChild>
              <Link to="/habits">Create Habit</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
