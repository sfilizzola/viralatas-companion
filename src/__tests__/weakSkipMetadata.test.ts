import { describe, expect, it } from 'vitest';
import {
  WEAK_SKIPS_2026_KEY,
  getWeakSkipCount,
} from '../services/weakSkipMetadata';

describe('getWeakSkipCount', () => {
  it('returns 0 when key is missing', () => {
    expect(getWeakSkipCount(undefined)).toBe(0);
    expect(getWeakSkipCount({})).toBe(0);
  });

  it('returns 0 for invalid values', () => {
    expect(getWeakSkipCount({ [WEAK_SKIPS_2026_KEY]: '3' })).toBe(0);
    expect(getWeakSkipCount({ [WEAK_SKIPS_2026_KEY]: -1 })).toBe(0);
    expect(getWeakSkipCount({ [WEAK_SKIPS_2026_KEY]: NaN })).toBe(0);
  });

  it('reads an existing non-negative integer count', () => {
    expect(getWeakSkipCount({ [WEAK_SKIPS_2026_KEY]: 4 })).toBe(4);
    expect(getWeakSkipCount({ [WEAK_SKIPS_2026_KEY]: 2.9 })).toBe(2);
  });
});
