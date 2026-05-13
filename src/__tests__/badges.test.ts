import { describe, it, expect } from 'vitest';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  BADGES,
  buildBadgeContext,
  evaluateBadge,
  type BadgeBand,
  type BadgeConfig,
} from '../services/badges';

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

describe('evaluateBadge — bands_picked_stages_min (Idea 6)', () => {
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', stage: 'Faster' })],
    ['b2', band({ id: 'b2', stage: 'Faster' })],
    ['b3', band({ id: 'b3', stage: 'Harder' })],
    ['b4', band({ id: 'b4', stage: 'Harder' })],
    ['b5', band({ id: 'b5', stage: 'Louder' })],
  ]);

  it('single-element array behaves identically to bands_picked_stage_min', () => {
    const ctx = buildBadgeContext(authUser(), ['b1', 'b2', 'b5'], new Map(), bandsById);
    expect(
      evaluateBadge(badge({ type: 'bands_picked_stage_min', stage: 'Faster', count: 2 }), ctx),
    ).toBe(true);
    expect(
      evaluateBadge(
        badge({ type: 'bands_picked_stages_min', stages: ['Faster'], count: 2 }),
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateBadge(
        badge({ type: 'bands_picked_stages_min', stages: ['Faster'], count: 3 }),
        ctx,
      ),
    ).toBe(false);
  });

  it('multi-element array OR-combines matches across listed stages', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b1', 'b2', 'b3', 'b4', 'b5'],
      new Map(),
      bandsById,
    );
    expect(
      evaluateBadge(
        badge({ type: 'bands_picked_stages_min', stages: ['Faster', 'Harder'], count: 4 }),
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateBadge(
        badge({ type: 'bands_picked_stages_min', stages: ['Faster', 'Harder'], count: 5 }),
        ctx,
      ),
    ).toBe(false);
  });

  it('does not require ≥1 from each listed stage (pure OR)', () => {
    // All picks on Faster — still satisfies count=3 across Faster ∪ Harder
    const ctx = buildBadgeContext(authUser(), ['b1', 'b2'], new Map(), bandsById);
    expect(
      evaluateBadge(
        badge({ type: 'bands_picked_stages_min', stages: ['Faster', 'Harder'], count: 2 }),
        ctx,
      ),
    ).toBe(true);
  });

  it('empty stages array is never earned (count > 0)', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b1', 'b2', 'b3', 'b4', 'b5'],
      new Map(),
      bandsById,
    );
    expect(
      evaluateBadge(badge({ type: 'bands_picked_stages_min', stages: [], count: 1 }), ctx),
    ).toBe(false);
  });
});

describe('evaluateBadge — bands_picked_genres_min (Idea 6)', () => {
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', genre: 'Death Metal' })],
    ['b2', band({ id: 'b2', genre: 'Black Metal' })],
    ['b3', band({ id: 'b3', genre: 'Grindcore' })],
    ['b4', band({ id: 'b4', genre: 'Power Metal' })],
    ['b5', band({ id: 'b5', genre: null })],
  ]);

  it('single-element array behaves identically to bands_picked_genre_min', () => {
    const ctx = buildBadgeContext(authUser(), ['b1', 'b4'], new Map(), bandsById);
    expect(
      evaluateBadge(
        badge({ type: 'bands_picked_genre_min', genre: 'Death Metal', count: 1 }),
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateBadge(
        badge({ type: 'bands_picked_genres_min', genres: ['Death Metal'], count: 1 }),
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateBadge(
        badge({ type: 'bands_picked_genres_min', genres: ['Death Metal'], count: 2 }),
        ctx,
      ),
    ).toBe(false);
  });

  it('multi-element array OR-combines matches across listed genres', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b1', 'b2', 'b3', 'b4'],
      new Map(),
      bandsById,
    );
    expect(
      evaluateBadge(
        badge({
          type: 'bands_picked_genres_min',
          genres: ['Death Metal', 'Black Metal', 'Grindcore'],
          count: 3,
        }),
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateBadge(
        badge({
          type: 'bands_picked_genres_min',
          genres: ['Death Metal', 'Black Metal', 'Grindcore'],
          count: 4,
        }),
        ctx,
      ),
    ).toBe(false);
  });

  it('skips bands whose genre is null', () => {
    // b5 has genre: null — must not count even if the array contained matching strings
    const ctx = buildBadgeContext(authUser(), ['b5'], new Map(), bandsById);
    expect(
      evaluateBadge(
        badge({ type: 'bands_picked_genres_min', genres: ['Death Metal'], count: 1 }),
        ctx,
      ),
    ).toBe(false);
  });

  it('empty genres array is never earned (count > 0)', () => {
    const ctx = buildBadgeContext(authUser(), ['b1', 'b2', 'b3'], new Map(), bandsById);
    expect(
      evaluateBadge(badge({ type: 'bands_picked_genres_min', genres: [], count: 1 }), ctx),
    ).toBe(false);
  });
});

