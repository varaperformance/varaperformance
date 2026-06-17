import { useMemo } from 'react';

/**
 * Estimate HR zone distribution based on avg and max HR.
 * This is an approximation — without the full HR time-series data,
 * we simulate zones based on avg/max relationship.
 */
function estimateZones(avgHR: number, maxHR: number): number[] {
  // Zone thresholds (% of max HR)
  // Zone 1: 50-60%, Zone 2: 60-70%, Zone 3: 70-80%, Zone 4: 80-90%, Zone 5: 90-100%
  const avgPct = (avgHR / maxHR) * 100;

  // Simulate distribution centered around the avg zone
  if (avgPct >= 90) return [2, 5, 10, 25, 58];
  if (avgPct >= 80) return [3, 8, 18, 48, 23];
  if (avgPct >= 70) return [5, 15, 45, 25, 10];
  if (avgPct >= 60) return [12, 42, 28, 14, 4];
  return [45, 30, 15, 7, 3];
}

const ZONE_COLORS = [
  'bg-blue-400 dark:bg-blue-500',
  'bg-green-400 dark:bg-green-500',
  'bg-yellow-400 dark:bg-yellow-500',
  'bg-orange-400 dark:bg-orange-500',
  'bg-red-400 dark:bg-red-500',
];

const ZONE_LABELS = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];
const ZONE_DESCRIPTIONS = ['Recovery', 'Easy', 'Moderate', 'Hard', 'Max'];

interface HRZoneChartProps {
  averageHeartRate: number;
  maxHeartRate: number;
}

export function HRZoneChart({
  averageHeartRate,
  maxHeartRate,
}: HRZoneChartProps) {
  const zones = useMemo(
    () => estimateZones(averageHeartRate, maxHeartRate),
    [averageHeartRate, maxHeartRate],
  );

  const maxZone = Math.max(...zones);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Heart Rate Zones</span>
        <span className="text-muted-foreground">
          Avg {Math.round(averageHeartRate)} • Max {Math.round(maxHeartRate)}{' '}
          bpm
        </span>
      </div>
      <div className="space-y-2">
        {zones.map((pct, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-14 shrink-0 text-xs text-muted-foreground">
              <span className="font-medium">{ZONE_LABELS[i]}</span>
            </div>
            <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-muted/50">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all ${ZONE_COLORS[i]}`}
                style={{ width: `${(pct / maxZone) * 100}%` }}
              />
            </div>
            <div className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {pct}%
            </div>
            <div className="hidden w-16 shrink-0 text-xs text-muted-foreground sm:block">
              {ZONE_DESCRIPTIONS[i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
