import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface MeasurementsSummary {
  latest: {
    waist: number | null;
    chest: number | null;
    hips: number | null;
    shoulders: number | null;
    unit: string;
    loggedAt: string;
  };
  deltas: {
    waist: number | null;
    chest: number | null;
    hips: number | null;
  } | null;
}

export function BodyMeasurementsCard({
  measurementsSummary,
  isLoading,
}: {
  measurementsSummary: MeasurementsSummary | null;
  isLoading: boolean;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-4 w-4 text-chart-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
          Body Measurements
        </CardTitle>
        <CardDescription>Latest vs 4-week changes</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : measurementsSummary ? (
          <div className="space-y-2">
            {[
              {
                label: 'Waist',
                value: measurementsSummary.latest.waist,
                delta: measurementsSummary.deltas?.waist,
              },
              {
                label: 'Chest',
                value: measurementsSummary.latest.chest,
                delta: measurementsSummary.deltas?.chest,
              },
              {
                label: 'Hips',
                value: measurementsSummary.latest.hips,
                delta: measurementsSummary.deltas?.hips,
              },
              {
                label: 'Shoulders',
                value: measurementsSummary.latest.shoulders,
                delta: null,
              },
            ]
              .filter((m) => m.value != null)
              .map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground">
                    {m.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {m.value}{' '}
                      {measurementsSummary.latest.unit === 'IN' ? 'in' : 'cm'}
                    </span>
                    {m.delta != null && m.delta !== 0 && (
                      <span
                        className={cn(
                          'text-xs',
                          m.delta < 0 ? 'text-green-500' : 'text-red-500',
                        )}
                      >
                        {m.delta > 0 ? '+' : ''}
                        {m.delta}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            <p className="mt-2 text-xs text-muted-foreground">
              Logged{' '}
              {new Date(measurementsSummary.latest.loggedAt).toLocaleDateString(
                'en-US',
                { month: 'short', day: 'numeric' },
              )}
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">No measurements logged</p>
            <p className="text-xs text-muted-foreground">
              Track waist, chest, and other body measurements to see progress
              over time.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
