import { describe, it, expect } from 'vitest';
import {
  canShowCamp,
  canShowDuck,
  canShowMap,
  canShowMetalPlace,
  canShowPresence,
  canShowRemoteLineup,
  canShowWrap,
  hasFestivalFeature,
} from '../lib/festivalFeatures';
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

  it('returns false for null/undefined festival', () => {
    expect(hasFestivalFeature(null, 'map')).toBe(false);
    expect(hasFestivalFeature(undefined, 'duck')).toBe(false);
  });
});

describe('canShow* helpers', () => {
  it('maps each feature key', () => {
    expect(canShowMap(base)).toBe(true);
    expect(canShowMetalPlace(base)).toBe(true);
    expect(canShowDuck(base)).toBe(true);
    expect(canShowCamp(base)).toBe(true);
    expect(canShowWrap(base)).toBe(true);
    expect(canShowRemoteLineup(base)).toBe(true);
  });

  it('returns false when the feature is off', () => {
    const off: Festival = { ...base, features: {} };
    expect(canShowMap(off)).toBe(false);
    expect(canShowMetalPlace(off)).toBe(false);
    expect(canShowDuck(off)).toBe(false);
    expect(canShowCamp(off)).toBe(false);
    expect(canShowWrap(off)).toBe(false);
    expect(canShowRemoteLineup(off)).toBe(false);
  });

  it('canShowPresence is true when camp or metal_place is on', () => {
    expect(canShowPresence(base)).toBe(true);
    expect(canShowPresence({ ...base, features: { camp: true } })).toBe(true);
    expect(canShowPresence({ ...base, features: { metal_place: true } })).toBe(true);
    expect(canShowPresence({ ...base, features: { map: true } })).toBe(false);
    expect(canShowPresence(null)).toBe(false);
  });
});
