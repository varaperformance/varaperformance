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

export interface RecentWorkout {
  id: string;
  name: string;
  date: string;
  duration: string | null;
  exercises: number;
  volume: string;
  exerciseNames: string[];
}

export function RecentWorkoutsCard({
  recentWorkouts,
  isLoading,
}: {
  recentWorkouts: RecentWorkout[] | null;
  isLoading: boolean;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <svg
            className="h-5 w-5 text-chart-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Recent Workouts
        </CardTitle>
        <CardDescription>Your latest training sessions</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : recentWorkouts && recentWorkouts.length > 0 ? (
          <div className="space-y-3">
            {recentWorkouts.map((workout) => (
              <Link
                key={workout.id}
                to={`/workouts/${workout.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{workout.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {workout.date}
                      {workout.duration && ` • ${workout.duration}`}
                    </p>
                  </div>
                </div>
                <div className="hidden items-center gap-4 sm:flex">
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      {workout.exercises} exercises
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {workout.volume}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {workout.exerciseNames.slice(0, 2).map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs"
                      >
                        {name.length > 15 ? name.slice(0, 15) + '...' : name}
                      </span>
                    ))}
                    {workout.exerciseNames.length > 2 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        +{workout.exerciseNames.length - 2}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    asChild
                  >
                    <span>
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm font-medium">No workouts recorded yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Log your first workout to start building your timeline.
            </p>
            <Button className="mt-4" size="sm" asChild>
              <Link to="/workouts">Log Workout</Link>
            </Button>
          </div>
        )}
        <div className="mt-4 text-center">
          <Button variant="outline" size="sm" asChild>
            <Link to="/workouts">View All Workouts</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
