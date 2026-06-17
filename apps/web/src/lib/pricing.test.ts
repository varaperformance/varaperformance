import { describe, expect, it } from 'vitest';
import { formatCentsToCyclePrice, formatMoneyCents } from './pricing';

describe('pricing helpers', () => {
  it('formats cents with cycle labels', () => {
    expect(formatCentsToCyclePrice(1299, 'MONTHLY')).toBe('$12.99/month');
    expect(formatCentsToCyclePrice(4900, 'quarterly')).toBe('$49.00/quarter');
    expect(formatCentsToCyclePrice(9900, 'YEARLY')).toBe('$99.00/year');
  });

  it('formats cents as plain currency', () => {
    expect(formatMoneyCents(0)).toBe('$0.00');
    expect(formatMoneyCents(250)).toBe('$2.50');
  });
});
