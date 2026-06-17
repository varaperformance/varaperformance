import {
  hasValidQuietHoursWindow,
  isWithinQuietHoursWindow,
} from './notification-quiet-hours';

describe('notification quiet hours helpers', () => {
  it('treats equal start/end as invalid window', () => {
    expect(hasValidQuietHoursWindow(22, 22)).toBe(false);
  });

  it('treats NaN values as invalid window', () => {
    expect(hasValidQuietHoursWindow(Number.NaN, 7)).toBe(false);
    expect(hasValidQuietHoursWindow(22, Number.NaN)).toBe(false);
  });

  it('treats distinct numeric values as valid window', () => {
    expect(hasValidQuietHoursWindow(22, 7)).toBe(true);
    expect(hasValidQuietHoursWindow(9, 17)).toBe(true);
  });

  it('matches normal daytime quiet window', () => {
    expect(isWithinQuietHoursWindow(8, 9, 17)).toBe(false);
    expect(isWithinQuietHoursWindow(9, 9, 17)).toBe(true);
    expect(isWithinQuietHoursWindow(16, 9, 17)).toBe(true);
    expect(isWithinQuietHoursWindow(17, 9, 17)).toBe(false);
  });

  it('matches overnight quiet window', () => {
    expect(isWithinQuietHoursWindow(21, 22, 7)).toBe(false);
    expect(isWithinQuietHoursWindow(22, 22, 7)).toBe(true);
    expect(isWithinQuietHoursWindow(3, 22, 7)).toBe(true);
    expect(isWithinQuietHoursWindow(7, 22, 7)).toBe(false);
  });
});
