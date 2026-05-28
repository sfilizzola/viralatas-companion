import { describe, expect, it, vi } from 'vitest';
import type { User as AuthUser } from '@supabase/supabase-js';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

import { buildFestivalWrapStats } from '../services/festivalWrap';
import {
  buildBadgeContextFromSnapshot,
  type BadgeIdbSnapshot,
} from '../services/badges/badgeContextBuilder';
import type { Band, CrewUser } from '../types';

const AFTER_FESTIVAL = new Date('2026-08-10T00:00:00.000Z');

vi.mock('../services/time', () => ({
  now: () => AFTER_FESTIVAL,
}));

function authUser(metadata: Record<string, unknown> = {}): AuthUser {
  return {
    id: 'u1',
    app_metadata: {},
    user_metadata: metadata,
    aud: '',
    created_at: '',
  } as unknown as AuthUser;
}

function band(partial: Partial<Band> & Pick<Band, 'id'>): Band {
  return {
    slot_id: 'FAS1',
    name: `Band ${partial.id}`,
    stage: 'Faster',
    start_time: '2026-07-28T10:00:00.000Z',
    end_time: '2026-07-28T11:00:00.000Z',
    image_url: null,
    genre: 'Heavy Metal',
    category: 'band',
    ...partial,
  };
}

const defaultCrew: CrewUser[] = [
  {
    id: 'u1',
    display_name: 'Alice',
    avatar_url: null,
    wacken_arrival_day: null,
    is_friend: false,
  },
  {
    id: 'u2',
    display_name: 'Bob',
    avatar_url: null,
    wacken_arrival_day: null,
    is_friend: false,
  },
  {
    id: 'u3',
    display_name: 'Carol',
    avatar_url: null,
    wacken_arrival_day: null,
    is_friend: false,
  },
];

function minimalSnapshot(overrides: Partial<BadgeIdbSnapshot> = {}): BadgeIdbSnapshot {
  return {
    userPicks: [],
    allPicks: [],
    bands: [],
    allMissed: [],
    assignedBadges: [],
    isCurrentUserFriend: false,
    presence: [],
    crewUsers: defaultCrew,
    metalPlaceWindowActive: false,
    liveTestBandId: null,
    ...overrides,
  };
}

