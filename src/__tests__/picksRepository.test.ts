import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist all mock functions so they're accessible inside vi.mock factories.
const mocks = vi.hoisted(() => {
  // --- Supabase chain mocks ---
  // delete().eq(user_id).eq(band_id) → awaitable at the second eq
  const mockDeleteEqFinal = vi.fn().mockResolvedValue({ error: null });
  const mockDeleteEq1 = vi.fn(() => ({ eq: mockDeleteEqFinal }));
  const mockDelete = vi.fn(() => ({ eq: mockDeleteEq1 }));

  // upsert(data) → directly awaitable
  const mockUpsert = vi.fn().mockResolvedValue({ error: null });

  // select('*') → directly awaitable (syncCrewFromRemote does not chain .eq after select)
  const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null });

  const mockFrom = vi.fn(() => ({
    upsert: mockUpsert,
    delete: mockDelete,
    select: mockSelect,
  }));

  // --- IDB function mocks ---
  const mockSaveUserPick = vi.fn().mockResolvedValue(undefined);
  const mockRemoveUserPick = vi.fn().mockResolvedValue(undefined);
  const mockReplaceUserPicks = vi.fn().mockResolvedValue(undefined);
  const mockEnqueueOfflinePick = vi.fn().mockResolvedValue(undefined);
  const mockLoadOfflineQueue = vi.fn().mockResolvedValue([]);
  const mockRemoveFromOfflineQueue = vi.fn().mockResolvedValue(undefined);

  return {
    mockFrom,
    mockUpsert,
    mockDelete,
    mockDeleteEq1,
    mockDeleteEqFinal,
    mockSelect,
    mockSaveUserPick,
    mockRemoveUserPick,
    mockReplaceUserPicks,
    mockEnqueueOfflinePick,
    mockLoadOfflineQueue,
    mockRemoveFromOfflineQueue,
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: { from: mocks.mockFrom },
}));

vi.mock('../lib/db', () => ({
  saveUserPick: mocks.mockSaveUserPick,
  removeUserPick: mocks.mockRemoveUserPick,
  replaceUserPicks: mocks.mockReplaceUserPicks,
  enqueueOfflinePick: mocks.mockEnqueueOfflinePick,
  loadOfflineQueue: mocks.mockLoadOfflineQueue,
  removeFromOfflineQueue: mocks.mockRemoveFromOfflineQueue,
}));

import { picksRepository } from '../repositories/picks';
import type { OfflinePickOp } from '../lib/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOp(
  userId: string,
  bandId: string,
  action: 'add' | 'remove',
  createdAt: string,
  id?: string,
): OfflinePickOp {
  return {
    id: id ?? `${userId}:${bandId}:${createdAt}`,
    user_id: userId,
    band_id: bandId,
    action,
    created_at: createdAt,
  };
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    value,
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Restore default mock return values after clearAllMocks
  mocks.mockUpsert.mockResolvedValue({ error: null });
  mocks.mockDeleteEqFinal.mockResolvedValue({ error: null });
  mocks.mockDeleteEq1.mockReturnValue({ eq: mocks.mockDeleteEqFinal });
  mocks.mockDelete.mockReturnValue({ eq: mocks.mockDeleteEq1 });
  mocks.mockSelect.mockResolvedValue({ data: [], error: null });
  mocks.mockFrom.mockReturnValue({
    upsert: mocks.mockUpsert,
    delete: mocks.mockDelete,
    select: mocks.mockSelect,
  });
  mocks.mockSaveUserPick.mockResolvedValue(undefined);
  mocks.mockRemoveUserPick.mockResolvedValue(undefined);
  mocks.mockReplaceUserPicks.mockResolvedValue(undefined);
  mocks.mockEnqueueOfflinePick.mockResolvedValue(undefined);
  mocks.mockLoadOfflineQueue.mockResolvedValue([]);
  mocks.mockRemoveFromOfflineQueue.mockResolvedValue(undefined);

  // Start each test in online state
  setOnline(true);
});

// ---------------------------------------------------------------------------
// picksRepository.toggle()
// ---------------------------------------------------------------------------

