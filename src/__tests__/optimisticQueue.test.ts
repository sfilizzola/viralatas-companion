import { describe, it, expect } from 'vitest';
import {
  buildFlushBatches,
  keepLastSyncTargets,
} from '../lib/optimisticQueue';
import type { OfflinePickOp } from '../lib/db';

function makePickOp(
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

const pickDedup = {
  strategy: 'keepLast' as const,
  groupKey: (op: OfflinePickOp) => `${op.user_id}:${op.band_id}`,
  sortKey: (op: OfflinePickOp) => op.created_at,
};

describe('buildFlushBatches — keepLast (picks)', () => {
  it('returns empty array for empty input', () => {
    expect(buildFlushBatches([], (op) => op.id, pickDedup)).toEqual([]);
  });

  it('passes through a single op unchanged', () => {
    const op = makePickOp('user1', 'band1', 'add', '2026-07-29T10:00:00Z');
    const batches = buildFlushBatches([op], (item) => item.id, pickDedup);
    expect(batches).toHaveLength(1);
    expect(batches[0].syncTarget).toEqual(op);
    expect(batches[0].allIds).toEqual([op.id]);
  });

  it('keeps only the last chronological op for same (user_id, band_id)', () => {
    const older = makePickOp('user1', 'band1', 'add', '2026-07-29T09:00:00Z', 'old');
    const newer = makePickOp('user1', 'band1', 'remove', '2026-07-29T10:00:00Z', 'new');
    const batches = buildFlushBatches([older, newer], (op) => op.id, pickDedup);
    expect(batches).toHaveLength(1);
    expect(batches[0].syncTarget.action).toBe('remove');
    expect(batches[0].allIds).toEqual(['old', 'new']);
  });

  it('supersedes earlier ops regardless of input order', () => {
    const newer = makePickOp('user1', 'band1', 'remove', '2026-07-29T10:00:00Z');
    const older = makePickOp('user1', 'band1', 'add', '2026-07-29T09:00:00Z');
    const targets = keepLastSyncTargets(
      [newer, older],
      (op) => op.id,
      pickDedup.groupKey,
      pickDedup.sortKey,
    );
    expect(targets).toHaveLength(1);
    expect(targets[0].action).toBe('remove');
  });

  it('retains ops for different bands (no cross-band dedup)', () => {
    const op1 = makePickOp('user1', 'band1', 'add', '2026-07-29T10:00:00Z');
    const op2 = makePickOp('user1', 'band2', 'add', '2026-07-29T10:00:00Z');
    const op3 = makePickOp('user1', 'band3', 'remove', '2026-07-29T10:00:00Z');
    const targets = keepLastSyncTargets([op1, op2, op3], (op) => op.id, pickDedup.groupKey, pickDedup.sortKey);
    expect(targets).toHaveLength(3);
  });
});

describe('buildFlushBatches — keepLast (presence)', () => {
  type PresenceOp = { id: string; user_id: string; updated_at: string };

  const presenceDedup = {
    strategy: 'keepLast' as const,
    groupKey: (op: PresenceOp) => op.user_id,
    sortKey: (op: PresenceOp) => op.updated_at,
  };

  it('deduplicates by user_id keeping latest updated_at', () => {
    const older: PresenceOp = { id: 'a', user_id: 'u1', updated_at: '2026-07-29T09:00:00Z' };
    const newer: PresenceOp = { id: 'b', user_id: 'u1', updated_at: '2026-07-29T10:00:00Z' };
    const batches = buildFlushBatches([older, newer], (op) => op.id, presenceDedup);
    expect(batches).toHaveLength(1);
    expect(batches[0].syncTarget.id).toBe('b');
    expect(batches[0].allIds).toEqual(['a', 'b']);
  });
});

describe('buildFlushBatches — byId (missed)', () => {
  type MissedOp = { id: string; action: 'add' | 'remove' };

  it('syncs one batch per unique id', () => {
    const op1: MissedOp = { id: 'u1|b1', action: 'add' };
    const op2: MissedOp = { id: 'u1|b2', action: 'remove' };
    const batches = buildFlushBatches([op1, op2], (op) => op.id, { strategy: 'byId' });
    expect(batches).toHaveLength(2);
  });

  it('last entry wins when duplicate ids appear in loaded queue', () => {
    const add: MissedOp = { id: 'u1|b1', action: 'add' };
    const remove: MissedOp = { id: 'u1|b1', action: 'remove' };
    const batches = buildFlushBatches([add, remove], (op) => op.id, { strategy: 'byId' });
    expect(batches).toHaveLength(1);
    expect(batches[0].syncTarget.action).toBe('remove');
  });
});

describe('buildFlushBatches — fifo (announcements, duck)', () => {
  type FifoItem = { id: string; seq: number };

  it('preserves one batch per item in load order', () => {
    const items: FifoItem[] = [
      { id: 'a', seq: 1 },
      { id: 'b', seq: 2 },
      { id: 'c', seq: 3 },
    ];
    const batches = buildFlushBatches(items, (item) => item.id, { strategy: 'fifo' });
    expect(batches).toHaveLength(3);
    expect(batches.map((b) => b.syncTarget.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by optional sortKey before flushing', () => {
    const items: FifoItem[] = [
      { id: 'b', seq: 2 },
      { id: 'a', seq: 1 },
    ];
    const batches = buildFlushBatches(items, (item) => item.id, {
      strategy: 'fifo',
      sortKey: (item) => String(item.seq),
    });
    expect(batches.map((b) => b.syncTarget.id)).toEqual(['a', 'b']);
  });
});

describe('createOptimisticQueue flush', () => {
  it('returns flushed count and removes successful batches', async () => {
    const { createOptimisticQueue } = await import('../lib/optimisticQueue');
    const store = new Map<string, { id: string; value: number }>();
    store.set('1', { id: '1', value: 1 });
    store.set('2', { id: '2', value: 2 });

    const queue = createOptimisticQueue(
      {
        load: async () => Array.from(store.values()),
        remove: async (id) => {
          store.delete(id);
        },
      },
      {
        getId: (item) => item.id,
        dedup: { strategy: 'fifo' },
        syncOne: async (item) => ({ error: item.value === 2 ? new Error('fail') : null }),
      },
    );

    const flushed = await queue.flush();
    expect(flushed).toBe(1);
    expect(store.has('1')).toBe(false);
    expect(store.has('2')).toBe(true);
  });
});
