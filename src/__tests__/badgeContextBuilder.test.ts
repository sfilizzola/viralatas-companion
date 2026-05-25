import { describe, expect, it, vi } from 'vitest';
import type { User as AuthUser } from '@supabase/supabase-js';
import { buildBadgeContextFromSnapshot } from '../services/badges/badgeContextBuilder';
import { evaluateBadge, BADGES } from '../services/badges';
import { SCENARIO_NOW } from './fixtures/liveNowScenarios';
import type { Band, CrewUser } from '../types';

vi.mock('../services/time', () => ({
  now: () => new Date(SCENARIO_NOW),
}));

function authUser(metadata: Record<string, unknown> = {}): AuthUser {
  return {
    id: 'user-badge-ctx',
    app_metadata: {},
    user_metadata: metadata,
    aud: '',
    created_at: '',
  } as unknown as AuthUser;
}

const sampleBand: Band = {
  id: 'band-br',
  slot_id: 'FAS1',
  name: 'Test Band',
  stage: 'Faster',
  start_time: '2026-07-29T18:00:00Z',
  end_time: '2026-07-29T19:00:00Z',
  image_url: null,
  genre: 'Thrash',
  category: 'band',
};

const brCrewUser: CrewUser = {
  id: 'user-badge-ctx',
  display_name: 'BR User',
  avatar_url: null,
  wacken_arrival_day: null,
  is_friend: false,
};

describe('buildBadgeContextFromSnapshot', () => {
  it('builds pick counts and metadata from snapshot inputs', () => {
    const ctx = buildBadgeContextFromSnapshot(
      {
        userPicks: [{ band_id: sampleBand.id }],
        allPicks: [{ user_id: 'user-badge-ctx', band_id: sampleBand.id, created_at: '2026-05-01T00:00:00Z' }],
        bands: [sampleBand],
        allMissed: [],
        assignedBadges: [],
        isCurrentUserFriend: false,
        presence: [],
        crewUsers: [brCrewUser],
        metalPlaceWindowActive: false,
        liveTestBandId: null,
      },
      'user-badge-ctx',
      authUser({ country: 'br' }),
    );

    expect(ctx.country).toBe('br');
    expect(ctx.bandsPicked).toBe(1);
    expect(ctx.pickedBands).toHaveLength(1);
    expect(ctx.pickedBands[0]?.name).toBe('Test Band');
  });

  it('counts crew without presence rows toward lost location badges', () => {
    const crew: CrewUser[] = Array.from({ length: 15 }, (_, i) => ({
      id: i === 0 ? 'user-badge-ctx' : `crew-${i}`,
      display_name: `Crew ${i}`,
      avatar_url: null,
      wacken_arrival_day: null,
      is_friend: false,
    }));

    const ctx = buildBadgeContextFromSnapshot(
      {
        userPicks: [],
        allPicks: [],
        bands: [],
        allMissed: [],
        assignedBadges: [],
        isCurrentUserFriend: false,
        presence: [],
        crewUsers: crew,
        metalPlaceWindowActive: false,
        liveTestBandId: null,
      },
      'user-badge-ctx',
      authUser(),
    );

    expect(ctx.crewLocationCounts.lost).toBe(15);
    expect(ctx.currentLocation).toBe('lost');

    const lostTogether = BADGES.find((b) => b.slug === 'lost-together')!;
    expect(evaluateBadge(lostTogether, ctx)).toBe(true);
  });

  it('merges crew_earned_badge_slugs from auth metadata', () => {
    const ctx = buildBadgeContextFromSnapshot(
      {
        userPicks: [],
        allPicks: [],
        bands: [],
        allMissed: [],
        assignedBadges: [],
        isCurrentUserFriend: false,
        presence: [],
        crewUsers: [brCrewUser],
        metalPlaceWindowActive: false,
        liveTestBandId: null,
      },
      'user-badge-ctx',
      authUser({ crew_earned_badge_slugs: ['lost-together'] }),
    );

    expect(ctx.achievedBadgeSlugs.has('lost-together')).toBe(true);
  });
});