describe('buildFestivalWrapStats', () => {
  it('returns hasPicks false when user has zero picks', () => {
    const stats = buildFestivalWrapStats(minimalSnapshot(), 'u1', authUser());
    expect(stats.hasPicks).toBe(false);
    expect(stats.personal.bandsPicked).toBe(0);
  });

  it('seen / skipped match badge engine semantics', () => {
    const bands = [
      band({ id: 'b1', name: 'Alestorm', genre: 'Pirate Metal' }),
      band({ id: 'b2', name: 'Bathory', stage: 'Wackinger', genre: 'Black Metal' }),
      band({ id: 'b3', name: 'Slayer', stage: 'Harder', genre: 'Thrash' }),
    ];
    const snap = minimalSnapshot({
      userPicks: bands.map((b) => ({ band_id: b.id })),
      allPicks: bands.map((b) => ({
        user_id: 'u1',
        band_id: b.id,
        created_at: '2026-07-01T00:00:00Z',
      })),
      bands,
      allMissed: [{ user_id: 'u1', band_id: 'b1' }],
    });

    const ctx = buildBadgeContextFromSnapshot(snap, 'u1', authUser());
    const stats = buildFestivalWrapStats(snap, 'u1', authUser());

    expect(stats.hasPicks).toBe(true);
    expect(stats.personal.bandsSeen).toBe(ctx.seenBands.length);
    expect(stats.personal.bandsSkipped).toBe(1);
    expect(stats.personal.topGenre).toBe('Black Metal');
    expect(stats.personal.topStage).toBe('Harder');
    expect(stats.personal.stageDiversity).toBe(2);
  });

  it('crew top band matches PopularPage sort (max pick count)', () => {
    const bandA = band({ id: 'a', name: 'Alpha', start_time: '2026-07-28T12:00:00.000Z' });
    const bandB = band({ id: 'b', name: 'Beta', start_time: '2026-07-28T10:00:00.000Z' });
    const bandC = band({ id: 'c', name: 'Gamma' });
    const snap = minimalSnapshot({
      userPicks: [{ band_id: 'a' }],
      allPicks: [
        { user_id: 'u1', band_id: 'a', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u2', band_id: 'a', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u3', band_id: 'b', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u1', band_id: 'c', created_at: '2026-07-01T00:00:00Z' },
      ],
      bands: [bandA, bandB, bandC],
    });

    const stats = buildFestivalWrapStats(snap, 'u1', authUser());
    expect(stats.crew.topBandName).toBe('Alpha');
    expect(stats.crew.topBandPickCount).toBe(2);
  });

  it('pick twin is highest Jaccard overlap excluding self', () => {
    const bands = [
      band({ id: 'a' }),
      band({ id: 'b' }),
      band({ id: 'c' }),
      band({ id: 'x' }),
    ];
    const snap = minimalSnapshot({
      userPicks: [{ band_id: 'a' }, { band_id: 'b' }],
      allPicks: [
        { user_id: 'u1', band_id: 'a', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u1', band_id: 'b', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u2', band_id: 'a', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u2', band_id: 'b', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u2', band_id: 'c', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u3', band_id: 'x', created_at: '2026-07-01T00:00:00Z' },
      ],
      bands,
    });

    const stats = buildFestivalWrapStats(snap, 'u1', authUser());
    expect(stats.crew.pickTwinUserId).toBe('u2');
    expect(stats.crew.pickTwinOverlapPct).toBe(67);
    expect(stats.crew.pickTwinDisplayName).toBe('Bob');
  });

  it('surfaces avatar urls for current user and pick twin from crewUsers', () => {
    const bands = [band({ id: 'a' }), band({ id: 'b' })];
    const crewWithAvatars = defaultCrew.map((u) => ({
      ...u,
      avatar_url:
        u.id === 'u1'
          ? 'https://example.com/alice.jpg'
          : u.id === 'u2'
            ? 'https://example.com/bob.jpg'
            : null,
    }));
    const snap = minimalSnapshot({
      userPicks: [{ band_id: 'a' }, { band_id: 'b' }],
      allPicks: [
        { user_id: 'u1', band_id: 'a', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u1', band_id: 'b', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u2', band_id: 'a', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u2', band_id: 'b', created_at: '2026-07-01T00:00:00Z' },
      ],
      bands,
      crewUsers: crewWithAvatars,
    });

    const stats = buildFestivalWrapStats(
      snap,
      'u1',
      authUser({ avatar_url: 'https://example.com/meta-alice.jpg', display_name: 'Alice' }),
    );
    expect(stats.crew.currentUserDisplayName).toBe('Alice');
    expect(stats.crew.currentUserAvatarUrl).toBe('https://example.com/alice.jpg');
    expect(stats.crew.pickTwinAvatarUrl).toBe('https://example.com/bob.jpg');
  });

  it('activeViraLatas counts unique pickers', () => {
    const b = band({ id: 'a' });
    const snap = minimalSnapshot({
      userPicks: [{ band_id: 'a' }],
      allPicks: [
        { user_id: 'u1', band_id: 'a', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u1', band_id: 'a', created_at: '2026-07-01T00:00:00Z' },
        { user_id: 'u2', band_id: 'a', created_at: '2026-07-01T00:00:00Z' },
      ],
      bands: [b],
    });

    const stats = buildFestivalWrapStats(snap, 'u1', authUser());
    expect(stats.crew.activeViraLatas).toBe(2);
  });

  it('isCurrentUserFriend true → locationVisitsTotal null', () => {
    const b = band({ id: 'a' });
    const snap = minimalSnapshot({
      userPicks: [{ band_id: 'a' }],
      allPicks: [{ user_id: 'u1', band_id: 'a', created_at: '2026-07-01T00:00:00Z' }],
      bands: [b],
      isCurrentUserFriend: true,
    });

    const stats = buildFestivalWrapStats(
      snap,
      'u1',
      authUser({ location_visits: { camping: 3, lost: 1 } }),
    );
    expect(stats.personal.locationVisitsTotal).toBeNull();
  });

  it('user with picks but zero missed → bandsSkipped 0 and hasPicks true', () => {
    const b = band({ id: 'a' });
    const snap = minimalSnapshot({
      userPicks: [{ band_id: 'a' }],
      allPicks: [{ user_id: 'u1', band_id: 'a', created_at: '2026-07-01T00:00:00Z' }],
      bands: [b],
      allMissed: [],
    });

    const stats = buildFestivalWrapStats(snap, 'u1', authUser());
    expect(stats.hasPicks).toBe(true);
    expect(stats.personal.bandsSkipped).toBe(0);
  });

  it('surfaces assignable badge slugs from snapshot assignedBadges', () => {
    const b = band({ id: 'a' });
    const snap = minimalSnapshot({
      userPicks: [{ band_id: 'a' }],
      allPicks: [{ user_id: 'u1', band_id: 'a', created_at: '2026-07-01T00:00:00Z' }],
      bands: [b],
      assignedBadges: ['mosh-pit', 'not-a-real-badge', 'crowdsurfer'],
    });

    const stats = buildFestivalWrapStats(snap, 'u1', authUser());
    expect(stats.personal.assignedBadgeSlugs).toEqual(['mosh-pit', 'crowdsurfer']);
  });

  it('returns empty assignedBadgeSlugs when none assigned', () => {
    const b = band({ id: 'a' });
    const snap = minimalSnapshot({
      userPicks: [{ band_id: 'a' }],
      allPicks: [{ user_id: 'u1', band_id: 'a', created_at: '2026-07-01T00:00:00Z' }],
      bands: [b],
      assignedBadges: [],
    });

    const stats = buildFestivalWrapStats(snap, 'u1', authUser());
    expect(stats.personal.assignedBadgeSlugs).toEqual([]);
  });
});
