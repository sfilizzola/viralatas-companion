import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User as AuthUser } from '@supabase/supabase-js';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

const userId = 'user-badge-ctx';

const { updateUser, onAuthStateChange } = vi.hoisted(() => ({
  updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}));

vi.mock('../services/liveBandTest', () => ({
  syncLiveBandTestConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      updateUser,
      onAuthStateChange,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../repositories', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../repositories')>();
  return {
    ...actual,
    missedRepository: {
      ...actual.missedRepository,
      sync: vi.fn().mockResolvedValue(undefined),
      subscribeToRealtime: vi.fn().mockReturnValue(() => {}),
    },
    presenceRepository: {
      ...actual.presenceRepository,
      syncMetalPlaceConfig: vi.fn().mockResolvedValue(undefined),
    },
  };
});

import {
  resetDbConnectionForTests,
  saveBands,
  saveCrewUsers,
  saveUserPick,
  PICKS_CHANGED_EVENT,
} from '../lib/db';
import { supabase } from '../lib/supabase';
import { evaluateBadge, BADGES } from '../services/badges';
import { useBadgeContext } from '../hooks/useBadgeContext';
import type { Band, CrewUser } from '../types';

function authUser(metadata: Record<string, unknown> = {}): AuthUser {
  return {
    id: userId,
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
  id: userId,
  display_name: 'BR User',
  avatar_url: null,
  wacken_arrival_day: null,
  is_friend: false,
};

beforeEach(async () => {
  await resetDbConnectionForTests();
  await deleteViralatasDatabase();
  updateUser.mockClear();
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: {
      session: {
        user: authUser({ country: 'br', special_badges: [] }),
      },
    },
    error: null,
  } as never);

  const single = vi.fn().mockResolvedValue({
    data: { special_badges: [], is_friend: false },
    error: null,
  });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  vi.mocked(supabase.from).mockReturnValue({ select } as never);
});

describe('useBadgeContext', () => {
  it('builds context from IDB picks and user metadata on mount', async () => {
    await saveBands([sampleBand]);
    await saveCrewUsers([brCrewUser]);
    await saveUserPick({
      user_id: userId,
      band_id: sampleBand.id,
      created_at: new Date().toISOString(),
    });

    const { result } = renderHook(() => useBadgeContext(authUser({ country: 'br' })));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ctx.country).toBe('br');
    expect(result.current.ctx.bandsPicked).toBe(1);
    expect(result.current.ctx.pickedBands).toHaveLength(1);
  });

  it('refreshes when picks change event fires', async () => {
    await saveBands([sampleBand]);
    await saveCrewUsers([brCrewUser]);

    const { result } = renderHook(() => useBadgeContext(authUser({ country: 'br' })));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ctx.bandsPicked).toBe(0);

    await saveUserPick({
      user_id: userId,
      band_id: sampleBand.id,
      created_at: new Date().toISOString(),
    });
    window.dispatchEvent(new Event(PICKS_CHANGED_EVENT));

    await waitFor(() => expect(result.current.ctx.bandsPicked).toBe(1));
  });

  it('shows godlike-assigned badge from crew IDB without Supabase users fetch', async () => {
    await saveCrewUsers([{ ...brCrewUser, special_badges: ['code-wizards'] }]);
    const fromUsers = vi.fn();
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') fromUsers();
      const single = vi.fn().mockResolvedValue({
        data: { special_badges: [], is_friend: false },
        error: null,
      });
      const eq = vi.fn(() => ({ single }));
      const select = vi.fn(() => ({ eq }));
      return { select } as never;
    });
    const user = authUser();
    const { result } = renderHook(() => useBadgeContext(user));
    await waitFor(() => expect(result.current.ctx.assignedBadges).toContain('code-wizards'));
    expect(fromUsers).not.toHaveBeenCalled();
  });

  it('counts crew without presence rows toward lost location badges', async () => {
    const crew: CrewUser[] = Array.from({ length: 15 }, (_, i) => ({
      id: i === 0 ? userId : `crew-${i}`,
      display_name: `Crew ${i}`,
      avatar_url: null,
      wacken_arrival_day: null,
      is_friend: false,
    }));

    await saveCrewUsers(crew);

    const { result } = renderHook(() => useBadgeContext(authUser()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.ctx.crewLocationCounts.lost).toBe(15);
    expect(result.current.ctx.currentLocation).toBe('lost');

    const lostTogether = BADGES.find((b) => b.slug === 'lost-together')!;
    expect(evaluateBadge(lostTogether, result.current.ctx)).toBe(true);
  });

  it('restores persist badges recorded only in crew_earned_badge_slugs', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: authUser({ crew_earned_badge_slugs: ['lost-together'] }),
        },
      },
      error: null,
    } as never);

    await saveCrewUsers([brCrewUser]);

    const { result } = renderHook(() => useBadgeContext(authUser({ crew_earned_badge_slugs: ['lost-together'] })));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const lostTogether = BADGES.find((b) => b.slug === 'lost-together')!;
    expect(result.current.ctx.achievedBadgeSlugs.has('lost-together')).toBe(true);
    expect(evaluateBadge(lostTogether, result.current.ctx)).toBe(true);
  });
});
