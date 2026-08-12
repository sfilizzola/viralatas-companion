import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_FESTIVAL_ID } from './helpers/testFestival';

// Hoist all mock functions so they're accessible inside vi.mock factories.
const mocks = vi.hoisted(() => {
  // --- Supabase chain mocks ---
  // delete().eq(user_id).eq(band_id).eq(festival_id) → awaitable at the third eq
  const mockDeleteEqFinal = vi.fn().mockResolvedValue({ error: null });
  const mockDeleteEq2 = vi.fn(() => ({ eq: mockDeleteEqFinal }));
  const mockDeleteEq1 = vi.fn(() => ({ eq: mockDeleteEq2 }));
  const mockDelete = vi.fn(() => ({ eq: mockDeleteEq1 }));

  // upsert(data) → directly awaitable
  const mockUpsert = vi.fn().mockResolvedValue({ error: null });

  // select('*') → awaitable; .eq('festival_id', …) / .in('user_id', …) for scoped sync
  const mockSelectIn = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockSelectEq = vi.fn(function selectEq() {
    const result = Promise.resolve({ data: [], error: null }) as Promise<{ data: unknown; error: unknown }> & {
      eq: typeof mockSelectEq;
      in: typeof mockSelectIn;
    };
    result.eq = mockSelectEq;
    result.in = mockSelectIn;
    return result;
  });
  const mockSelect = vi.fn(() => {
    const result = Promise.resolve({ data: [], error: null }) as Promise<{ data: unknown; error: unknown }> & {
      eq: typeof mockSelectEq;
      in: typeof mockSelectIn;
    };
    result.eq = mockSelectEq;
    result.in = mockSelectIn;
    return result;
  });

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
  const mockGetActiveFestivalId = vi.fn().mockResolvedValue('wacken-2026');

  return {
    mockFrom,
    mockUpsert,
    mockDelete,
    mockDeleteEq1,
    mockDeleteEq2,
    mockDeleteEqFinal,
    mockSelect,
    mockSelectEq,
    mockSelectIn,
    mockSaveUserPick,
    mockRemoveUserPick,
    mockReplaceUserPicks,
    mockEnqueueOfflinePick,
    mockLoadOfflineQueue,
    mockRemoveFromOfflineQueue,
    mockGetActiveFestivalId,
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
  getActiveFestivalId: mocks.mockGetActiveFestivalId,
}));

vi.mock('../repositories/users', () => ({
  usersRepository: {
    ensureCrewUsers: vi.fn().mockResolvedValue(undefined),
  },
}));

import { countPicks } from '../hooks/usePickCounts';
import { picksRepository } from '../repositories/picks';
import { usersRepository } from '../repositories/users';
import type { OfflinePickOp } from '../lib/db';
import type { UserPick } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOp(
  userId: string,
  bandId: string,
  action: 'add' | 'remove',
  createdAt: string,
  id?: string,
  festivalId: string = TEST_FESTIVAL_ID,
): OfflinePickOp {
  return {
    id: id ?? `${userId}:${bandId}:${createdAt}`,
    user_id: userId,
    band_id: bandId,
    festival_id: festivalId,
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
  mocks.mockDeleteEq2.mockReturnValue({ eq: mocks.mockDeleteEqFinal });
  mocks.mockDeleteEq1.mockReturnValue({ eq: mocks.mockDeleteEq2 });
  mocks.mockDelete.mockReturnValue({ eq: mocks.mockDeleteEq1 });
  mocks.mockSelectIn.mockResolvedValue({ data: [], error: null });
  mocks.mockSelectEq.mockImplementation(function selectEq() {
    const result = Promise.resolve({ data: [], error: null }) as Promise<{ data: unknown; error: unknown }> & {
      eq: typeof mocks.mockSelectEq;
      in: typeof mocks.mockSelectIn;
    };
    result.eq = mocks.mockSelectEq;
    result.in = mocks.mockSelectIn;
    return result;
  });
  mocks.mockSelect.mockImplementation(() => {
    const result = Promise.resolve({ data: [], error: null }) as Promise<{ data: unknown; error: unknown }> & {
      eq: typeof mocks.mockSelectEq;
      in: typeof mocks.mockSelectIn;
    };
    result.eq = mocks.mockSelectEq;
    result.in = mocks.mockSelectIn;
    return result;
  });
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
  mocks.mockGetActiveFestivalId.mockResolvedValue(TEST_FESTIVAL_ID);

  // Start each test in online state
  setOnline(true);
});

