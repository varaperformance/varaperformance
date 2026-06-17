import { describe, expect, it } from 'vitest';
import {
  convertDistanceFromStorage,
  convertHeightFromStorage,
  convertWeightFromStorage,
  formatDistance,
  formatWeight,
} from './units';

describe('units utilities', () => {
  it('converts and formats weight in imperial units', () => {
    expect(convertWeightFromStorage(100, 'imperial')).toBe(220.5);
    expect(formatWeight(100, 'imperial')).toBe('220.5 lb');
  });

  it('formats short and long imperial distances correctly', () => {
    expect(convertDistanceFromStorage(100, 'imperial')).toBe(328);
    expect(formatDistance(100, 'imperial')).toBe('328 ft');
    expect(formatDistance(1609.344, 'imperial')).toBe('1 mi');
  });

  it('converts height into imperial feet/inches', () => {
    expect(convertHeightFromStorage(180, 'imperial')).toEqual({
      feet: 5,
      inches: 11,
    });
  });
});
