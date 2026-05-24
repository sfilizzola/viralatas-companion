import { describe, it, expect } from 'vitest';
import {
  applyLiveBandTestOverride,
  applyPresenceToLivePlan,
  derivePresenceValue,
  findLivePlan,
  findUserCrewGroup,
  groupCrewLivePlans,
  mapCrewLivePlans,
  resolveFocusUserLivePlan,
  type CrewLivePlan,
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
    category: 'band',
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

describe('applyPresenceToLivePlan', () => {
  const liveBand = band('live', '2026-07-29T18:00:00Z', '2026-07-29T21:00:00Z');
  const nextBand = band('next', '2026-07-29T21:00:00Z', '2026-07-29T22:00:00Z');

  it('keeps current plan unchanged even when camping', () => {
    const plan = { status: 'current' as const, band: liveBand };
    expect(applyPresenceToLivePlan(plan, true)).toEqual(plan);
  });

  it('maps camping without current band to lost with no nextBand', () => {
    expect(applyPresenceToLivePlan({ status: 'empty', band: null }, true)).toEqual({
      status: 'lost',
      band: null,
      nextBand: null,
    });
  });

  it('maps next pick to lost with nextBand reference', () => {
    expect(applyPresenceToLivePlan({ status: 'next', band: nextBand }, false)).toEqual({
      status: 'lost',
      band: null,
      nextBand,
    });
  });

  it('maps empty non-camping plan to lost without nextBand', () => {
    expect(applyPresenceToLivePlan({ status: 'empty', band: null }, false)).toEqual({
      status: 'lost',
      band: null,
      nextBand: null,
    });
  });
});

describe('derivePresenceValue', () => {
  it('prioritises metal place when the window is active', () => {
    expect(
      derivePresenceValue(
        { user_id: 'u1', is_camping: true, is_at_metal_place: true, updated_at: '' },
        { status: 'empty', band: null },
        true,
      ),
    ).toBe('metal_place');
  });

  it('returns camping when not at a current band', () => {
    expect(
      derivePresenceValue(
        { user_id: 'u1', is_camping: true, is_at_metal_place: false, updated_at: '' },
        { status: 'next', band: null },
        true,
      ),
    ).toBe('camping');
  });

  it('returns auto when at a current band even if camping flag is set', () => {
    expect(
      derivePresenceValue(
        { user_id: 'u1', is_camping: true, is_at_metal_place: false, updated_at: '' },
        { status: 'current', band: null },
        true,
      ),
    ).toBe('auto');
  });
});

describe('groupCrewLivePlans', () => {
  const NOW = new Date('2026-07-29T20:00:00.000Z');
  const liveA = band('a', '2026-07-29T18:00:00Z', '2026-07-29T21:00:00Z', { name: 'A' });
  const liveB = band('b', '2026-07-29T18:30:00Z', '2026-07-29T21:30:00Z', { name: 'B' });

  function crewPlan(
    id: string,
    overrides: Partial<CrewLivePlan> & { plan: CrewLivePlan['plan'] },
  ): CrewLivePlan {
    return {
      id,
      display_name: id,
      avatar_url: null,
      is_friend: null,
      label: id,
      isCamping: false,
      isAtMetalPlace: false,
      isFriend: false,
      ...overrides,
    };
  }

  it('orders live bands before camping, metal place, and lost', () => {
    const plans: CrewLivePlan[] = [
      crewPlan('lost1', { plan: { status: 'lost', band: null } }),
      crewPlan('camper', { isCamping: true, plan: { status: 'lost', band: null } }),
      crewPlan('mp', { isAtMetalPlace: true, plan: { status: 'lost', band: null } }),
      crewPlan('atB', { plan: { status: 'current', band: liveB } }),
      crewPlan('atA', { plan: { status: 'current', band: liveA } }),
    ];

    const groups = groupCrewLivePlans(plans, { metalPlaceWindowActive: true });
    expect(groups.map((group) => group.kind)).toEqual(['band', 'band', 'camping', 'metal_place', 'lost']);
    expect(groups[0].kind === 'band' && groups[0].band.id).toBe('a');
    expect(groups[1].kind === 'band' && groups[1].band.id).toBe('b');
  });

  it('hides metal place group when no members are checked in', () => {
    const plans: CrewLivePlan[] = [
      crewPlan('lost1', { plan: { status: 'lost', band: null } }),
    ];
    const groups = groupCrewLivePlans(plans);
    expect(groups.map((group) => group.kind)).toEqual(['camping', 'lost']);
  });

  it('routes stale metal place members to band when the window is inactive', () => {
    const plans: CrewLivePlan[] = [
      crewPlan('mpPicker', {
        isAtMetalPlace: true,
        plan: { status: 'current', band: liveA },
      }),
    ];
    const groups = groupCrewLivePlans(plans, { metalPlaceWindowActive: false });
    expect(groups.map((group) => group.kind)).toEqual(['band', 'camping', 'lost']);
    expect(groups[0].kind).toBe('band');
    expect(groups[0].members[0].id).toBe('mpPicker');
  });

  it('keeps metal place members out of band groups while the window is active', () => {
    const plans: CrewLivePlan[] = [
      crewPlan('mpPicker', {
        isAtMetalPlace: true,
        plan: { status: 'current', band: liveA },
      }),
    ];
    const groups = groupCrewLivePlans(plans, { metalPlaceWindowActive: true });
    expect(groups.map((group) => group.kind)).toEqual(['camping', 'metal_place', 'lost']);
    expect(groups.find((group) => group.kind === 'metal_place')?.members[0].id).toBe('mpPicker');
  });
});

describe('resolveFocusUserLivePlan', () => {
  const liveBand = band('live', '2026-07-29T18:00:00Z', '2026-07-29T21:00:00Z');

  it('metal place overrides a concurrent live pick for the focus user', () => {
    const raw = { status: 'current' as const, band: liveBand };
    const presence = { user_id: 'me', is_camping: false, is_at_metal_place: true, updated_at: '' };

    expect(resolveFocusUserLivePlan(raw, presence, true)).toEqual({
      status: 'lost',
      band: null,
      nextBand: liveBand,
    });
  });

  it('does not override when the metal place window is inactive', () => {
    const raw = { status: 'current' as const, band: liveBand };
    const presence = { user_id: 'me', is_camping: false, is_at_metal_place: true, updated_at: '' };

    expect(resolveFocusUserLivePlan(raw, presence, false)).toEqual(raw);
  });

  it('camping override still applies when not at a live band', () => {
    const raw = { status: 'empty' as const, band: null };
    const presence = { user_id: 'me', is_camping: true, is_at_metal_place: false, updated_at: '' };

    expect(resolveFocusUserLivePlan(raw, presence, true)).toEqual({
      status: 'lost',
      band: null,
      nextBand: null,
    });
  });
});

describe('findUserCrewGroup', () => {
  it('returns the group containing the user', () => {
    const groups = groupCrewLivePlans([
      {
        id: 'u1',
        display_name: 'U1',
        avatar_url: null,
        is_friend: null,
        label: 'U1',
        isCamping: true,
        isAtMetalPlace: false,
        isFriend: false,
        plan: { status: 'lost', band: null },
      },
    ]);
    expect(findUserCrewGroup('u1', groups)?.kind).toBe('camping');
    expect(findUserCrewGroup('missing', groups)).toBeNull();
  });
});
