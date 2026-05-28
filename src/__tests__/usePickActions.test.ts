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
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

const recordCommittedSkip = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../services/weakSkips', () => ({
  recordCommittedSkip,
}));

import { resetDbConnectionForTests, saveUserPick } from '../lib/db';
import { usePickActions } from '../hooks/usePickActions';

const userId = 'user-test';
const bandId = 'band-test';

beforeEach(async () => {
  await resetDbConnectionForTests();
  await deleteViralatasDatabase();
  recordCommittedSkip.mockClear();
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
});

describe('usePickActions', () => {
  it('loads pickedIds from IDB on mount', async () => {
    await saveUserPick({ user_id: userId, band_id: bandId, created_at: new Date().toISOString() });
    const { result } = renderHook(() => usePickActions(userId));
    await waitFor(() => expect(result.current.pickedIds.has(bandId)).toBe(true));
  });

  it('picksReady is false until IDB hydrate, then true', async () => {
    await saveUserPick({ user_id: userId, band_id: bandId, created_at: new Date().toISOString() });
    const { result } = renderHook(() => usePickActions(userId));
    expect(result.current.picksReady).toBe(false);
    await waitFor(() => expect(result.current.picksReady).toBe(true));
  });

  it('togglePick removes a picked band', async () => {
    await saveUserPick({ user_id: userId, band_id: bandId, created_at: new Date().toISOString() });
    const { result } = renderHook(() => usePickActions(userId));
    await waitFor(() => expect(result.current.pickedIds.has(bandId)).toBe(true));

    await result.current.togglePick(bandId);
    await waitFor(() => expect(result.current.pickedIds.has(bandId)).toBe(false));
  });

  it('pickBand adds an unpicked band', async () => {
    const { result } = renderHook(() => usePickActions(userId));
    await waitFor(() => expect(result.current.pickedIds.size).toBe(0));

    await result.current.pickBand(bandId);
    await waitFor(() => expect(result.current.pickedIds.has(bandId)).toBe(true));
  });

  it('unpickBand removes a picked band', async () => {
    await saveUserPick({ user_id: userId, band_id: bandId, created_at: new Date().toISOString() });
    const { result } = renderHook(() => usePickActions(userId));
    await waitFor(() => expect(result.current.pickedIds.has(bandId)).toBe(true));

    await result.current.unpickBand(bandId);
    await waitFor(() => expect(result.current.pickedIds.has(bandId)).toBe(false));
  });

  it('does not record weak skips when toggling picks off a card', async () => {
    await saveUserPick({ user_id: userId, band_id: bandId, created_at: new Date().toISOString() });
    const { result } = renderHook(() => usePickActions(userId));
    await waitFor(() => expect(result.current.pickedIds.has(bandId)).toBe(true));

    await result.current.togglePick(bandId);
    await waitFor(() => expect(result.current.pickedIds.has(bandId)).toBe(false));

    expect(recordCommittedSkip).not.toHaveBeenCalled();
  });
});
