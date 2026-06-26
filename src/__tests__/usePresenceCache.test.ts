import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

const { loadAllUserPresenceMock } = vi.hoisted(() => ({
  loadAllUserPresenceMock: vi.fn(),
}));

vi.mock('../lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/db')>();
  loadAllUserPresenceMock.mockImplementation(actual.loadAllUserPresence);
  return {
    ...actual,
    loadAllUserPresence: loadAllUserPresenceMock,
  };
});

import {
  PRESENCE_CHANGED_EVENT,
  resetDbConnectionForTests,
  saveUserPresence,
} from '../lib/db';
import { usePresenceCache } from '../hooks/useSocialSnapshotSpecs';
import { resetIdbSubscriptionsForTests } from '../hooks/useIdbSubscription';

beforeEach(async () => {
  resetIdbSubscriptionsForTests();
  loadAllUserPresenceMock.mockClear();
  await deleteViralatasDatabase();
  await resetDbConnectionForTests();
});

describe('usePresenceCache', () => {
  it('patches from PRESENCE_CHANGED_EVENT detail without full IDB reload', async () => {
    await saveUserPresence({
      user_id: 'user-a',
      is_camping: true,
      is_at_metal_place: false,
      updated_at: '2026-01-01T00:00:00Z',
    });
    await saveUserPresence({
      user_id: 'user-b',
      is_camping: true,
      is_at_metal_place: false,
      updated_at: '2026-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => usePresenceCache());
    await waitFor(() => expect(result.current).toHaveLength(2));

    loadAllUserPresenceMock.mockClear();

    await saveUserPresence({
      user_id: 'user-a',
      is_camping: false,
      is_at_metal_place: false,
      updated_at: '2026-01-02T00:00:00Z',
    });

    await waitFor(() => {
      expect(result.current?.find((row) => row.user_id === 'user-a')?.is_camping).toBe(false);
    });
    expect(result.current?.find((row) => row.user_id === 'user-b')?.is_camping).toBe(true);
    expect(loadAllUserPresenceMock).not.toHaveBeenCalled();
  });

  it('full reloads on bare PRESENCE_CHANGED_EVENT (bulk replace)', async () => {
    await saveUserPresence({
      user_id: 'user-a',
      is_camping: true,
      is_at_metal_place: false,
      updated_at: '2026-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => usePresenceCache());
    await waitFor(() => expect(result.current).toHaveLength(1));

    loadAllUserPresenceMock.mockClear();
    window.dispatchEvent(new Event(PRESENCE_CHANGED_EVENT));

    await waitFor(() => expect(loadAllUserPresenceMock).toHaveBeenCalledTimes(1));
    expect(result.current).toHaveLength(1);
  });
});
