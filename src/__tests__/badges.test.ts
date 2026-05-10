import { describe, it, expect } from 'vitest';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  buildBadgeContext,
  evaluateBadge,
  type BadgeBand,
  type BadgeConfig,
} from '../lib/badges';

function authUser(metadata: Record<string, unknown> = {}): AuthUser {
  return {
    id: 'u1',
    app_metadata: {},
    user_metadata: metadata,
    aud: '',
    created_at: '',
  } as unknown as AuthUser;
}

function band(partial: Partial<BadgeBand> & Pick<BadgeBand, 'id'>): BadgeBand {
  return {
    name: 'Test Band',
    stage: 'Faster',
    start_time: '2026-07-29T10:00:00.000Z', // 12:00 CEST
    end_time: '2026-07-29T11:00:00.000Z',
    genre: 'Heavy Metal',
    ...partial,
  };
}

function badge(condition: BadgeConfig['condition']): BadgeConfig {
  return {
    slug: 'test',
    imagePath: '/badges/test.png',
    labelKey: 'test',
    descriptionKey: 'test',
    condition,
  };
}

describe('buildBadgeContext', () => {
  it('joins userPickBandIds against the bands map', () => {
    const bandsById = new Map<string, BadgeBand>([
      ['b1', band({ id: 'b1', name: 'Alestorm', genre: 'Pirate Metal' })],
      ['b2', band({ id: 'b2', name: 'Bathory', genre: 'Viking Metal' })],
    ]);

    const ctx = buildBadgeContext(authUser(), ['b1', 'b2'], new Map(), bandsById);

    expect(ctx.bandsPicked).toBe(2);
    expect(ctx.pickedBands.map((b) => b.name)).toEqual(['Alestorm', 'Bathory']);
  });

  it('drops pick ids that are missing from the bands map', () => {
    const bandsById = new Map<string, BadgeBand>([
      ['b1', band({ id: 'b1', name: 'Alestorm' })],
    ]);

    const ctx = buildBadgeContext(authUser(), ['b1', 'b-missing'], new Map(), bandsById);

    expect(ctx.bandsPicked).toBe(2);
    expect(ctx.pickedBands).toHaveLength(1);
    expect(ctx.pickedBands[0]?.id).toBe('b1');
  });

  it('computes maxAttendanceInPicks from allPickCounts', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b1', 'b2'],
      new Map([
        ['b1', 3],
        ['b2', 11],
      ]),
      new Map(),
    );

    expect(ctx.maxAttendanceInPicks).toBe(11);
  });
});

describe('evaluateBadge — existing conditions still pass', () => {
  it('country_is matches user metadata country', () => {
    const ctx = buildBadgeContext(authUser({ country: 'br' }), [], new Map(), new Map());
    expect(evaluateBadge(badge({ type: 'country_is', country: 'br' }), ctx)).toBe(true);
    expect(evaluateBadge(badge({ type: 'country_is', country: 'de' }), ctx)).toBe(false);
  });

  it('bands_picked_min', () => {
    const ctx = buildBadgeContext(authUser(), ['b1', 'b2', 'b3'], new Map(), new Map());
    expect(evaluateBadge(badge({ type: 'bands_picked_min', count: 3 }), ctx)).toBe(true);
    expect(evaluateBadge(badge({ type: 'bands_picked_min', count: 4 }), ctx)).toBe(false);
  });
});

