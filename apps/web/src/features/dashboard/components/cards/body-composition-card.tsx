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

export interface LatestWeight {
  value?: number;
  unit?: string;
  bodyFat?: number | null;
  muscleMass?: number | null;
  loggedAt?: string;
}

export interface WeightStats {
  change?: number | null;
  bodyFatChange?: number | null;
}

export function BodyCompositionCard({
  latestWeight,
  stats,
  isLoading,
}: {
  latestWeight: LatestWeight | undefined;
  stats: WeightStats | undefined;
  isLoading: boolean;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-4 w-4 text-chart-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
          </svg>
          Body Composition
        </CardTitle>
        <CardDescription>
          {latestWeight?.loggedAt
            ? `Updated ${new Date(latestWeight.loggedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : 'No measurements'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-2.5">
            <div>
              <p className="text-xs text-muted-foreground">Weight</p>
              {isLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <p className="text-xl font-bold">
                  {latestWeight?.value ?? '--'}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {latestWeight?.unit === 'KG' ? 'kg' : 'lb'}
                  </span>
                </p>
              )}
            </div>
            {stats?.change != null && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  stats.change < 0
                    ? 'text-green-500 bg-green-500/10'
                    : stats.change > 0
                      ? 'text-red-500 bg-red-500/10'
                      : 'text-muted-foreground bg-muted'
                }`}
              >
                {stats.change > 0 ? '↑' : stats.change < 0 ? '↓' : '→'}{' '}
                {Math.abs(stats.change).toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-2.5">
            <div>
              <p className="text-xs text-muted-foreground">Body Fat</p>
              {isLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold">
                  {latestWeight?.bodyFat != null
                    ? latestWeight.bodyFat.toFixed(1)
                    : '--'}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    %
                  </span>
                </p>
              )}
            </div>
            {stats?.bodyFatChange != null && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  stats.bodyFatChange < 0
                    ? 'text-green-500 bg-green-500/10'
                    : stats.bodyFatChange > 0
                      ? 'text-red-500 bg-red-500/10'
                      : 'text-muted-foreground bg-muted'
                }`}
              >
                {stats.bodyFatChange > 0
                  ? '↑'
                  : stats.bodyFatChange < 0
                    ? '↓'
                    : '→'}{' '}
                {Math.abs(stats.bodyFatChange).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-2.5">
            <div>
              <p className="text-xs text-muted-foreground">Muscle Mass</p>
              {isLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold">
                  {latestWeight?.muscleMass != null
                    ? latestWeight.muscleMass.toFixed(1)
                    : '--'}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {latestWeight?.unit === 'KG' ? 'kg' : 'lb'}
                  </span>
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" className="w-full" size="sm" asChild>
            <Link to="/weight">
              <svg
                className="mr-2 h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Log Measurement
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
