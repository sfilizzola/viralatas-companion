import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

const { loadAllUserPicksMock } = vi.hoisted(() => ({
  loadAllUserPicksMock: vi.fn(),
}));

vi.mock('../lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/db')>();
  loadAllUserPicksMock.mockImplementation(actual.loadAllUserPicks);
  return {
    ...actual,
    loadAllUserPicks: loadAllUserPicksMock,
  };
});

import {
  PICKS_CHANGED_EVENT,
  resetDbConnectionForTests,
  saveUserPick,
} from '../lib/db';
import { useAllPicks } from '../hooks/useAllPicks';
import { usePickCounts } from '../hooks/usePickCounts';
import { useBandAttendees } from '../hooks/useBandAttendees';
import { resetIdbSubscriptionsForTests } from '../hooks/useIdbSubscription';
import type { UserPick } from '../types';

const userA = 'user-a';
const userB = 'user-b';
const band1 = 'band-1';

function samplePick(userId: string, bandId: string): UserPick {
  return { user_id: userId, band_id: bandId, created_at: '2026-01-01T00:00:00Z' };
}

beforeEach(async () => {
  resetIdbSubscriptionsForTests();
  loadAllUserPicksMock.mockClear();
  await deleteViralatasDatabase();
  resetDbConnectionForTests();
});

describe('useIdbSubscription / useAllPicks', () => {
  it('loads picks once on mount and shares cache across subscribers', async () => {
    await saveUserPick(samplePick(userA, band1));

    const hookA = renderHook(() => useAllPicks());
    const hookB = renderHook(() => useAllPicks());

    await waitFor(() => {
      expect(hookA.result.current).toHaveLength(1);
      expect(hookB.result.current).toHaveLength(1);
    });

    expect(loadAllUserPicksMock).toHaveBeenCalledTimes(1);
  });

  it('one PICKS_CHANGED event triggers one loadAllUserPicks with multiple derived hooks', async () => {
    renderHook(() => usePickCounts());
    renderHook(() => useBandAttendees());
    renderHook(() => useAllPicks());

    await waitFor(() => expect(loadAllUserPicksMock).toHaveBeenCalledTimes(1));
    loadAllUserPicksMock.mockClear();

    await saveUserPick(samplePick(userB, band1));

    await waitFor(() => expect(loadAllUserPicksMock).toHaveBeenCalledTimes(1));
  });

  it('dispatched PICKS_CHANGED without IDB write refreshes from cache once', async () => {
    await saveUserPick(samplePick(userA, band1));

    const { result } = renderHook(() => usePickCounts());
    await waitFor(() => expect(result.current[band1]).toBe(1));

    loadAllUserPicksMock.mockClear();
    window.dispatchEvent(new Event(PICKS_CHANGED_EVENT));

    await waitFor(() => expect(loadAllUserPicksMock).toHaveBeenCalledTimes(1));
    expect(result.current[band1]).toBe(1);
  });

  it('updates all subscribers after a pick change', async () => {
    const countsHook = renderHook(() => usePickCounts());
    const picksHook = renderHook(() => useAllPicks());

    await waitFor(() => expect(picksHook.result.current).toEqual([]));

    await saveUserPick(samplePick(userA, band1));
    await saveUserPick(samplePick(userB, band1));

    await waitFor(() => {
      expect(picksHook.result.current).toHaveLength(2);
      expect(countsHook.result.current[band1]).toBe(2);
    });
  });
});
