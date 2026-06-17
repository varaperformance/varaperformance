import { describe, expect, it } from 'vitest';
import { PaginationSchema } from './common.schema';

describe('PaginationSchema', () => {
  it('applies defaults when values are missing', () => {
    const parsed = PaginationSchema.parse({});
    expect(parsed).toEqual({ limit: 10, offset: 0 });
  });

  it('coerces string query params into numbers', () => {
    const parsed = PaginationSchema.parse({ limit: '25', offset: '5' });
    expect(parsed).toEqual({ limit: 25, offset: 5 });
  });

  it('rejects values outside configured bounds', () => {
    expect(() => PaginationSchema.parse({ limit: 0 })).toThrow();
    expect(() => PaginationSchema.parse({ limit: 101 })).toThrow();
    expect(() => PaginationSchema.parse({ offset: -1 })).toThrow();
  });
});
