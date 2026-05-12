import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('../lib/db', () => ({
  saveUserPick: vi.fn(),
  removeUserPick: vi.fn(),
  replaceUserPicks: vi.fn(),
  enqueueOfflinePick: vi.fn(),
  loadOfflineQueue: vi.fn(),
  removeFromOfflineQueue: vi.fn(),
}));

import { deduplicatePickQueue } from '../repositories/picks';
import type { OfflinePickOp } from '../lib/db';

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

describe('deduplicatePickQueue', () => {
  it('returns empty array for empty input', () => {
    expect(deduplicatePickQueue([])).toEqual([]);
  });

  it('passes through a single op unchanged', () => {
    const op = makeOp('user1', 'band1', 'add', '2026-07-29T10:00:00Z');
    const result = deduplicatePickQueue([op]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(op);
  });

  it('keeps only the last chronological op for same (user_id, band_id)', () => {
    const older = makeOp('user1', 'band1', 'add', '2026-07-29T09:00:00Z');
    const newer = makeOp('user1', 'band1', 'remove', '2026-07-29T10:00:00Z');
    const result = deduplicatePickQueue([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('remove');
    expect(result[0].created_at).toBe('2026-07-29T10:00:00Z');
  });

  it('supersedes earlier ops regardless of input order', () => {
    const newer = makeOp('user1', 'band1', 'remove', '2026-07-29T10:00:00Z');
    const older = makeOp('user1', 'band1', 'add', '2026-07-29T09:00:00Z');
    // newer provided first to confirm sorting is applied
    const result = deduplicatePickQueue([newer, older]);
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('remove');
  });

  it('retains ops for different bands (no cross-band dedup)', () => {
    const op1 = makeOp('user1', 'band1', 'add', '2026-07-29T10:00:00Z');
    const op2 = makeOp('user1', 'band2', 'add', '2026-07-29T10:00:00Z');
    const op3 = makeOp('user1', 'band3', 'remove', '2026-07-29T10:00:00Z');
    const result = deduplicatePickQueue([op1, op2, op3]);
    expect(result).toHaveLength(3);
  });

  it('retains ops for different users on same band', () => {
    const op1 = makeOp('user1', 'band1', 'add', '2026-07-29T10:00:00Z');
    const op2 = makeOp('user2', 'band1', 'add', '2026-07-29T10:00:00Z');
    const result = deduplicatePickQueue([op1, op2]);
    expect(result).toHaveLength(2);
    const userIds = result.map((op) => op.user_id).sort();
    expect(userIds).toEqual(['user1', 'user2']);
  });

  it('handles mixed: some duplicates, some unique', () => {
    const dupOlder = makeOp('user1', 'band1', 'add', '2026-07-29T09:00:00Z', 'dup-old');
    const dupNewer = makeOp('user1', 'band1', 'remove', '2026-07-29T11:00:00Z', 'dup-new');
    const unique1 = makeOp('user2', 'band1', 'add', '2026-07-29T10:00:00Z', 'u1');
    const unique2 = makeOp('user1', 'band2', 'add', '2026-07-29T10:00:00Z', 'u2');

    const result = deduplicatePickQueue([dupOlder, dupNewer, unique1, unique2]);

    expect(result).toHaveLength(3);

    const band1User1 = result.find((op) => op.user_id === 'user1' && op.band_id === 'band1');
    expect(band1User1?.action).toBe('remove');
    expect(band1User1?.created_at).toBe('2026-07-29T11:00:00Z');

    const band1User2 = result.find((op) => op.user_id === 'user2' && op.band_id === 'band1');
    expect(band1User2).toBeDefined();

    const band2User1 = result.find((op) => op.user_id === 'user1' && op.band_id === 'band2');
    expect(band2User1).toBeDefined();
  });

  it('deduplicates three or more ops for same key, keeping only the latest', () => {
    const first = makeOp('user1', 'band1', 'add', '2026-07-29T08:00:00Z', 'op1');
    const second = makeOp('user1', 'band1', 'remove', '2026-07-29T09:00:00Z', 'op2');
    const third = makeOp('user1', 'band1', 'add', '2026-07-29T10:00:00Z', 'op3');
    const result = deduplicatePickQueue([first, second, third]);
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('add');
    expect(result[0].id).toBe('op3');
  });
});
