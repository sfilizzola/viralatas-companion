import { describe, it, expect } from 'vitest';
import type { Band, CrewUser, UserPick } from '../types';
import {
  buildPackPickActivity,
  festivalCountdown,
  newestAnnouncedBands,
  sortGoingMembers,
} from '../services/planningNow';

const FESTIVAL_ID = 'fest-1';

function band(overrides: Partial<Band> = {}): Band {
  return {
    id: 'b1',
    festival_id: FESTIVAL_ID,
    slot_id: null,
    name: 'Gojira',
    stage: null,
    start_time: null,
    end_time: null,
    image_url: null,
    genre: null,
    category: 'band',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function member(overrides: Partial<CrewUser> = {}): CrewUser {
  return {
    id: 'u1',
    display_name: 'Ana',
    avatar_url: null,
    wacken_arrival_day: null,
    is_friend: false,
    ...overrides,
  };
}

function pick(overrides: Partial<UserPick> = {}): UserPick {
  return {
    user_id: 'u1',
    band_id: 'b1',
    festival_id: FESTIVAL_ID,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Offline packs cached before Phase 50 may omit `created_at`. Production typing
 * keeps the field required — this helper only models that stale shape in tests.
 */
function bandWithLegacyCreatedAt(
  overrides: Omit<Partial<Band>, 'created_at'> & { created_at?: string | null },
): Band {
  const { created_at, ...rest } = overrides;
  return { ...band(rest), created_at } as Band;
}

describe('newestAnnouncedBands', () => {
  it('returns the newest three bands by created_at descending', () => {
    const bands = [
      band({ id: 'old', name: 'Old', created_at: '2026-01-01T00:00:00.000Z' }),
      band({ id: 'newest', name: 'Newest', created_at: '2026-05-01T00:00:00.000Z' }),
      band({ id: 'mid', name: 'Mid', created_at: '2026-03-01T00:00:00.000Z' }),
      band({ id: 'older', name: 'Older', created_at: '2025-12-01T00:00:00.000Z' }),
    ];

    expect(newestAnnouncedBands(bands).map((b) => b.id)).toEqual(['newest', 'mid', 'old']);
  });

  it('breaks created_at ties deterministically by name ascending', () => {
    const stamp = '2026-05-01T00:00:00.000Z';
    const bands = [
      band({ id: 'c', name: 'Candlemass', created_at: stamp }),
      band({ id: 'a', name: 'Amorphis', created_at: stamp }),
      band({ id: 'b', name: 'Behemoth', created_at: stamp }),
    ];

    expect(newestAnnouncedBands(bands).map((b) => b.name)).toEqual([
      'Amorphis',
      'Behemoth',
      'Candlemass',
    ]);
    // Same result regardless of input order.
    expect(newestAnnouncedBands([...bands].reverse()).map((b) => b.name)).toEqual([
      'Amorphis',
      'Behemoth',
      'Candlemass',
    ]);
  });

  it('does not mutate the input array and honours a custom limit', () => {
    const bands = [
      band({ id: 'a', name: 'A', created_at: '2026-01-01T00:00:00.000Z' }),
      band({ id: 'b', name: 'B', created_at: '2026-02-01T00:00:00.000Z' }),
    ];
    const snapshot = bands.map((b) => b.id);

    expect(newestAnnouncedBands(bands, 1).map((b) => b.id)).toEqual(['b']);
    expect(bands.map((b) => b.id)).toEqual(snapshot);
  });

  it('returns an empty list for an empty input', () => {
    expect(newestAnnouncedBands([])).toEqual([]);
  });

  it('never ranks invalid or legacy-missing created_at above a valid timestamp', () => {
    const validNew = band({ id: 'valid-new', name: 'Valid New', created_at: '2026-05-01T00:00:00.000Z' });
    const validOld = band({ id: 'valid-old', name: 'Valid Old', created_at: '2026-01-01T00:00:00.000Z' });
    const missing = bandWithLegacyCreatedAt({ id: 'missing', name: 'Missing' });
    const nulled = bandWithLegacyCreatedAt({ id: 'nulled', name: 'Nulled', created_at: null });
    const garbage = band({ id: 'garbage', name: 'Garbage', created_at: 'not-a-date' });

    const ranked = newestAnnouncedBands(
      [garbage, missing, validOld, nulled, validNew],
      5,
    ).map((b) => b.id);

    expect(ranked.slice(0, 2)).toEqual(['valid-new', 'valid-old']);
    expect(ranked.slice(2).sort()).toEqual(['garbage', 'missing', 'nulled']);
    expect(newestAnnouncedBands([garbage, missing, validOld, nulled, validNew], 2).map((b) => b.id)).toEqual([
      'valid-new',
      'valid-old',
    ]);
  });
});

describe('festivalCountdown', () => {
  const TZ = 'Europe/Berlin';

  it('counts festival-local calendar days, ignoring wall-clock time of day', () => {
    // 2026-07-27 23:30 Berlin → gates open 2026-07-29 local = 2 calendar days.
    const now = new Date('2026-07-27T21:30:00.000Z');
    expect(festivalCountdown('2026-07-29T10:00:00+02:00', TZ, now)).toEqual({
      kind: 'days',
      days: 2,
    });
  });

  it('uses the festival timezone, not the runtime timezone, for the day boundary', () => {
    // 2026-07-28T23:30Z is already 2026-07-29 in Berlin → same local day as gates.
    const now = new Date('2026-07-28T23:30:00.000Z');
    expect(festivalCountdown('2026-07-29T10:00:00+02:00', TZ, now)).toEqual({ kind: 'today' });
  });

  it('returns today when the festival starts on the current festival-local day', () => {
    const now = new Date('2026-07-29T04:00:00.000Z');
    expect(festivalCountdown('2026-07-29T10:00:00+02:00', TZ, now)).toEqual({ kind: 'today' });
  });

  it('returns today once the start date is in the past', () => {
    const now = new Date('2026-08-02T10:00:00.000Z');
    expect(festivalCountdown('2026-07-29T10:00:00+02:00', TZ, now)).toEqual({ kind: 'today' });
  });

  it('returns tba for a missing or unparsable start date', () => {
    const now = new Date('2026-07-27T21:30:00.000Z');
    expect(festivalCountdown(null, TZ, now)).toEqual({ kind: 'tba' });
    expect(festivalCountdown(undefined, TZ, now)).toEqual({ kind: 'tba' });
    expect(festivalCountdown('', TZ, now)).toEqual({ kind: 'tba' });
    expect(festivalCountdown('not-a-date', TZ, now)).toEqual({ kind: 'tba' });
  });

  it('returns tba for an invalid or missing timezone instead of throwing', () => {
    const now = new Date('2026-07-27T21:30:00.000Z');
    expect(festivalCountdown('2026-07-29T10:00:00+02:00', 'Mars/Olympus_Mons', now)).toEqual({
      kind: 'tba',
    });
    expect(festivalCountdown('2026-07-29T10:00:00+02:00', '', now)).toEqual({ kind: 'tba' });
    expect(festivalCountdown('2026-07-29T10:00:00+02:00', null, now)).toEqual({ kind: 'tba' });
  });

  it('returns tba when now is an invalid date', () => {
    expect(festivalCountdown('2026-07-29T10:00:00+02:00', TZ, new Date('nope'))).toEqual({
      kind: 'tba',
    });
  });
});

describe('sortGoingMembers', () => {
  it('sorts by display name and keeps members with zero picks', () => {
    const members = [
      member({ id: 'u3', display_name: 'Zeca' }),
      member({ id: 'u1', display_name: 'ana' }),
      member({ id: 'u2', display_name: 'Bruno' }),
    ];

    expect(sortGoingMembers(members).map((m) => m.id)).toEqual(['u1', 'u2', 'u3']);
  });

  it('does not mutate the input array', () => {
    const members = [
      member({ id: 'u3', display_name: 'Zeca' }),
      member({ id: 'u1', display_name: 'Ana' }),
    ];
    const snapshot = members.map((m) => m.id);

    sortGoingMembers(members);

    expect(members.map((m) => m.id)).toEqual(snapshot);
  });

  it('places members without a usable display name last, ordered by id', () => {
    const members = [
      member({ id: 'u9', display_name: null }),
      member({ id: 'u2', display_name: 'Bruno' }),
      member({ id: 'u4', display_name: '   ' }),
    ];

    expect(sortGoingMembers(members).map((m) => m.id)).toEqual(['u2', 'u4', 'u9']);
  });

  it('breaks equal display names deterministically by id', () => {
    const members = [
      member({ id: 'u7', display_name: 'Ana' }),
      member({ id: 'u2', display_name: 'Ana' }),
    ];

    expect(sortGoingMembers(members).map((m) => m.id)).toEqual(['u2', 'u7']);
    expect(sortGoingMembers([...members].reverse()).map((m) => m.id)).toEqual(['u2', 'u7']);
  });
});

describe('buildPackPickActivity', () => {
  const bands = [
    band({ id: 'b1', name: 'Gojira' }),
    band({ id: 'b2', name: 'Behemoth' }),
    band({ id: 'b3', name: 'Amorphis' }),
    band({ id: 'b4', name: 'Candlemass' }),
  ];
  const crew = [
    member({ id: 'me', display_name: 'Me' }),
    member({ id: 'u2', display_name: 'Bruno' }),
    member({ id: 'u3', display_name: 'Carla' }),
    member({ id: 'u4', display_name: 'Dani' }),
  ];

  it('returns the newest picks first and resolves member and band', () => {
    const picks = [
      pick({ user_id: 'u2', band_id: 'b1', created_at: '2026-01-01T10:00:00.000Z' }),
      pick({ user_id: 'u3', band_id: 'b2', created_at: '2026-01-03T10:00:00.000Z' }),
      pick({ user_id: 'u4', band_id: 'b3', created_at: '2026-01-02T10:00:00.000Z' }),
    ];

    const activity = buildPackPickActivity(picks, crew, bands, 'me');

    expect(activity.map((item) => item.pick.user_id)).toEqual(['u3', 'u4', 'u2']);
    expect(activity[0].member.display_name).toBe('Carla');
    expect(activity[0].band.name).toBe('Behemoth');
  });

  it('excludes the current user', () => {
    const picks = [
      pick({ user_id: 'me', band_id: 'b1', created_at: '2026-01-05T10:00:00.000Z' }),
      pick({ user_id: 'u2', band_id: 'b2', created_at: '2026-01-01T10:00:00.000Z' }),
    ];

    const activity = buildPackPickActivity(picks, crew, bands, 'me');

    expect(activity.map((item) => item.pick.user_id)).toEqual(['u2']);
  });

  it('excludes picks from users absent from the current crew roster', () => {
    const picks = [
      pick({ user_id: 'leaver', band_id: 'b1', created_at: '2026-01-05T10:00:00.000Z' }),
      pick({ user_id: 'u2', band_id: 'b2', created_at: '2026-01-01T10:00:00.000Z' }),
    ];

    const activity = buildPackPickActivity(picks, crew, bands, 'me');

    expect(activity.map((item) => item.pick.user_id)).toEqual(['u2']);
  });

  it('excludes picks whose band cannot be resolved', () => {
    const picks = [
      pick({ user_id: 'u2', band_id: 'ghost', created_at: '2026-01-05T10:00:00.000Z' }),
      pick({ user_id: 'u3', band_id: 'b2', created_at: '2026-01-01T10:00:00.000Z' }),
    ];

    const activity = buildPackPickActivity(picks, crew, bands, 'me');

    expect(activity.map((item) => item.pick.band_id)).toEqual(['b2']);
  });

  it('limits the result to three items by default', () => {
    const picks = [
      pick({ user_id: 'u2', band_id: 'b1', created_at: '2026-01-01T10:00:00.000Z' }),
      pick({ user_id: 'u3', band_id: 'b2', created_at: '2026-01-02T10:00:00.000Z' }),
      pick({ user_id: 'u4', band_id: 'b3', created_at: '2026-01-03T10:00:00.000Z' }),
      pick({ user_id: 'u2', band_id: 'b4', created_at: '2026-01-04T10:00:00.000Z' }),
    ];

    const activity = buildPackPickActivity(picks, crew, bands, 'me');

    expect(activity).toHaveLength(3);
    expect(activity.map((item) => item.pick.band_id)).toEqual(['b4', 'b3', 'b2']);
    expect(buildPackPickActivity(picks, crew, bands, 'me', 2)).toHaveLength(2);
  });

  it('does not mutate the input picks and returns an empty list when nothing qualifies', () => {
    const picks = [
      pick({ user_id: 'u2', band_id: 'b1', created_at: '2026-01-01T10:00:00.000Z' }),
      pick({ user_id: 'u3', band_id: 'b2', created_at: '2026-01-02T10:00:00.000Z' }),
    ];
    const snapshot = picks.map((p) => `${p.user_id}:${p.band_id}`);

    buildPackPickActivity(picks, crew, bands, 'me');

    expect(picks.map((p) => `${p.user_id}:${p.band_id}`)).toEqual(snapshot);
    expect(buildPackPickActivity([], crew, bands, 'me')).toEqual([]);
  });

  it('never ranks invalid pick created_at above a valid timestamp', () => {
    const picks = [
      pick({ user_id: 'u2', band_id: 'b1', created_at: 'not-a-date' }),
      pick({ user_id: 'u3', band_id: 'b2', created_at: '2026-01-02T10:00:00.000Z' }),
      pick({ user_id: 'u4', band_id: 'b3', created_at: '' }),
    ];

    const activity = buildPackPickActivity(picks, crew, bands, 'me', 3);

    expect(activity[0].pick.user_id).toBe('u3');
    expect(activity.map((item) => item.pick.user_id).slice(1).sort()).toEqual(['u2', 'u4']);
  });

  it('breaks equal pick created_at by user_id then band_id', () => {
    const stamp = '2026-01-02T10:00:00.000Z';
    const picks = [
      pick({ user_id: 'u4', band_id: 'b2', created_at: stamp }),
      pick({ user_id: 'u2', band_id: 'b3', created_at: stamp }),
      pick({ user_id: 'u2', band_id: 'b1', created_at: stamp }),
    ];

    expect(
      buildPackPickActivity(picks, crew, bands, 'me').map((item) => `${item.pick.user_id}:${item.pick.band_id}`),
    ).toEqual(['u2:b1', 'u2:b3', 'u4:b2']);
    expect(
      buildPackPickActivity([...picks].reverse(), crew, bands, 'me').map(
        (item) => `${item.pick.user_id}:${item.pick.band_id}`,
      ),
    ).toEqual(['u2:b1', 'u2:b3', 'u4:b2']);
  });
});