describe('evaluateBadge — bands_seen_stages_min (Idea 6)', () => {
  const now = new Date('2026-07-30T00:00:00.000Z');
  // All bands end before `now` → all seen unless opted-out.
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', stage: 'Faster', end_time: '2026-07-29T11:00:00.000Z' })],
    ['b2', band({ id: 'b2', stage: 'Faster', end_time: '2026-07-29T12:00:00.000Z' })],
    ['b3', band({ id: 'b3', stage: 'Harder', end_time: '2026-07-29T13:00:00.000Z' })],
    ['b4', band({ id: 'b4', stage: 'Harder', end_time: '2026-07-29T14:00:00.000Z' })],
    ['b5', band({ id: 'b5', stage: 'Louder', end_time: '2026-07-29T15:00:00.000Z' })],
  ]);

  it('single-element array behaves identically to bands_seen_stage_min', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b1', 'b2', 'b5'],
      new Map(),
      bandsById,
      new Set(),
      now,
    );
    expect(
      evaluateBadge(badge({ type: 'bands_seen_stage_min', stage: 'Faster', count: 2 }), ctx),
    ).toBe(true);
    expect(
      evaluateBadge(
        badge({ type: 'bands_seen_stages_min', stages: ['Faster'], count: 2 }),
        ctx,
      ),
    ).toBe(true);
  });

  it('multi-element array OR-combines matches across listed stages', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b1', 'b2', 'b3', 'b4', 'b5'],
      new Map(),
      bandsById,
      new Set(),
      now,
    );
    expect(
      evaluateBadge(
        badge({ type: 'bands_seen_stages_min', stages: ['Faster', 'Harder'], count: 4 }),
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateBadge(
        badge({ type: 'bands_seen_stages_min', stages: ['Faster', 'Harder'], count: 5 }),
        ctx,
      ),
    ).toBe(false);
  });

  it('does not credit a pick whose end_time has not yet passed', () => {
    const ctxBefore = buildBadgeContext(
      authUser(),
      ['b1', 'b3'],
      new Map(),
      bandsById,
      new Set(),
      new Date('2026-07-29T10:30:00.000Z'), // before any end_time
    );
    expect(
      evaluateBadge(
        badge({ type: 'bands_seen_stages_min', stages: ['Faster', 'Harder'], count: 1 }),
        ctxBefore,
      ),
    ).toBe(false);
  });

  it('empty stages array is never earned (count > 0)', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b1', 'b2', 'b3'],
      new Map(),
      bandsById,
      new Set(),
      now,
    );
    expect(
      evaluateBadge(badge({ type: 'bands_seen_stages_min', stages: [], count: 1 }), ctx),
    ).toBe(false);
  });
});

