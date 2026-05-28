import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../services/liveBandTest', () => ({
  syncLiveBandTestConfig: vi.fn().mockResolvedValue(undefined),
}));

import {
  PRESENCE_CHANGED_EVENT,
  resetDbConnectionForTests,
  saveCrewUsers,
  saveUserPresence,
} from '../lib/db';
import { useSocialSnapshot } from '../hooks/useSocialSnapshot';
import { SCENARIO_NOW } from './fixtures/liveNowScenarios';

const userId = 'user-social-snapshot';

beforeEach(async () => {
  await resetDbConnectionForTests();
  await deleteViralatasDatabase();
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
});

describe('useSocialSnapshot', () => {
  it('builds snapshot when IDB data loads', async () => {
    await saveCrewUsers([
      {
        id: userId,
        display_name: 'Snapshot User',
        avatar_url: null,
        wacken_arrival_day: null,
        is_friend: false,
      },
    ]);

    const { result } = renderHook(() => useSocialSnapshot(new Date(SCENARIO_NOW)));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.snapshot).not.toBeNull();
    expect(result.current.crewUsers).toHaveLength(1);
    expect(result.current.snapshot?.crewPlans).toHaveLength(1);
    expect(result.current.snapshot?.crewPlans[0]?.plan.status).toBe('lost');
  });

  it('re-derives snapshot when PRESENCE_CHANGED_EVENT fires', async () => {
    await saveCrewUsers([
      {
        id: userId,
        display_name: 'Snapshot User',
        avatar_url: null,
        wacken_arrival_day: null,
        is_friend: false,
      },
    ]);

    const loadSpy = vi.spyOn(await import('../lib/db'), 'loadAllUserPresence');
    const { result } = renderHook(() => useSocialSnapshot(new Date(SCENARIO_NOW)));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.presence).toEqual([]);

    await saveUserPresence({
      user_id: userId,
      is_camping: true,
      is_at_metal_place: false,
      updated_at: new Date().toISOString(),
    });
    window.dispatchEvent(new Event(PRESENCE_CHANGED_EVENT));

    await waitFor(() => {
      expect(loadSpy).toHaveBeenCalled();
      expect(
        result.current.presence.some((item) => item.user_id === userId && item.is_camping),
      ).toBe(true);
    });

    loadSpy.mockRestore();
  });
});