describe('evaluateBadge — bands_picked_genre_min', () => {
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', genre: 'Pirate Metal' })],
    ['b2', band({ id: 'b2', genre: 'Pirate Metal' })],
    ['b3', band({ id: 'b3', genre: 'Heavy Metal' })],
  ]);

  it('matches when count of picks in genre meets threshold', () => {
    const ctx = buildBadgeContext(authUser(), ['b1', 'b2', 'b3'], new Map(), bandsById);
    expect(
      evaluateBadge(badge({ type: 'bands_picked_genre_min', genre: 'Pirate Metal', count: 2 }), ctx),
    ).toBe(true);
  });

  it('rejects when count of picks in genre is below threshold', () => {
    const ctx = buildBadgeContext(authUser(), ['b1', 'b3'], new Map(), bandsById);
    expect(
      evaluateBadge(badge({ type: 'bands_picked_genre_min', genre: 'Pirate Metal', count: 2 }), ctx),
    ).toBe(false);
  });

  it('treats null and mismatched genres as non-matches', () => {
    const onlyNull = new Map<string, BadgeBand>([
      ['b1', band({ id: 'b1', genre: null })],
    ]);
    const ctx = buildBadgeContext(authUser(), ['b1'], new Map(), onlyNull);
    expect(
      evaluateBadge(badge({ type: 'bands_picked_genre_min', genre: 'Pirate Metal', count: 1 }), ctx),
    ).toBe(false);
  });
});

describe('evaluateBadge — bands_picked_stage_min', () => {
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', stage: 'Wackinger' })],
    ['b2', band({ id: 'b2', stage: 'Wackinger' })],
    ['b3', band({ id: 'b3', stage: 'Faster' })],
  ]);

  it('matches when picks on stage meet threshold', () => {
    const ctx = buildBadgeContext(authUser(), ['b1', 'b2', 'b3'], new Map(), bandsById);
    expect(
      evaluateBadge(badge({ type: 'bands_picked_stage_min', stage: 'Wackinger', count: 2 }), ctx),
    ).toBe(true);
  });

  it('rejects below threshold', () => {
    const ctx = buildBadgeContext(authUser(), ['b1', 'b3'], new Map(), bandsById);
    expect(
      evaluateBadge(badge({ type: 'bands_picked_stage_min', stage: 'Wackinger', count: 2 }), ctx),
    ).toBe(false);
  });
});

describe('evaluateBadge — bands_picked_before_hour_min', () => {
  // CEST = UTC+2. UTC 10:00 = 12:00 CEST.
  const bandsById = new Map<string, BadgeBand>([
    // 12:00 CEST
    ['b-noon', band({ id: 'b-noon', start_time: '2026-07-29T10:00:00.000Z' })],
    // 12:30 CEST
    ['b-1230', band({ id: 'b-1230', start_time: '2026-07-29T10:30:00.000Z' })],
    // 13:00 CEST
    ['b-13', band({ id: 'b-13', start_time: '2026-07-29T11:00:00.000Z' })],
    // 22:00 CEST
    ['b-late', band({ id: 'b-late', start_time: '2026-07-29T20:00:00.000Z' })],
  ]);

  it('counts picks whose CEST start hour is strictly less than the threshold', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b-noon', 'b-1230', 'b-13', 'b-late'],
      new Map(),
      bandsById,
    );
    expect(
      evaluateBadge(badge({ type: 'bands_picked_before_hour_min', hour: 13, count: 2 }), ctx),
    ).toBe(true);
  });

  it('hour=13 excludes a 13:00 CEST band', () => {
    const ctx = buildBadgeContext(authUser(), ['b-13'], new Map(), bandsById);
    expect(
      evaluateBadge(badge({ type: 'bands_picked_before_hour_min', hour: 13, count: 1 }), ctx),
    ).toBe(false);
  });

  it('rejects when fewer picks than threshold satisfy the condition', () => {
    const ctx = buildBadgeContext(authUser(), ['b-noon', 'b-13', 'b-late'], new Map(), bandsById);
    expect(
      evaluateBadge(badge({ type: 'bands_picked_before_hour_min', hour: 13, count: 2 }), ctx),
    ).toBe(false);
  });
});