describe('picksRepository.toggle()', () => {
  describe('online — adding a pick (currentlyPicked = false)', () => {
    it('calls IDB saveUserPick with correct pick shape', async () => {
      await picksRepository.toggle('user1', 'band1', false);

      expect(mocks.mockSaveUserPick).toHaveBeenCalledOnce();
      const arg = mocks.mockSaveUserPick.mock.calls[0][0];
      expect(arg).toMatchObject({ user_id: 'user1', band_id: 'band1' });
      expect(typeof arg.created_at).toBe('string');
    });

    it('calls Supabase upsert with the same pick object', async () => {
      await picksRepository.toggle('user1', 'band1', false);

      expect(mocks.mockFrom).toHaveBeenCalledWith('user_picks');
      expect(mocks.mockUpsert).toHaveBeenCalledOnce();
      const upsertArg = mocks.mockUpsert.mock.calls[0][0];
      expect(upsertArg).toMatchObject({ user_id: 'user1', band_id: 'band1' });
    });

    it('does not enqueue an offline pick when Supabase succeeds', async () => {
      await picksRepository.toggle('user1', 'band1', false);

      expect(mocks.mockEnqueueOfflinePick).not.toHaveBeenCalled();
    });
  });

  describe('online — removing a pick (currentlyPicked = true)', () => {
    it('calls IDB removeUserPick with userId and bandId', async () => {
      await picksRepository.toggle('user1', 'band1', true);

      expect(mocks.mockRemoveUserPick).toHaveBeenCalledOnce();
      expect(mocks.mockRemoveUserPick).toHaveBeenCalledWith('user1', 'band1');
    });

    it('calls Supabase delete with eq filters for user_id and band_id', async () => {
      await picksRepository.toggle('user1', 'band1', true);

      expect(mocks.mockFrom).toHaveBeenCalledWith('user_picks');
      expect(mocks.mockDelete).toHaveBeenCalledOnce();
      expect(mocks.mockDeleteEq1).toHaveBeenCalledWith('user_id', 'user1');
      expect(mocks.mockDeleteEqFinal).toHaveBeenCalledWith('band_id', 'band1');
    });

    it('does not enqueue an offline pick when Supabase succeeds', async () => {
      await picksRepository.toggle('user1', 'band1', true);

      expect(mocks.mockEnqueueOfflinePick).not.toHaveBeenCalled();
    });
  });

  describe('offline — adding a pick (currentlyPicked = false)', () => {
    beforeEach(() => setOnline(false));

    it('still writes to IDB via saveUserPick', async () => {
      await picksRepository.toggle('user1', 'band1', false);

      expect(mocks.mockSaveUserPick).toHaveBeenCalledOnce();
      expect(mocks.mockSaveUserPick.mock.calls[0][0]).toMatchObject({
        user_id: 'user1',
        band_id: 'band1',
      });
    });

    it('enqueues an offline pick with action "add"', async () => {
      await picksRepository.toggle('user1', 'band1', false);

      expect(mocks.mockEnqueueOfflinePick).toHaveBeenCalledOnce();
      const queued = mocks.mockEnqueueOfflinePick.mock.calls[0][0];
      expect(queued).toMatchObject({ user_id: 'user1', band_id: 'band1', action: 'add' });
    });

    it('does NOT call Supabase when offline', async () => {
      await picksRepository.toggle('user1', 'band1', false);

      expect(mocks.mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('offline — removing a pick (currentlyPicked = true)', () => {
    beforeEach(() => setOnline(false));

    it('still writes to IDB via removeUserPick', async () => {
      await picksRepository.toggle('user1', 'band1', true);

      expect(mocks.mockRemoveUserPick).toHaveBeenCalledOnce();
      expect(mocks.mockRemoveUserPick).toHaveBeenCalledWith('user1', 'band1');
    });

    it('enqueues an offline pick with action "remove"', async () => {
      await picksRepository.toggle('user1', 'band1', true);

      expect(mocks.mockEnqueueOfflinePick).toHaveBeenCalledOnce();
      const queued = mocks.mockEnqueueOfflinePick.mock.calls[0][0];
      expect(queued).toMatchObject({ user_id: 'user1', band_id: 'band1', action: 'remove' });
    });

    it('does NOT call Supabase when offline', async () => {
      await picksRepository.toggle('user1', 'band1', true);

      expect(mocks.mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('Supabase error fallback — adding', () => {
    it('enqueues offline pick when Supabase upsert returns an error', async () => {
      mocks.mockUpsert.mockResolvedValue({ error: new Error('network failure') });

      await expect(picksRepository.toggle('user1', 'band1', false)).resolves.toBeUndefined();

      expect(mocks.mockSaveUserPick).toHaveBeenCalledOnce();
      expect(mocks.mockEnqueueOfflinePick).toHaveBeenCalledOnce();
      const queued = mocks.mockEnqueueOfflinePick.mock.calls[0][0];
      expect(queued).toMatchObject({ user_id: 'user1', band_id: 'band1', action: 'add' });
    });

    it('does not throw even when Supabase errors', async () => {
      mocks.mockUpsert.mockResolvedValue({ error: new Error('503') });

      await expect(picksRepository.toggle('user1', 'band1', false)).resolves.not.toThrow();
    });
  });

  describe('Supabase error fallback — removing', () => {
    it('enqueues offline pick when Supabase delete returns an error', async () => {
      mocks.mockDeleteEqFinal.mockResolvedValue({ error: new Error('timeout') });

      await expect(picksRepository.toggle('user1', 'band1', true)).resolves.toBeUndefined();

      expect(mocks.mockRemoveUserPick).toHaveBeenCalledOnce();
      expect(mocks.mockEnqueueOfflinePick).toHaveBeenCalledOnce();
      const queued = mocks.mockEnqueueOfflinePick.mock.calls[0][0];
      expect(queued).toMatchObject({ user_id: 'user1', band_id: 'band1', action: 'remove' });
    });
  });
});

// ---------------------------------------------------------------------------
// picksRepository.flushOfflineQueue()
// ---------------------------------------------------------------------------

describe('picksRepository.flushOfflineQueue()', () => {
  it('returns 0 when the queue is empty and makes no Supabase calls', async () => {
    mocks.mockLoadOfflineQueue.mockResolvedValue([]);

    const result = await picksRepository.flushOfflineQueue();

    expect(result).toBe(0);
    expect(mocks.mockFrom).not.toHaveBeenCalled();
  });

  it('calls Supabase upsert for an "add" op and removes it from the queue', async () => {
    const op = makeOp('user1', 'band1', 'add', '2026-07-29T10:00:00Z', 'op-1');
    mocks.mockLoadOfflineQueue.mockResolvedValue([op]);

    const result = await picksRepository.flushOfflineQueue();

    expect(mocks.mockUpsert).toHaveBeenCalledOnce();
    expect(mocks.mockUpsert.mock.calls[0][0]).toMatchObject({
      user_id: 'user1',
      band_id: 'band1',
      created_at: '2026-07-29T10:00:00Z',
    });
    expect(mocks.mockRemoveFromOfflineQueue).toHaveBeenCalledWith('op-1');
    expect(result).toBe(1);
  });

  it('calls Supabase delete chain for a "remove" op and removes it from the queue', async () => {
    const op = makeOp('user1', 'band1', 'remove', '2026-07-29T10:00:00Z', 'op-2');
    mocks.mockLoadOfflineQueue.mockResolvedValue([op]);

    const result = await picksRepository.flushOfflineQueue();

    expect(mocks.mockDelete).toHaveBeenCalledOnce();
    expect(mocks.mockDeleteEq1).toHaveBeenCalledWith('user_id', 'user1');
    expect(mocks.mockDeleteEqFinal).toHaveBeenCalledWith('band_id', 'band1');
    expect(mocks.mockRemoveFromOfflineQueue).toHaveBeenCalledWith('op-2');
    expect(result).toBe(1);
  });

  it('deduplicates: only the latest op per (user_id, band_id) is sent to Supabase', async () => {
    const older = makeOp('user1', 'band1', 'add', '2026-07-29T09:00:00Z', 'op-old');
    const newer = makeOp('user1', 'band1', 'remove', '2026-07-29T10:00:00Z', 'op-new');
    mocks.mockLoadOfflineQueue.mockResolvedValue([older, newer]);

    await picksRepository.flushOfflineQueue();

    // Only one Supabase call (the latest op wins — remove)
    expect(mocks.mockDelete).toHaveBeenCalledOnce();
    expect(mocks.mockUpsert).not.toHaveBeenCalled();
  });

  it('removes ALL duplicate ops from the queue, not just the surviving one', async () => {
    const older = makeOp('user1', 'band1', 'add', '2026-07-29T09:00:00Z', 'op-old');
    const newer = makeOp('user1', 'band1', 'remove', '2026-07-29T10:00:00Z', 'op-new');
    mocks.mockLoadOfflineQueue.mockResolvedValue([older, newer]);

    const result = await picksRepository.flushOfflineQueue();

    // Both ids should be removed from the queue
    const removedIds = mocks.mockRemoveFromOfflineQueue.mock.calls.map((c) => c[0]);
    expect(removedIds).toContain('op-old');
    expect(removedIds).toContain('op-new');
    // flushed count reflects all queue entries cleared
    expect(result).toBe(2);
  });

  it('processes multiple distinct (user_id, band_id) pairs independently', async () => {
    const op1 = makeOp('user1', 'band1', 'add', '2026-07-29T10:00:00Z', 'a');
    const op2 = makeOp('user1', 'band2', 'remove', '2026-07-29T10:00:00Z', 'b');
    const op3 = makeOp('user2', 'band1', 'add', '2026-07-29T10:00:00Z', 'c');
    mocks.mockLoadOfflineQueue.mockResolvedValue([op1, op2, op3]);

    await picksRepository.flushOfflineQueue();

    // Two upserts (user1/band1 and user2/band1) and one delete (user1/band2)
    expect(mocks.mockUpsert).toHaveBeenCalledTimes(2);
    expect(mocks.mockDelete).toHaveBeenCalledTimes(1);
  });

  it('does not remove a queue entry if Supabase returns an error for that op', async () => {
    const op = makeOp('user1', 'band1', 'add', '2026-07-29T10:00:00Z', 'op-fail');
    mocks.mockLoadOfflineQueue.mockResolvedValue([op]);
    mocks.mockUpsert.mockResolvedValue({ error: new Error('server error') });

    const result = await picksRepository.flushOfflineQueue();

    expect(mocks.mockRemoveFromOfflineQueue).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// picksRepository.syncCrewFromRemote()
// ---------------------------------------------------------------------------

describe('picksRepository.syncCrewFromRemote()', () => {
  it('queries Supabase for all user_picks rows', async () => {
    await picksRepository.syncCrewFromRemote();

    expect(mocks.mockFrom).toHaveBeenCalledWith('user_picks');
    expect(mocks.mockSelect).toHaveBeenCalledWith('*');
  });

  it('calls replaceUserPicks with all fetched rows', async () => {
    const rows = [
      { user_id: 'user1', band_id: 'band1', created_at: '2026-07-29T10:00:00Z' },
      { user_id: 'user2', band_id: 'band2', created_at: '2026-07-29T11:00:00Z' },
    ];
    mocks.mockSelect.mockResolvedValue({ data: rows, error: null });

    await picksRepository.syncCrewFromRemote();

    expect(mocks.mockReplaceUserPicks).toHaveBeenCalledOnce();
    expect(mocks.mockReplaceUserPicks).toHaveBeenCalledWith(rows);
  });

  it('does nothing if Supabase returns an error', async () => {
    mocks.mockSelect.mockResolvedValue({ data: null, error: new Error('forbidden') });

    await expect(picksRepository.syncCrewFromRemote()).resolves.toBeUndefined();
    expect(mocks.mockReplaceUserPicks).not.toHaveBeenCalled();
  });

  it('does nothing if Supabase returns null data without an error', async () => {
    mocks.mockSelect.mockResolvedValue({ data: null, error: null });

    await picksRepository.syncCrewFromRemote();

    expect(mocks.mockReplaceUserPicks).not.toHaveBeenCalled();
  });
});
