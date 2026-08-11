import { describe, it, expect } from 'vitest';
import { hasFestivalFeature } from '../lib/festivalFeatures';
import type { Festival } from '../types/festival';

const base: Festival = {
  id: 'f1',
  slug: 'wacken-2026',
  name: 'Wacken Open Air 2026',
  timezone: 'Europe/Berlin',
  starts_at: '2026-07-27T00:00:00+02:00',
  ends_at: '2026-08-02T03:00:00+02:00',
  features: { metal_place: true, map: true, duck: true, camp: true, wrap: true, remote_lineup: true },
  cache_version: '1',
};

describe('hasFestivalFeature', () => {
  it('returns true when flag is true', () => {
    expect(hasFestivalFeature(base, 'map')).toBe(true);
  });

  it('returns false when flag missing or false', () => {
    expect(hasFestivalFeature({ ...base, features: {} }, 'map')).toBe(false);
    expect(hasFestivalFeature({ ...base, features: { map: false } }, 'map')).toBe(false);
  });
});