describe('evaluateBadge — band_picked_named', () => {
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', name: 'Bathory' })],
    ['b2', band({ id: 'b2', name: 'Alestorm' })],
  ]);

  it('matches by exact name', () => {
    const ctx = buildBadgeContext(authUser(), ['b1', 'b2'], new Map(), bandsById);
    expect(evaluateBadge(badge({ type: 'band_picked_named', name: 'Bathory' }), ctx)).toBe(true);
  });

  it('rejects when no pick matches the name', () => {
    const ctx = buildBadgeContext(authUser(), ['b2'], new Map(), bandsById);
    expect(evaluateBadge(badge({ type: 'band_picked_named', name: 'Bathory' }), ctx)).toBe(false);
  });
});

describe('evaluateBadge — wacken_years_count_min', () => {
  it('returns true when user has attended at least N Wackens', () => {
    const ctx = buildBadgeContext(
      authUser({ wacken_years: [2022, 2023, 2024, 2025, 2026] }),
      [],
      new Map(),
      new Map(),
    );
    expect(evaluateBadge(badge({ type: 'wacken_years_count_min', count: 5 }), ctx)).toBe(true);
  });

  it('returns false when user has fewer Wackens than threshold', () => {
    const ctx = buildBadgeContext(
      authUser({ wacken_years: [2022, 2023, 2026] }),
      [],
      new Map(),
      new Map(),
    );
    expect(evaluateBadge(badge({ type: 'wacken_years_count_min', count: 5 }), ctx)).toBe(false);
  });

  it('returns false when user has no Wackens and count is 1', () => {
    const ctx = buildBadgeContext(authUser({ wacken_years: [] }), [], new Map(), new Map());
    expect(evaluateBadge(badge({ type: 'wacken_years_count_min', count: 1 }), ctx)).toBe(false);
  });

  it('returns true when count is 0 (edge case)', () => {
    const ctx = buildBadgeContext(authUser({ wacken_years: [] }), [], new Map(), new Map());
    expect(evaluateBadge(badge({ type: 'wacken_years_count_min', count: 0 }), ctx)).toBe(true);
  });
});

describe('evaluateBadge — wacken_attended_in_year', () => {
  it('returns true when user attended in specified year', () => {
    const ctx = buildBadgeContext(
      authUser({ wacken_years: [2022, 2023, 2026] }),
      [],
      new Map(),
      new Map(),
    );
    expect(evaluateBadge(badge({ type: 'wacken_attended_in_year', year: 2022 }), ctx)).toBe(true);
  });

  it('returns false when user did not attend in specified year', () => {
    const ctx = buildBadgeContext(authUser({ wacken_years: [2026] }), [], new Map(), new Map());
    expect(evaluateBadge(badge({ type: 'wacken_attended_in_year', year: 2022 }), ctx)).toBe(false);
  });

  it('returns false when user has no Wacken years', () => {
    const ctx = buildBadgeContext(authUser({ wacken_years: [] }), [], new Map(), new Map());
    expect(evaluateBadge(badge({ type: 'wacken_attended_in_year', year: 2026 }), ctx)).toBe(false);
  });
});

describe('evaluateBadge — assigned (Phase 11.E)', () => {
  it('returns true when badge slug is in assignedBadges', () => {
    const ctx = buildBadgeContext(
      authUser(),
      [],
      new Map(),
      new Map(),
      new Set(),
      new Date(),
      ['cao-caramelo', 'some-other'],
    );
    const b = badge({ type: 'assigned' });
    const cfg = { ...b, slug: 'cao-caramelo' };
    expect(evaluateBadge(cfg, ctx)).toBe(true);
  });

  it('returns false when badge slug is not in assignedBadges', () => {
    const ctx = buildBadgeContext(
      authUser(),
      [],
      new Map(),
      new Map(),
      new Set(),
      new Date(),
      ['some-other'],
    );
    const b = badge({ type: 'assigned' });
    const cfg = { ...b, slug: 'cao-caramelo' };
    expect(evaluateBadge(cfg, ctx)).toBe(false);
  });

  it('returns false when assignedBadges is empty', () => {
    const ctx = buildBadgeContext(
      authUser(),
      [],
      new Map(),
      new Map(),
      new Set(),
      new Date(),
      [],
    );
    const cfg = { ...badge({ type: 'assigned' }), slug: 'cao-caramelo' };
    expect(evaluateBadge(cfg, ctx)).toBe(false);
  });

  it('defaults to empty assignedBadges when not provided', () => {
    const ctx = buildBadgeContext(authUser(), [], new Map(), new Map());
    expect(ctx.assignedBadges).toEqual([]);
    const cfg = { ...badge({ type: 'assigned' }), slug: 'any-slug' };
    expect(evaluateBadge(cfg, ctx)).toBe(false);
  });
});