// ---------------------------------------------------------------------------
// picksRepository.toggle()
// ---------------------------------------------------------------------------

describe('picksRepository.toggle()', () => {
  describe('online — adding a pick (currentlyPicked = false)', () => {
    it('calls IDB saveUserPick with festival_id from active festival', async () => {
      await picksRepository.toggle('user1', 'band1', false);

      expect(mocks.mockSaveUserPick).toHaveBeenCalledOnce();
      const arg = mocks.mockSaveUserPick.mock.calls[0][0];
      expect(arg).toMatchObject({
        user_id: 'user1',
        band_id: 'band1',
        festival_id: TEST_FESTIVAL_ID,
      });
      expect(typeof arg.created_at).toBe('string');
    });

    it('calls Supabase upsert with the same pick object', async () => {
      await picksRepository.toggle('user1', 'band1', false);

      expect(mocks.mockFrom).toHaveBeenCalledWith('user_picks');
      expect(mocks.mockUpsert).toHaveBeenCalledOnce();
      const upsertArg = mocks.mockUpsert.mock.calls[0][0];
      expect(upsertArg).toMatchObject({
        user_id: 'user1',
        band_id: 'band1',
        festival_id: TEST_FESTIVAL_ID,
      });
    });

    it('does not enqueue an offline pick when Supabase succeeds', async () => {
      await picksRepository.toggle('user1', 'band1', false);

      expect(mocks.mockEnqueueOfflinePick).not.toHaveBeenCalled();
    });

    it('throws when no active festival is set', async () => {
      mocks.mockGetActiveFestivalId.mockResolvedValue(null);

      await expect(picksRepository.toggle('user1', 'band1', false)).rejects.toThrow(
        'ACTIVE_FESTIVAL_REQUIRED',
      );
      expect(mocks.mockSaveUserPick).not.toHaveBeenCalled();
    });
  });

  describe('online — removing a pick (currentlyPicked = true)', () => {
    it('calls IDB removeUserPick with userId and bandId', async () => {
      await picksRepository.toggle('user1', 'band1', true);

      expect(mocks.mockRemoveUserPick).toHaveBeenCalledOnce();
      expect(mocks.mockRemoveUserPick).toHaveBeenCalledWith('user1', 'band1');
    });

    it('calls Supabase delete with eq filters for user_id, band_id, and festival_id', async () => {
      await picksRepository.toggle('user1', 'band1', true);

      expect(mocks.mockFrom).toHaveBeenCalledWith('user_picks');
      expect(mocks.mockDelete).toHaveBeenCalledOnce();
      expect(mocks.mockDeleteEq1).toHaveBeenCalledWith('user_id', 'user1');
      expect(mocks.mockDeleteEq2).toHaveBeenCalledWith('band_id', 'band1');
      expect(mocks.mockDeleteEqFinal).toHaveBeenCalledWith('festival_id', TEST_FESTIVAL_ID);
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
        festival_id: TEST_FESTIVAL_ID,
      });
    });

    it('enqueues an offline pick with action "add" and festival_id', async () => {
      await picksRepository.toggle('user1', 'band1', false);

      expect(mocks.mockEnqueueOfflinePick).toHaveBeenCalledOnce();
      const queued = mocks.mockEnqueueOfflinePick.mock.calls[0][0];
      expect(queued).toMatchObject({
        user_id: 'user1',
        band_id: 'band1',
        action: 'add',
        festival_id: TEST_FESTIVAL_ID,
      });
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

    it('enqueues an offline pick with action "remove" and festival_id', async () => {
      await picksRepository.toggle('user1', 'band1', true);

      expect(mocks.mockEnqueueOfflinePick).toHaveBeenCalledOnce();
      const queued = mocks.mockEnqueueOfflinePick.mock.calls[0][0];
      expect(queued).toMatchObject({
        user_id: 'user1',
        band_id: 'band1',
        action: 'remove',
        festival_id: TEST_FESTIVAL_ID,
      });
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
      expect(queued).toMatchObject({
        user_id: 'user1',
        band_id: 'band1',
        action: 'add',
        festival_id: TEST_FESTIVAL_ID,
      });
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
      expect(queued).toMatchObject({
        user_id: 'user1',
        band_id: 'band1',
        action: 'remove',
        festival_id: TEST_FESTIVAL_ID,
      });
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

  it('returns 0 when no active festival is set', async () => {
    mocks.mockGetActiveFestivalId.mockResolvedValue(null);
    mocks.mockLoadOfflineQueue.mockResolvedValue([
      makeOp('user1', 'band1', 'add', '2026-07-29T10:00:00Z', 'op-1'),
    ]);

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
      festival_id: TEST_FESTIVAL_ID,
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
    expect(mocks.mockDeleteEq2).toHaveBeenCalledWith('band_id', 'band1');
    expect(mocks.mockDeleteEqFinal).toHaveBeenCalledWith('festival_id', TEST_FESTIVAL_ID);
    expect(mocks.mockRemoveFromOfflineQueue).toHaveBeenCalledWith('op-2');
    expect(result).toBe(1);
  });

  it('skips ops whose festival_id does not match the active festival', async () => {
    const matching = makeOp('user1', 'band1', 'add', '2026-07-29T10:00:00Z', 'op-match');
    const other = makeOp(
      'user1',
      'band2',
      'add',
      '2026-07-29T10:00:00Z',
      'op-other',
      'other-fest',
    );
    mocks.mockLoadOfflineQueue.mockResolvedValue([matching, other]);

    const result = await picksRepository.flushOfflineQueue();

    expect(mocks.mockUpsert).toHaveBeenCalledOnce();
    expect(mocks.mockUpsert.mock.calls[0][0]).toMatchObject({ band_id: 'band1' });
    expect(mocks.mockRemoveFromOfflineQueue).toHaveBeenCalledWith('op-match');
    expect(mocks.mockRemoveFromOfflineQueue).not.toHaveBeenCalledWith('op-other');
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
  function mockMembershipScopedSync(options: {
    memberIds: string[];
    pickRows?: unknown[] | null;
    pickError?: unknown;
    membershipError?: unknown;
  }) {
    const membershipEq = vi.fn().mockResolvedValue({
      data: options.memberIds.map((user_id) => ({ user_id })),
      error: options.membershipError ?? null,
    });
    const membershipSelect = vi.fn().mockReturnValue({ eq: membershipEq });

    const pickIn = vi.fn().mockResolvedValue({
      data: options.pickRows === undefined ? [] : options.pickRows,
      error: options.pickError ?? null,
    });
    const pickEq = vi.fn().mockReturnValue({ in: pickIn });
    const pickSelect = vi.fn().mockReturnValue({ eq: pickEq, in: pickIn });

    mocks.mockFrom.mockImplementation(((table: string) => {
      if (table === 'festival_memberships') {
        return { select: membershipSelect };
      }
      return {
        upsert: mocks.mockUpsert,
        delete: mocks.mockDelete,
        select: pickSelect,
      };
    }) as typeof mocks.mockFrom);

    return { membershipEq, membershipSelect, pickEq, pickIn, pickSelect };
  }

  it('queries Supabase for all user_picks rows when unscoped', async () => {
    await picksRepository.syncCrewFromRemote();

    expect(mocks.mockFrom).toHaveBeenCalledWith('user_picks');
    expect(mocks.mockSelect).toHaveBeenCalledWith('*');
    expect(mocks.mockSelectEq).not.toHaveBeenCalled();
    expect(mocks.mockFrom).not.toHaveBeenCalledWith('festival_memberships');
  });

  it('membership-gates picks by festival_id when provided', async () => {
    const { membershipEq, pickEq, pickIn } = mockMembershipScopedSync({
      memberIds: ['user1', 'user2'],
    });

    await picksRepository.syncCrewFromRemote(TEST_FESTIVAL_ID);

    expect(mocks.mockFrom).toHaveBeenCalledWith('festival_memberships');
    expect(membershipEq).toHaveBeenCalledWith('festival_id', TEST_FESTIVAL_ID);
    expect(pickEq).toHaveBeenCalledWith('festival_id', TEST_FESTIVAL_ID);
    expect(pickIn).toHaveBeenCalledWith('user_id', ['user1', 'user2']);
  });

  it('excludes leaver picks from replaceUserPicks (membership filter)', async () => {
    const memberPick = {
      user_id: 'user1',
      band_id: 'band1',
      festival_id: TEST_FESTIVAL_ID,
      created_at: '2026-07-29T10:00:00Z',
    };
    // Server still has leaver pick rows; membership query only returns user1.
    mockMembershipScopedSync({
      memberIds: ['user1'],
      pickRows: [memberPick],
    });

    await picksRepository.syncCrewFromRemote(TEST_FESTIVAL_ID);

    expect(mocks.mockReplaceUserPicks).toHaveBeenCalledOnce();
    expect(mocks.mockReplaceUserPicks).toHaveBeenCalledWith([memberPick]);
    // Leaver user2 never appears in the IDB replace payload → Popular counts exclude them.
    const replaced = mocks.mockReplaceUserPicks.mock.calls[0][0] as UserPick[];
    expect(replaced.every((p) => p.user_id === 'user1')).toBe(true);
    expect(countPicks(replaced)).toEqual({ band1: 1 });
    expect(usersRepository.ensureCrewUsers).toHaveBeenCalledWith(['user1']);
  });

  it('clears IDB picks when festival has no memberships', async () => {
    mockMembershipScopedSync({ memberIds: [] });

    await picksRepository.syncCrewFromRemote(TEST_FESTIVAL_ID);

    expect(mocks.mockReplaceUserPicks).toHaveBeenCalledWith([]);
  });

  it('calls replaceUserPicks with all fetched rows when unscoped', async () => {
    const rows = [
      { user_id: 'user1', band_id: 'band1', festival_id: TEST_FESTIVAL_ID, created_at: '2026-07-29T10:00:00Z' },
      { user_id: 'user2', band_id: 'band2', festival_id: TEST_FESTIVAL_ID, created_at: '2026-07-29T11:00:00Z' },
    ];
    mocks.mockSelect.mockImplementation(() => {
      const result = Promise.resolve({ data: rows, error: null }) as Promise<{ data: unknown; error: unknown }> & {
        eq: typeof mocks.mockSelectEq;
        in: typeof mocks.mockSelectIn;
      };
      result.eq = mocks.mockSelectEq;
      result.in = mocks.mockSelectIn;
      return result;
    });

    await picksRepository.syncCrewFromRemote();

    expect(mocks.mockReplaceUserPicks).toHaveBeenCalledOnce();
    expect(mocks.mockReplaceUserPicks).toHaveBeenCalledWith(rows);
  });

  it('does nothing if Supabase returns an error', async () => {
    mocks.mockSelect.mockImplementation(() => {
      const result = Promise.resolve({ data: null, error: new Error('forbidden') }) as Promise<{
        data: unknown;
        error: unknown;
      }> & { eq: typeof mocks.mockSelectEq; in: typeof mocks.mockSelectIn };
      result.eq = mocks.mockSelectEq;
      result.in = mocks.mockSelectIn;
      return result;
    });

    await expect(picksRepository.syncCrewFromRemote()).resolves.toBeUndefined();
    expect(mocks.mockReplaceUserPicks).not.toHaveBeenCalled();
  });

  it('does nothing if Supabase returns null data without an error', async () => {
    mocks.mockSelect.mockImplementation(() => {
      const result = Promise.resolve({ data: null, error: null }) as Promise<{ data: unknown; error: unknown }> & {
        eq: typeof mocks.mockSelectEq;
        in: typeof mocks.mockSelectIn;
      };
      result.eq = mocks.mockSelectEq;
      result.in = mocks.mockSelectIn;
      return result;
    });

    await picksRepository.syncCrewFromRemote();

    expect(mocks.mockReplaceUserPicks).not.toHaveBeenCalled();
  });
});
