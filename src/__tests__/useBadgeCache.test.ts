import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

const userId = 'user-badge-cache';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
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
import { useBadgeCache } from '../hooks/useBadgeCache';
import type { Band, CrewUser } from '../types';
import type { User as AuthUser } from '@supabase/supabase-js';

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

  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: {
      session: {
        user: authUser({ country: 'br', special_badges: [] }),
      },
    },
    error: null,
  } as never);
});

describe('useBadgeCache', () => {
  it('loads IDB snapshot on mount', async () => {
    await saveBands([sampleBand]);
    await saveCrewUsers([brCrewUser]);
    await saveUserPick({
      user_id: userId,
      band_id: sampleBand.id,
      created_at: new Date().toISOString(),
    });

    const { result } = renderHook(() => useBadgeCache(userId));

    await waitFor(() => expect(result.current.cacheLoading).toBe(false));
    expect(result.current.snapshot?.userPicks).toHaveLength(1);
    expect(result.current.snapshot?.allPicks).toHaveLength(1);
    expect(result.current.snapshot?.bands).toHaveLength(1);
  });

  it('refreshes snapshot when picks change event fires', async () => {
    await saveBands([sampleBand]);
    await saveCrewUsers([brCrewUser]);

    const { result } = renderHook(() => useBadgeCache(userId));
    await waitFor(() => expect(result.current.cacheLoading).toBe(false));
    expect(result.current.snapshot?.allPicks).toHaveLength(0);

    await saveUserPick({
      user_id: userId,
      band_id: sampleBand.id,
      created_at: new Date().toISOString(),
    });
    window.dispatchEvent(new Event(PICKS_CHANGED_EVENT));

    await waitFor(() => expect(result.current.snapshot?.allPicks).toHaveLength(1));
  });
});
