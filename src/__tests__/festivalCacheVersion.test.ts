import { describe, expect, it } from 'vitest';
import { shouldInvalidatePack } from '../lib/festivalCacheVersion';

const remote = [
  { id: 'wacken', cache_version: 'v2' },
  { id: 'hellfest', cache_version: 'hf-9' },
];

describe('shouldInvalidatePack', () => {
  it('returns false when there is no active festival', () => {
    expect(shouldInvalidatePack(null, { wacken: 'v1' }, remote)).toBe(false);
  });

  it('returns false when active festival is missing from remote catalog', () => {
    expect(shouldInvalidatePack('unknown', { unknown: 'v1' }, remote)).toBe(false);
  });

  it('returns false when local version matches remote active festival', () => {
    expect(shouldInvalidatePack('wacken', { wacken: 'v2' }, remote)).toBe(false);
  });

  it('returns true only when the active festival version changed', () => {
    expect(shouldInvalidatePack('wacken', { wacken: 'v1', hellfest: 'hf-9' }, remote)).toBe(
      true,
    );
  });

  it('ignores version changes on non-active festivals', () => {
    expect(
      shouldInvalidatePack(
        'wacken',
        { wacken: 'v2', hellfest: 'hf-1' },
        remote,
      ),
    ).toBe(false);
  });

  it('returns false when local version for active festival is unset', () => {
    expect(shouldInvalidatePack('wacken', {}, remote)).toBe(false);
    expect(shouldInvalidatePack('wacken', { wacken: null }, remote)).toBe(false);
  });
});