describe('evaluateBadge — bands_picked_after_hour_min', () => {
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', start_time: '2026-07-29T20:00:00.000Z' })], // 22:00 CEST
    ['b2', band({ id: 'b2', start_time: '2026-07-29T21:00:00.000Z' })], // 23:00 CEST
    ['b3', band({ id: 'b3', start_time: '2026-07-29T18:00:00.000Z' })], // 20:00 CEST
  ]);

  it('counts bands with start_time >= hour threshold', () => {
    const ctx = buildBadgeContext(authUser(), ['b1', 'b2', 'b3'], new Map(), bandsById);
    expect(
      evaluateBadge(badge({ type: 'bands_picked_after_hour_min', hour: 22, count: 2 }), ctx),
    ).toBe(true);
    expect(
      evaluateBadge(badge({ type: 'bands_picked_after_hour_min', hour: 22, count: 3 }), ctx),
    ).toBe(false);
    expect(
      evaluateBadge(badge({ type: 'bands_picked_after_hour_min', hour: 20, count: 2 }), ctx),
    ).toBe(true);
  });
});

describe('evaluateBadge — bands_seen_after_hour_min', () => {
  const now = new Date('2026-07-29T23:30:00.000Z');
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', start_time: '2026-07-29T20:00:00.000Z', end_time: '2026-07-29T21:00:00.000Z' })], // 22:00–23:00 CEST, seen
    ['b2', band({ id: 'b2', start_time: '2026-07-29T22:00:00.000Z', end_time: '2026-07-30T00:00:00.000Z' })], // 00:00–02:00 CEST, not yet seen
    ['b3', band({ id: 'b3', start_time: '2026-07-29T18:00:00.000Z', end_time: '2026-07-29T19:00:00.000Z' })], // 20:00–21:00 CEST, seen
  ]);

  it('counts seen bands with start_time >= hour threshold', () => {
    const ctx = buildBadgeContext(authUser(), ['b1', 'b2', 'b3'], new Map(), bandsById, new Set(), now);
    expect(
      evaluateBadge(badge({ type: 'bands_seen_after_hour_min', hour: 22, count: 1 }), ctx),
    ).toBe(true);
    expect(
      evaluateBadge(badge({ type: 'bands_seen_after_hour_min', hour: 22, count: 2 }), ctx),
    ).toBe(false);
    expect(
      evaluateBadge(badge({ type: 'bands_seen_after_hour_min', hour: 20, count: 1 }), ctx),
    ).toBe(true);
  });
});

describe('evaluateBadge — location_visit_count_min', () => {
  it('returns true when locationVisits[location] >= count', () => {
    const ctx = buildBadgeContext(
      authUser(),
      [],
      new Map(),
      new Map(),
      new Set(),
      new Date(),
      [],
      { metal_place: 1, camping: 3 },
    );
    expect(
      evaluateBadge(badge({ type: 'location_visit_count_min', location: 'metal_place', count: 1 }), ctx),
    ).toBe(true);
    expect(
      evaluateBadge(badge({ type: 'location_visit_count_min', location: 'metal_place', count: 2 }), ctx),
    ).toBe(false);
    expect(
      evaluateBadge(badge({ type: 'location_visit_count_min', location: 'camping', count: 3 }), ctx),
    ).toBe(true);
  });

  it('returns false when location not in visits object', () => {
    const ctx = buildBadgeContext(authUser(), [], new Map(), new Map(), new Set(), new Date(), [], {});
    expect(
      evaluateBadge(badge({ type: 'location_visit_count_min', location: 'metal_place', count: 1 }), ctx),
    ).toBe(false);
  });
});