describe('evaluateBadge — bands_seen_genres_min (Idea 6)', () => {
  const now = new Date('2026-07-30T00:00:00.000Z');
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', genre: 'Death Metal', end_time: '2026-07-29T11:00:00.000Z' })],
    ['b2', band({ id: 'b2', genre: 'Black Metal', end_time: '2026-07-29T12:00:00.000Z' })],
    ['b3', band({ id: 'b3', genre: 'Grindcore', end_time: '2026-07-29T13:00:00.000Z' })],
    ['b4', band({ id: 'b4', genre: 'Power Metal', end_time: '2026-07-29T14:00:00.000Z' })],
    ['b5', band({ id: 'b5', genre: null, end_time: '2026-07-29T15:00:00.000Z' })],
  ]);

  it('single-element array behaves identically to bands_seen_genre_min', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b1', 'b4'],
      new Map(),
      bandsById,
      new Set(),
      now,
    );
    expect(
      evaluateBadge(badge({ type: 'bands_seen_genre_min', genre: 'Death Metal', count: 1 }), ctx),
    ).toBe(true);
    expect(
      evaluateBadge(
        badge({ type: 'bands_seen_genres_min', genres: ['Death Metal'], count: 1 }),
        ctx,
      ),
    ).toBe(true);
  });

  it('multi-element array OR-combines matches across listed genres', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b1', 'b2', 'b3', 'b4'],
      new Map(),
      bandsById,
      new Set(),
      now,
    );
    expect(
      evaluateBadge(
        badge({
          type: 'bands_seen_genres_min',
          genres: ['Death Metal', 'Black Metal', 'Grindcore'],
          count: 3,
        }),
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateBadge(
        badge({
          type: 'bands_seen_genres_min',
          genres: ['Death Metal', 'Black Metal', 'Grindcore'],
          count: 4,
        }),
        ctx,
      ),
    ).toBe(false);
  });

  it('skips bands whose genre is null even if the seen pick ended', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b5'],
      new Map(),
      bandsById,
      new Set(),
      now,
    );
    expect(
      evaluateBadge(
        badge({ type: 'bands_seen_genres_min', genres: ['Death Metal'], count: 1 }),
        ctx,
      ),
    ).toBe(false);
  });

  it('respects missed opt-outs (band is not "seen" even if it ended)', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b1', 'b2'],
      new Map(),
      bandsById,
      new Set(['b1']), // user opted out of b1
      now,
    );
    expect(
      evaluateBadge(
        badge({
          type: 'bands_seen_genres_min',
          genres: ['Death Metal', 'Black Metal'],
          count: 2,
        }),
        ctx,
      ),
    ).toBe(false);
    expect(
      evaluateBadge(
        badge({
          type: 'bands_seen_genres_min',
          genres: ['Death Metal', 'Black Metal'],
          count: 1,
        }),
        ctx,
      ),
    ).toBe(true);
  });

  it('empty genres array is never earned (count > 0)', () => {
    const ctx = buildBadgeContext(
      authUser(),
      ['b1', 'b2'],
      new Map(),
      bandsById,
      new Set(),
      now,
    );
    expect(
      evaluateBadge(badge({ type: 'bands_seen_genres_min', genres: [], count: 1 }), ctx),
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
      { camping: 15, lost: 2 },
      new Set(),
    );
    const cfg = { ...badge({ type: 'crew_at_location_min', location: 'camping', count: 15 }), slug: 'bbq-crew' };
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
    const cfg = { ...badge({ type: 'crew_at_location_min', location: 'camping', count: 15 }), slug: 'bbq-crew' };
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
      new Set(['bbq-crew']), // but badge was already earned
    );
    const cfg = { ...badge({ type: 'crew_at_location_min', location: 'camping', count: 15 }), slug: 'bbq-crew', persist: true };
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
    const cfg = { ...badge({ type: 'crew_at_location_min', location: 'camping', count: 15 }), slug: 'bbq-crew' };
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

describe('registry — 2026 image-driven badges', () => {
  const findBadge = (slug: string): BadgeConfig => {
    const found = BADGES.find((b) => b.slug === slug);
    if (!found) throw new Error(`Badge not found in BADGES[]: ${slug}`);
    return found;
  };

  describe('wacken-firefighters (band_seen_named: Wacken Firefighters)', () => {
    const cfg = findBadge('wacken-firefighters');
    const now = new Date('2026-08-01T12:00:00.000Z');
    const ff = band({
      id: 'wak1',
      name: 'Wacken Firefighters',
      stage: 'Wackinger',
      start_time: '2026-07-29T10:00:00.000Z',
      end_time: '2026-07-29T10:45:00.000Z',
    });

    it('earned when user picked & seen Wacken Firefighters', () => {
      const ctx = buildBadgeContext(
        authUser(),
        ['wak1'],
        new Map(),
        new Map([['wak1', ff]]),
        new Set(),
        now,
      );
      expect(evaluateBadge(cfg, ctx)).toBe(true);
    });

    it('not earned when user did not pick the band', () => {
      const ctx = buildBadgeContext(authUser(), [], new Map(), new Map([['wak1', ff]]), new Set(), now);
      expect(evaluateBadge(cfg, ctx)).toBe(false);
    });
  });

  describe('gutalax (band_seen_named: Gutalax)', () => {
    const cfg = findBadge('gutalax');
    const now = new Date('2026-08-01T12:00:00.000Z');
    const gx = band({
      id: 'was20',
      name: 'Gutalax',
      stage: 'Wasteland',
      start_time: '2026-07-31T19:30:00.000Z',
      end_time: '2026-07-31T20:15:00.000Z',
      genre: 'Goregrind',
    });

    it('earned when user is credited with seeing Gutalax', () => {
      const ctx = buildBadgeContext(authUser(), ['was20'], new Map(), new Map([['was20', gx]]), new Set(), now);
      expect(evaluateBadge(cfg, ctx)).toBe(true);
    });

    it('not earned if user opted out via "didn\'t see"', () => {
      const ctx = buildBadgeContext(
        authUser(),
        ['was20'],
        new Map(),
        new Map([['was20', gx]]),
        new Set(['was20']),
        now,
      );
      expect(evaluateBadge(cfg, ctx)).toBe(false);
    });
  });

  describe('heavysaurus (band_seen_named: Heavysaurus)', () => {
    const cfg = findBadge('heavysaurus');
    const now = new Date('2026-08-02T12:00:00.000Z');
    const hs = band({
      id: 'was28',
      name: 'Heavysaurus',
      stage: 'Wasteland',
      start_time: '2026-08-01T19:30:00.000Z',
      end_time: '2026-08-01T20:15:00.000Z',
      genre: "Children's Metal",
    });

    it('earned when user picked & seen Heavysaurus', () => {
      const ctx = buildBadgeContext(authUser(), ['was28'], new Map(), new Map([['was28', hs]]), new Set(), now);
      expect(evaluateBadge(cfg, ctx)).toBe(true);
    });
  });

  describe('wackinger-regular (bands_seen_stage_min: Wackinger, count 3)', () => {
    const cfg = findBadge('wackinger-regular');
    const now = new Date('2026-08-02T23:00:00.000Z');
    const bandsById = new Map<string, BadgeBand>([
      ['w1', band({ id: 'w1', stage: 'Wackinger', end_time: '2026-07-29T11:00:00.000Z' })],
      ['w2', band({ id: 'w2', stage: 'Wackinger', end_time: '2026-07-30T11:00:00.000Z' })],
      ['w3', band({ id: 'w3', stage: 'Wackinger', end_time: '2026-07-31T11:00:00.000Z' })],
      ['f1', band({ id: 'f1', stage: 'Faster', end_time: '2026-07-29T11:00:00.000Z' })],
    ]);

    it('earned at exactly 3 Wackinger bands seen', () => {
      const ctx = buildBadgeContext(authUser(), ['w1', 'w2', 'w3'], new Map(), bandsById, new Set(), now);
      expect(evaluateBadge(cfg, ctx)).toBe(true);
    });

    it('not earned at 2 Wackinger seen', () => {
      const ctx = buildBadgeContext(authUser(), ['w1', 'w2', 'f1'], new Map(), bandsById, new Set(), now);
      expect(evaluateBadge(cfg, ctx)).toBe(false);
    });
  });

  describe('wasteland-warrior (bands_seen_stage_min: Wasteland, count 1)', () => {
    const cfg = findBadge('wasteland-warrior');
    const now = new Date('2026-08-02T23:00:00.000Z');
    const bandsById = new Map<string, BadgeBand>([
      ['w1', band({ id: 'w1', stage: 'Wasteland', end_time: '2026-07-29T11:00:00.000Z' })],
      ['f1', band({ id: 'f1', stage: 'Faster', end_time: '2026-07-29T11:00:00.000Z' })],
    ]);

    it('earned with a single Wasteland band seen', () => {
      const ctx = buildBadgeContext(authUser(), ['w1'], new Map(), bandsById, new Set(), now);
      expect(evaluateBadge(cfg, ctx)).toBe(true);
    });

    it('not earned with 0 Wasteland bands seen', () => {
      const ctx = buildBadgeContext(authUser(), ['f1'], new Map(), bandsById, new Set(), now);
      expect(evaluateBadge(cfg, ctx)).toBe(false);
    });
  });

  describe('bullhead-heat (bands_seen_stages_min: Faster ∪ Harder, count 6)', () => {
    const cfg = findBadge('bullhead-heat');
    const now = new Date('2026-08-02T23:00:00.000Z');
    const bandsById = new Map<string, BadgeBand>([
      ['f1', band({ id: 'f1', stage: 'Faster', end_time: '2026-07-29T11:00:00.000Z' })],
      ['f2', band({ id: 'f2', stage: 'Faster', end_time: '2026-07-29T13:00:00.000Z' })],
      ['f3', band({ id: 'f3', stage: 'Faster', end_time: '2026-07-29T15:00:00.000Z' })],
      ['h1', band({ id: 'h1', stage: 'Harder', end_time: '2026-07-29T11:00:00.000Z' })],
      ['h2', band({ id: 'h2', stage: 'Harder', end_time: '2026-07-29T13:00:00.000Z' })],
      ['h3', band({ id: 'h3', stage: 'Harder', end_time: '2026-07-29T15:00:00.000Z' })],
      ['l1', band({ id: 'l1', stage: 'Louder', end_time: '2026-07-29T15:00:00.000Z' })],
    ]);

    it('earned at exactly 6 across Faster ∪ Harder ("more than 5")', () => {
      const ctx = buildBadgeContext(
        authUser(),
        ['f1', 'f2', 'f3', 'h1', 'h2', 'h3'],
        new Map(),
        bandsById,
        new Set(),
        now,
      );
      expect(evaluateBadge(cfg, ctx)).toBe(true);
    });

    it('not earned at 5 across Faster ∪ Harder (Louder picks do not count)', () => {
      const ctx = buildBadgeContext(
        authUser(),
        ['f1', 'f2', 'f3', 'h1', 'h2', 'l1'],
        new Map(),
        bandsById,
        new Set(),
        now,
      );
      expect(evaluateBadge(cfg, ctx)).toBe(false);
    });
  });
});
