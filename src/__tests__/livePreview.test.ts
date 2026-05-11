import { describe, it, expect } from 'vitest';
import {
  applyLiveBandTestOverride,
  findLivePlan,
  mapCrewLivePlans,
} from '../services/livePreview';
import type { Band, CrewUser, UserPick, UserPresence } from '../types';

function band(id: string, start: string, end: string, overrides: Partial<Band> = {}): Band {
  return {
    id,
    name: `Band ${id}`,
    stage: 'Faster',
    start_time: start,
    end_time: end,
    image_url: null,
    genre: null,
    ...overrides,
  };
}

describe('applyLiveBandTestOverride', () => {
  const NOW = new Date('2026-07-29T20:00:00.000Z');

  it('returns the bands array unchanged when no override is active', () => {
    const bands = [band('a', '2026-07-29T15:00:00Z', '2026-07-29T16:00:00Z')];
    expect(applyLiveBandTestOverride(bands, null, NOW)).toBe(bands);
    expect(applyLiveBandTestOverride(bands, undefined, NOW)).toBe(bands);
  });

  it('returns the bands array unchanged when the test band is not in the list', () => {
    const bands = [band('a', '2026-07-29T15:00:00Z', '2026-07-29T16:00:00Z')];
    expect(applyLiveBandTestOverride(bands, 'missing', NOW)).toBe(bands);
  });

  it('shifts the test band start to (now - 5min) and preserves duration', () => {
    const bands = [
      band('a', '2026-07-29T15:00:00Z', '2026-07-29T16:00:00Z'),
      // Band B is originally 90 min long, on a different day.
      band('b', '2026-07-30T10:00:00Z', '2026-07-30T11:30:00Z'),
    ];

    const result = applyLiveBandTestOverride(bands, 'b', NOW);

    expect(result).not.toBe(bands);
    const shifted = result.find((x) => x.id === 'b')!;
    const start = new Date(shifted.start_time).getTime();
    const end = new Date(shifted.end_time).getTime();

    expect(start).toBe(NOW.getTime() - 5 * 60 * 1000);
    expect(end - start).toBe(90 * 60 * 1000);
    // Other bands untouched.
    expect(result.find((x) => x.id === 'a')).toEqual(bands[0]);
  });

  it('does not mutate the input bands array', () => {
    const original = band('b', '2026-07-30T10:00:00Z', '2026-07-30T11:30:00Z');
    const bands = [original];
    applyLiveBandTestOverride(bands, 'b', NOW);
    expect(bands[0]).toEqual(original);
  });
});

describe('findLivePlan with liveTestBandId', () => {
  const NOW = new Date('2026-07-29T20:00:00.000Z');

  it('marks a previously-future picked band as current when override targets it', () => {
    const bands = [band('b', '2026-07-30T10:00:00Z', '2026-07-30T11:30:00Z')];
    const picked = new Set(['b']);

    const without = findLivePlan(bands, picked, NOW);
    expect(without.status).toBe('next');

    const withOverride = findLivePlan(bands, picked, NOW, 'b');
    expect(withOverride.status).toBe('current');
    expect(withOverride.band?.id).toBe('b');
  });

  it('does not affect users who did not pick the override band', () => {
    const bands = [band('b', '2026-07-30T10:00:00Z', '2026-07-30T11:30:00Z')];
    const noPicks = new Set<string>();

    const result = findLivePlan(bands, noPicks, NOW, 'b');
    expect(result.status).toBe('empty');
  });
});

describe('mapCrewLivePlans with liveTestBandId', () => {
  const NOW = new Date('2026-07-29T20:00:00.000Z');

  it('routes pickers of the override band to current; non-pickers stay lost/empty', () => {
    const bands: Band[] = [
      band('b', '2026-07-30T10:00:00Z', '2026-07-30T11:30:00Z'),
    ];
    const users: CrewUser[] = [
      { id: 'u1', display_name: 'Picker', avatar_url: null },
      { id: 'u2', display_name: 'NonPicker', avatar_url: null },
    ];
    const picks: UserPick[] = [
      { user_id: 'u1', band_id: 'b', created_at: '2026-05-01T00:00:00Z' },
    ];
    const presence: UserPresence[] = [];

    const plans = mapCrewLivePlans(bands, picks, users, presence, NOW, 'b');
    const picker = plans.find((p) => p.id === 'u1')!;
    const nonPicker = plans.find((p) => p.id === 'u2')!;

    expect(picker.plan.status).toBe('current');
    expect(picker.plan.band?.id).toBe('b');
    expect(nonPicker.plan.status).toBe('lost');
  });
});
