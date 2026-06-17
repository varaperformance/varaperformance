import { Badge } from '@/components/ui/badge';
import {
  formatDistance,
  type UnitSystem,
  type ExternalSummary,
} from '@varaperformance/core';

/**
 * Format seconds into human-readable duration (e.g. "43:22" or "1h 12m")
 */
function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0
      ? `${min}:${String(Math.round(sec)).padStart(2, '0')}`
      : `${min} min`;
  }
  const hours = Math.floor(seconds / 3600);
  const min = Math.round((seconds % 3600) / 60);
  return min > 0 ? `${hours}h ${min}m` : `${hours}h`;
}

/**
 * Format pace (sec/km) to mm:ss /km or /mi
 */
function formatPace(secPerKm: number, unit: UnitSystem): string {
  const secPerUnit = unit === 'imperial' ? secPerKm * 1.60934 : secPerKm;
  const min = Math.floor(secPerUnit / 60);
  const sec = Math.round(secPerUnit % 60);
  const paceUnit = unit === 'imperial' ? '/mi' : '/km';
  return `${min}:${String(sec).padStart(2, '0')} ${paceUnit}`;
}

/**
 * Format speed (m/s) to km/h or mph
 */
function formatSpeed(mps: number, unit: UnitSystem): string {
  if (unit === 'imperial') {
    return `${(mps * 2.23694).toFixed(1)} mph`;
  }
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

interface StatTileProps {
  value: string;
  label: string;
}

function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-muted/50 px-3 py-2.5 text-center">
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

interface ActivitySummaryProps {
  summary: ExternalSummary;
  activityType: string | null;
  unit: UnitSystem;
}

export function ActivitySummary({
  summary,
  activityType,
  unit,
}: ActivitySummaryProps) {
  const tiles: { value: string; label: string }[] = [];

  // Distance
  if (summary.distanceMeters && summary.distanceMeters > 0) {
    tiles.push({
      value: formatDistance(summary.distanceMeters, unit, false),
      label:
        unit === 'imperial'
          ? summary.distanceMeters >= 400
            ? 'mi'
            : 'ft'
          : summary.distanceMeters >= 1000
            ? 'km'
            : 'm',
    });
  }

  // Duration (elapsed time)
  if (summary.elapsedTimeSeconds && summary.elapsedTimeSeconds > 0) {
    tiles.push({
      value: formatDuration(summary.elapsedTimeSeconds),
      label: summary.movingTimeSeconds ? 'elapsed' : 'time',
    });
  }

  // Moving time (Strava)
  if (
    summary.movingTimeSeconds &&
    summary.movingTimeSeconds > 0 &&
    summary.elapsedTimeSeconds
  ) {
    tiles.push({
      value: formatDuration(summary.movingTimeSeconds),
      label: 'moving',
    });
  }

  // Pace
  if (summary.averagePaceSecPerKm && summary.averagePaceSecPerKm > 0) {
    tiles.push({
      value: formatPace(summary.averagePaceSecPerKm, unit),
      label: 'pace',
    });
  }

  // Calories
  if (summary.calories && summary.calories > 0) {
    tiles.push({
      value: String(Math.round(summary.calories)),
      label: 'kcal',
    });
  }

  // Elevation gain
  if (summary.elevationGainMeters && summary.elevationGainMeters > 0) {
    const elev =
      unit === 'imperial'
        ? `${Math.round(summary.elevationGainMeters * 3.28084)} ft`
        : `${Math.round(summary.elevationGainMeters)} m`;
    tiles.push({ value: `+${elev}`, label: 'elevation' });
  }

  // Average speed (only if no pace — typically for cycling)
  if (
    summary.averageSpeedMps &&
    summary.averageSpeedMps > 0 &&
    !summary.averagePaceSecPerKm
  ) {
    tiles.push({
      value: formatSpeed(summary.averageSpeedMps, unit),
      label: 'avg speed',
    });
  }

  // Max speed
  if (summary.maxSpeedMps && summary.maxSpeedMps > 0) {
    tiles.push({
      value: formatSpeed(summary.maxSpeedMps, unit),
      label: 'max speed',
    });
  }

  // Heart rate
  if (summary.averageHeartRate && summary.averageHeartRate > 0) {
    tiles.push({
      value: String(Math.round(summary.averageHeartRate)),
      label: 'avg bpm',
    });
  }
  if (summary.maxHeartRate && summary.maxHeartRate > 0) {
    tiles.push({
      value: String(Math.round(summary.maxHeartRate)),
      label: 'max bpm',
    });
  }

  // Kudos
  if (summary.kudosCount && summary.kudosCount > 0) {
    tiles.push({
      value: String(summary.kudosCount),
      label: 'kudos',
    });
  }

  if (tiles.length === 0) return null;

  return (
    <div className="space-y-3">
      {activityType && (
        <Badge variant="outline" className="capitalize text-xs">
          {activityType.toLowerCase().replaceAll('_', ' ')}
        </Badge>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile, i) => (
          <StatTile key={i} value={tile.value} label={tile.label} />
        ))}
      </div>
    </div>
  );
}

/**
 * Compact summary for session list cards (1-line)
 */
export function ActivitySummaryInline({
  summary,
  unit,
}: {
  summary: ExternalSummary;
  unit: UnitSystem;
}) {
  const parts: string[] = [];

  if (summary.distanceMeters && summary.distanceMeters > 0) {
    parts.push(formatDistance(summary.distanceMeters, unit));
  }
  if (summary.elapsedTimeSeconds && summary.elapsedTimeSeconds > 0) {
    parts.push(formatDuration(summary.elapsedTimeSeconds));
  } else if (summary.movingTimeSeconds && summary.movingTimeSeconds > 0) {
    parts.push(formatDuration(summary.movingTimeSeconds));
  }
  if (summary.calories && summary.calories > 0) {
    parts.push(`${Math.round(summary.calories)} kcal`);
  }

  if (parts.length === 0) return null;

  return <span>{parts.join(' • ')}</span>;
}
