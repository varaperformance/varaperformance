import { describe, it, expect } from 'vitest';
import { downsampleHeartRateSamplesToUtcMinute } from './heart-rate-downsample';

describe('downsampleHeartRateSamplesToUtcMinute', () => {
  it('returns empty for empty input', () => {
    expect(downsampleHeartRateSamplesToUtcMinute([])).toEqual([]);
  });

  it('averages multiple samples in the same UTC minute', () => {
    const out = downsampleHeartRateSamplesToUtcMinute([
      { timestamp: '2026-04-19T12:00:15.000Z', bpm: 80 },
      { timestamp: '2026-04-19T12:00:45.000Z', bpm: 84 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.timestamp).toBe('2026-04-19T12:00:00.000Z');
    expect(out[0]!.bpm).toBe(82);
  });

  it('keeps distinct UTC minutes separate', () => {
    const out = downsampleHeartRateSamplesToUtcMinute([
      { timestamp: '2026-04-19T12:00:30.000Z', bpm: 70 },
      { timestamp: '2026-04-19T12:01:00.000Z', bpm: 90 },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]!.bpm).toBe(70);
    expect(out[1]!.bpm).toBe(90);
  });

  it('skips invalid timestamps and out-of-range bpm', () => {
    const out = downsampleHeartRateSamplesToUtcMinute([
      { timestamp: 'not-a-date', bpm: 72 },
      { timestamp: '2026-04-19T12:00:00.000Z', bpm: 10 },
      { timestamp: '2026-04-19T12:01:00.000Z', bpm: 72 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.bpm).toBe(72);
  });

  it('keeps last source in the bucket when provided', () => {
    const out = downsampleHeartRateSamplesToUtcMinute([
      { timestamp: '2026-04-19T12:00:10.000Z', bpm: 70, source: 'MANUAL' },
      {
        timestamp: '2026-04-19T12:00:20.000Z',
        bpm: 74,
        source: 'APPLE_HEALTH',
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.source).toBe('APPLE_HEALTH');
  });
});
