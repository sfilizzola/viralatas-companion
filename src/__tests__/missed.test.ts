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
    // already ended: July 28 2026 (before festival)
    start_time: '2026-07-28T10:00:00.000Z',
    end_time: '2026-07-28T11:00:00.000Z',
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

// A fixed "now" after all festival bands in test data have ended
const AFTER_FESTIVAL = new Date('2026-08-10T00:00:00.000Z');
// A fixed "now" before all test bands
const BEFORE_FESTIVAL = new Date('2026-07-01T00:00:00.000Z');

function ctx(
  pickIds: string[],
  bandsById: Map<string, BadgeBand>,
  missedIds: Set<string> = new Set(),
  now: Date = AFTER_FESTIVAL,
) {
  return buildBadgeContext(authUser(), pickIds, new Map(), bandsById, missedIds, now);
}

describe('buildBadgeContext — seenBands', () => {
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', name: 'Alestorm', genre: 'Pirate Metal' })],
    ['b2', band({ id: 'b2', name: 'Bathory', stage: 'Wackinger' })],
    ['b3', band({ id: 'b3', name: 'Slayer' })],
  ]);

  it('all picked and ended with no missed → all seen', () => {
    const c = ctx(['b1', 'b2', 'b3'], bandsById);
    expect(c.seenBands).toHaveLength(3);
  });

  it('missed bands are excluded from seenBands', () => {
    const c = ctx(['b1', 'b2', 'b3'], bandsById, new Set(['b1']));
    expect(c.seenBands.map((b) => b.id)).toEqual(['b2', 'b3']);
  });

  it('bands that have not ended yet are excluded from seenBands', () => {
    const c = ctx(['b1', 'b2', 'b3'], bandsById, new Set(), BEFORE_FESTIVAL);
    expect(c.seenBands).toHaveLength(0);
  });

  it('missedBandIds is preserved on the context', () => {
    const missed = new Set(['b2']);
    const c = ctx(['b1', 'b2'], bandsById, missed);
    expect(c.missedBandIds).toBe(missed);
  });
});

describe('evaluateBadge — bands_seen_min', () => {
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1' })],
    ['b2', band({ id: 'b2' })],
    ['b3', band({ id: 'b3' })],
  ]);

  it('passes when seenBands meets threshold', () => {
    const c = ctx(['b1', 'b2', 'b3'], bandsById);
    expect(evaluateBadge(badge({ type: 'bands_seen_min', count: 3 }), c)).toBe(true);
  });

  it('fails when some are missed', () => {
    const c = ctx(['b1', 'b2', 'b3'], bandsById, new Set(['b1', 'b2']));
    expect(evaluateBadge(badge({ type: 'bands_seen_min', count: 2 }), c)).toBe(false);
  });
});

describe('evaluateBadge — bands_seen_genre_min', () => {
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', genre: 'Pirate Metal' })],
    ['b2', band({ id: 'b2', genre: 'Pirate Metal' })],
    ['b3', band({ id: 'b3', genre: 'Heavy Metal' })],
  ]);

  it('passes when enough picks in genre were actually seen', () => {
    const c = ctx(['b1', 'b2', 'b3'], bandsById);
    expect(evaluateBadge(badge({ type: 'bands_seen_genre_min', genre: 'Pirate Metal', count: 2 }), c)).toBe(true);
  });

  it('fails when a missed band drops the genre count below threshold', () => {
    const c = ctx(['b1', 'b2', 'b3'], bandsById, new Set(['b1']));
    expect(evaluateBadge(badge({ type: 'bands_seen_genre_min', genre: 'Pirate Metal', count: 2 }), c)).toBe(false);
  });
});

describe('evaluateBadge — bands_seen_stage_min', () => {
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', stage: 'Wackinger' })],
    ['b2', band({ id: 'b2', stage: 'Wackinger' })],
  ]);

  it('passes when seen count on stage meets threshold', () => {
    const c = ctx(['b1', 'b2'], bandsById);
    expect(evaluateBadge(badge({ type: 'bands_seen_stage_min', stage: 'Wackinger', count: 2 }), c)).toBe(true);
  });

  it('fails when one is missed', () => {
    const c = ctx(['b1', 'b2'], bandsById, new Set(['b1']));
    expect(evaluateBadge(badge({ type: 'bands_seen_stage_min', stage: 'Wackinger', count: 2 }), c)).toBe(false);
  });
});

describe('evaluateBadge — bands_seen_before_hour_min', () => {
  // b-noon starts at 12:00 CEST (UTC 10:00); b-13 starts at 13:00 CEST (UTC 11:00)
  const ended = (utcHour: number) => ({
    start_time: `2026-07-28T${String(utcHour).padStart(2, '0')}:00:00.000Z`,
    end_time: `2026-07-28T${String(utcHour + 1).padStart(2, '0')}:00:00.000Z`,
  });

  const bandsById = new Map<string, BadgeBand>([
    ['b-noon', band({ id: 'b-noon', ...ended(10) })], // 12:00 CEST
    ['b-13', band({ id: 'b-13', ...ended(11) })],     // 13:00 CEST
  ]);

  it('counts seen bands whose CEST start hour is strictly less than threshold', () => {
    const c = ctx(['b-noon', 'b-13'], bandsById);
    expect(evaluateBadge(badge({ type: 'bands_seen_before_hour_min', hour: 13, count: 1 }), c)).toBe(true);
    expect(evaluateBadge(badge({ type: 'bands_seen_before_hour_min', hour: 13, count: 2 }), c)).toBe(false);
  });

  it('does not count missed bands', () => {
    const c = ctx(['b-noon', 'b-13'], bandsById, new Set(['b-noon']));
    expect(evaluateBadge(badge({ type: 'bands_seen_before_hour_min', hour: 13, count: 1 }), c)).toBe(false);
  });
});

describe('evaluateBadge — band_seen_named', () => {
  const bandsById = new Map<string, BadgeBand>([
    ['b1', band({ id: 'b1', name: 'Bathory' })],
  ]);

  it('matches by name when seen', () => {
    const c = ctx(['b1'], bandsById);
    expect(evaluateBadge(badge({ type: 'band_seen_named', name: 'Bathory' }), c)).toBe(true);
  });

  it('does not match when the band was missed', () => {
    const c = ctx(['b1'], bandsById, new Set(['b1']));
    expect(evaluateBadge(badge({ type: 'band_seen_named', name: 'Bathory' }), c)).toBe(false);
  });

  it('does not match when the band has not ended yet', () => {
    const c = ctx(['b1'], bandsById, new Set(), BEFORE_FESTIVAL);
    expect(evaluateBadge(badge({ type: 'band_seen_named', name: 'Bathory' }), c)).toBe(false);
  });
});
