import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  saveMissedBand: vi.fn(),
  removeMissedBand: vi.fn(),
  loadAllMissedBands: vi.fn(),
  replaceUserMissedBands: vi.fn().mockResolvedValue(undefined),
  enqueueOfflineMissed: vi.fn(),
  loadOfflineMissedQueue: vi.fn(),
  removeFromOfflineMissedQueue: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { missedRepository } from '../repositories/missed';
import { saveMissedBand, removeMissedBand, enqueueOfflineMissed } from '../lib/db';
import { supabase } from '../lib/supabase';

const USER_ID = 'user-1';
const BAND_ID = 'band-a';

describe('missedRepository.mark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveMissedBand).mockResolvedValue(undefined);
    vi.mocked(enqueueOfflineMissed).mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('writes to IDB and calls Supabase upsert when online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ upsert } as ReturnType<typeof supabase.from>);

    await missedRepository.mark(USER_ID, BAND_ID);

    expect(saveMissedBand).toHaveBeenCalledOnce();
    expect(saveMissedBand).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, band_id: BAND_ID }),
    );
    expect(supabase.from).toHaveBeenCalledWith('user_missed_bands');
    expect(upsert).toHaveBeenCalledOnce();
    expect(enqueueOfflineMissed).not.toHaveBeenCalled();
  });

  it('writes to IDB and enqueues when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    await missedRepository.mark(USER_ID, BAND_ID);

    expect(saveMissedBand).toHaveBeenCalledOnce();
    expect(saveMissedBand).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, band_id: BAND_ID }),
    );
    expect(enqueueOfflineMissed).toHaveBeenCalledOnce();
    expect(enqueueOfflineMissed).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, band_id: BAND_ID, action: 'add' }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('missedRepository.unmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(removeMissedBand).mockResolvedValue(undefined);
    vi.mocked(enqueueOfflineMissed).mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('removes from IDB and calls Supabase delete when online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const mockEq2 = vi.fn().mockResolvedValue({ error: null });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
    vi.mocked(supabase.from).mockReturnValue({ delete: mockDelete } as ReturnType<typeof supabase.from>);

    await missedRepository.unmark(USER_ID, BAND_ID);

    expect(removeMissedBand).toHaveBeenCalledWith(USER_ID, BAND_ID);
    expect(supabase.from).toHaveBeenCalledWith('user_missed_bands');
    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockEq1).toHaveBeenCalledWith('user_id', USER_ID);
    expect(mockEq2).toHaveBeenCalledWith('band_id', BAND_ID);
    expect(enqueueOfflineMissed).not.toHaveBeenCalled();
  });

  it('removes from IDB and enqueues when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    await missedRepository.unmark(USER_ID, BAND_ID);

    expect(removeMissedBand).toHaveBeenCalledWith(USER_ID, BAND_ID);
    expect(enqueueOfflineMissed).toHaveBeenCalledOnce();
    expect(enqueueOfflineMissed).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, band_id: BAND_ID, action: 'remove' }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('missedRepository.syncFromRemote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scopes missed rows to bands of the given festival', async () => {
    const { replaceUserMissedBands } = await import('../lib/db');
    vi.mocked(replaceUserMissedBands).mockResolvedValue(undefined);

    const bandsEq = vi.fn().mockResolvedValue({ data: [{ id: 'band-a' }, { id: 'band-b' }], error: null });
    const bandsSelect = vi.fn().mockReturnValue({ eq: bandsEq });
    const missedIn = vi.fn().mockResolvedValue({
      data: [{ user_id: USER_ID, band_id: 'band-a', marked_at: '2026-07-29T10:00:00Z' }],
      error: null,
    });
    const missedEq = vi.fn().mockReturnValue({ in: missedIn });
    const missedSelect = vi.fn().mockReturnValue({ eq: missedEq });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'bands') return { select: bandsSelect } as ReturnType<typeof supabase.from>;
      return { select: missedSelect } as ReturnType<typeof supabase.from>;
    });

    await missedRepository.syncFromRemote(USER_ID, 'fest-1');

    expect(supabase.from).toHaveBeenCalledWith('bands');
    expect(bandsEq).toHaveBeenCalledWith('festival_id', 'fest-1');
    expect(missedIn).toHaveBeenCalledWith('band_id', ['band-a', 'band-b']);
    expect(replaceUserMissedBands).toHaveBeenCalledWith(
      [{ user_id: USER_ID, band_id: 'band-a', marked_at: '2026-07-29T10:00:00Z' }],
      USER_ID,
    );
  });
});