describe('evaluateBadge — crew_at_location_min', () => {
  it('returns true when user is at location AND crew count >= threshold', () => {
    const ctx = buildBadgeContext(
      authUser(),
      [],
      new Map(),
      new Map(),
      new Set(),
      new Date(),
      [],
      {},
      'camping', // currentLocation
      { camping: 10, lost: 2 },
      new Set(),
    );
    const cfg = { ...badge({ type: 'crew_at_location_min', location: 'camping', count: 10 }), slug: 'camping-mob' };
    expect(evaluateBadge(cfg, ctx)).toBe(true);
  });

  it('returns false when user at location but crew count < threshold', () => {
    const ctx = buildBadgeContext(
      authUser(),
      [],
      new Map(),
      new Map(),
      new Set(),
      new Date(),
      [],
      {},
      'camping',
      { camping: 5, lost: 2 },
      new Set(),
    );
    const cfg = { ...badge({ type: 'crew_at_location_min', location: 'camping', count: 10 }), slug: 'camping-mob' };
    expect(evaluateBadge(cfg, ctx)).toBe(false);
  });

  it('returns true via persist flag when slug is in achievedBadgeSlugs regardless of count', () => {
    const ctx = buildBadgeContext(
      authUser(),
      [],
      new Map(),
      new Map(),
      new Set(),
      new Date(),
      [],
      {},
      'lost', // not at camping anymore
      { camping: 1, lost: 1 }, // crew count very low
      new Set(['camping-mob']), // but badge was already earned
    );
    const cfg = { ...badge({ type: 'crew_at_location_min', location: 'camping', count: 10 }), slug: 'camping-mob', persist: true };
    expect(evaluateBadge(cfg, ctx)).toBe(true);
  });

  it('returns false when user not at location and badge never earned', () => {
    const ctx = buildBadgeContext(
      authUser(),
      [],
      new Map(),
      new Map(),
      new Set(),
      new Date(),
      [],
      {},
      'lost',
      { camping: 15, lost: 2 },
      new Set(),
    );
    const cfg = { ...badge({ type: 'crew_at_location_min', location: 'camping', count: 10 }), slug: 'camping-mob' };
    expect(evaluateBadge(cfg, ctx)).toBe(false);
  });
});

describe('persist flag — generic achievement recording', () => {
  it('returns true for any condition type when persist:true and slug is in achievedBadgeSlugs', () => {
    // Condition would be false (no picks), but badge was previously earned and recorded
    const ctx = buildBadgeContext(
      authUser({ country: 'de' }), // country is de, not br
      [],
      new Map(),
      new Map(),
      new Set(),
      new Date(),
      [],
      {},
      null,
      {},
      new Set(['pais-tropical']), // recorded from when user had country: br
    );
    const cfg = { ...badge({ type: 'country_is', country: 'br' }), slug: 'pais-tropical', persist: true };
    expect(evaluateBadge(cfg, ctx)).toBe(true);
  });

  it('returns false when persist:true but slug not yet in achievedBadgeSlugs and condition not met', () => {
    const ctx = buildBadgeContext(authUser({ country: 'de' }), [], new Map(), new Map());
    const cfg = { ...badge({ type: 'country_is', country: 'br' }), slug: 'pais-tropical', persist: true };
    expect(evaluateBadge(cfg, ctx)).toBe(false);
  });

  it('without persist flag, slug in achievedBadgeSlugs has no effect', () => {
    const ctx = buildBadgeContext(
      authUser({ country: 'de' }),
      [],
      new Map(),
      new Map(),
      new Set(),
      new Date(),
      [],
      {},
      null,
      {},
      new Set(['pais-tropical']),
    );
    const cfg = badge({ type: 'country_is', country: 'br' }); // no persist
    expect(evaluateBadge(cfg, ctx)).toBe(false);
  });
});
