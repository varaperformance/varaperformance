/**
 * Heart rate samples from HealthKit / Health Connect can arrive many times per
 * minute. We store at most one reading per UTC minute so sync payload and DB
 * stay bounded while daily / chart views stay meaningful.
 */
export const HEART_RATE_SYNC_BUCKET_MS = 60_000;

export type HeartRateDownsampleInput = {
  timestamp: string;
  bpm: number;
  /** If set, the last sample merged into the UTC minute bucket wins. */
  source?: string;
};

export type HeartRateDownsampleOutput = {
  timestamp: string;
  bpm: number;
  source?: string;
};

/**
 * Collapse samples into one point per UTC minute (bucket start).
 * BPM is the arithmetic mean of all samples in that minute, rounded.
 */
export function downsampleHeartRateSamplesToUtcMinute<
  T extends HeartRateDownsampleInput,
>(samples: T[]): HeartRateDownsampleOutput[] {
  if (samples.length === 0) return [];

  const buckets = new Map<
    number,
    { sum: number; count: number; source?: string }
  >();

  for (const s of samples) {
    const ms = Date.parse(s.timestamp);
    if (Number.isNaN(ms)) continue;

    const bpm = Math.round(s.bpm);
    if (bpm < 20 || bpm > 300) continue;

    const key =
      Math.floor(ms / HEART_RATE_SYNC_BUCKET_MS) * HEART_RATE_SYNC_BUCKET_MS;
    const cur = buckets.get(key);
    if (cur) {
      cur.sum += bpm;
      cur.count += 1;
      if (s.source !== undefined) cur.source = s.source;
    } else {
      buckets.set(key, {
        sum: bpm,
        count: 1,
        ...(s.source !== undefined ? { source: s.source } : {}),
      });
    }
  }

  const keys = [...buckets.keys()].sort((a, b) => a - b);
  return keys.map((k) => {
    const { sum, count, source } = buckets.get(k)!;
    const row: HeartRateDownsampleOutput = {
      timestamp: new Date(k).toISOString(),
      bpm: Math.round(sum / count),
    };
    if (source !== undefined) row.source = source;
    return row;
  });
}
