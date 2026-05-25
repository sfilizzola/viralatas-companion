import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
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
    },
  };
});

import { resetDbConnectionForTests, saveMissedBand } from '../lib/db';
import { useMissedBands } from '../hooks/useMissedBands';

const userId = 'user-test';
const bandId = 'band-test';
const otherUserId = 'user-other';

beforeEach(async () => {
  await resetDbConnectionForTests();
  await deleteViralatasDatabase();
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
});

describe('useMissedBands', () => {
  it('loads allMissed from IDB on mount', async () => {
    await saveMissedBand({
      user_id: userId,
      band_id: bandId,
      marked_at: new Date().toISOString(),
    });
    const { result } = renderHook(() => useMissedBands(userId));
    await waitFor(() => expect(result.current.allMissed).toHaveLength(1));
    expect(result.current.missedBandIds.has(bandId)).toBe(true);
  });

  it('derives missedBandIds for the current user only', async () => {
    await saveMissedBand({
      user_id: userId,
      band_id: bandId,
      marked_at: new Date().toISOString(),
    });
    await saveMissedBand({
      user_id: otherUserId,
      band_id: 'band-other',
      marked_at: new Date().toISOString(),
    });
    const { result } = renderHook(() => useMissedBands(userId));
    await waitFor(() => expect(result.current.allMissed).toHaveLength(2));
    expect(result.current.missedBandIds).toEqual(new Set([bandId]));
    expect(result.current.missedCountsByBand[bandId]).toBe(1);
    expect(result.current.missedCountsByBand['band-other']).toBe(1);
  });

  it('mark adds a missed band for the user', async () => {
    const { result } = renderHook(() => useMissedBands(userId));
    await waitFor(() => expect(result.current.allMissed).toEqual([]));

    await result.current.mark(bandId);
    await waitFor(() => expect(result.current.missedBandIds.has(bandId)).toBe(true));
  });

  it('unmark removes a missed band for the user', async () => {
    await saveMissedBand({
      user_id: userId,
      band_id: bandId,
      marked_at: new Date().toISOString(),
    });
    const { result } = renderHook(() => useMissedBands(userId));
    await waitFor(() => expect(result.current.missedBandIds.has(bandId)).toBe(true));

    await result.current.unmark(bandId);
    await waitFor(() => expect(result.current.missedBandIds.has(bandId)).toBe(false));
  });

  it('toggleMissed marks and unmarks', async () => {
    const { result } = renderHook(() => useMissedBands(userId));
    await waitFor(() => expect(result.current.allMissed).toEqual([]));

    await result.current.toggleMissed(bandId);
    await waitFor(() => expect(result.current.missedBandIds.has(bandId)).toBe(true));

    await result.current.toggleMissed(bandId);
    await waitFor(() => expect(result.current.missedBandIds.has(bandId)).toBe(false));
  });
});
