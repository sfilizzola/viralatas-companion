import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  saveBandRating: vi.fn(),
  removeBandRating: vi.fn(),
  loadAllBandRatings: vi.fn(),
  loadBandRatings: vi.fn(),
  replaceAllBandRatings: vi.fn(),
  enqueueOfflineBandRating: vi.fn(),
  loadOfflineBandRatingsQueue: vi.fn(),
  removeFromOfflineBandRatingsQueue: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { ratingsRepository } from '../repositories/ratings';
import { saveBandRating, removeBandRating, loadBandRatings, enqueueOfflineBandRating } from '../lib/db';
import { supabase } from '../lib/supabase';

const USER_ID = 'user-1';
const BAND_ID = 'band-a';
const SCORE = 4 as const;

describe('ratingsRepository.setRating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveBandRating).mockResolvedValue(undefined);
    vi.mocked(enqueueOfflineBandRating).mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('writes to IDB and calls Supabase upsert when online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ upsert } as ReturnType<typeof supabase.from>);

    await ratingsRepository.setRating(USER_ID, BAND_ID, SCORE);

    expect(saveBandRating).toHaveBeenCalledOnce();
    expect(saveBandRating).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, band_id: BAND_ID, score: SCORE }),
    );
    expect(supabase.from).toHaveBeenCalledWith('user_band_ratings');
    expect(upsert).toHaveBeenCalledOnce();
    expect(enqueueOfflineBandRating).not.toHaveBeenCalled();
  });

  it('writes to IDB and enqueues when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    await ratingsRepository.setRating(USER_ID, BAND_ID, SCORE);

    expect(saveBandRating).toHaveBeenCalledOnce();
    expect(saveBandRating).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, band_id: BAND_ID, score: SCORE }),
    );
    expect(enqueueOfflineBandRating).toHaveBeenCalledOnce();
    expect(enqueueOfflineBandRating).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, band_id: BAND_ID, action: 'upsert', score: SCORE }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('ratingsRepository.clearRating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(removeBandRating).mockResolvedValue(undefined);
    vi.mocked(enqueueOfflineBandRating).mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('removes from IDB and calls Supabase delete when online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const mockEq2 = vi.fn().mockResolvedValue({ error: null });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
    vi.mocked(supabase.from).mockReturnValue({ delete: mockDelete } as ReturnType<typeof supabase.from>);

    await ratingsRepository.clearRating(USER_ID, BAND_ID);

    expect(removeBandRating).toHaveBeenCalledWith(USER_ID, BAND_ID);
    expect(supabase.from).toHaveBeenCalledWith('user_band_ratings');
    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockEq1).toHaveBeenCalledWith('user_id', USER_ID);
    expect(mockEq2).toHaveBeenCalledWith('band_id', BAND_ID);
    expect(enqueueOfflineBandRating).not.toHaveBeenCalled();
  });

  it('removes from IDB and enqueues when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    await ratingsRepository.clearRating(USER_ID, BAND_ID);

    expect(removeBandRating).toHaveBeenCalledWith(USER_ID, BAND_ID);
    expect(enqueueOfflineBandRating).toHaveBeenCalledOnce();
    expect(enqueueOfflineBandRating).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, band_id: BAND_ID, action: 'remove' }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('ratingsRepository.toggleRating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveBandRating).mockResolvedValue(undefined);
    vi.mocked(removeBandRating).mockResolvedValue(undefined);
    vi.mocked(loadBandRatings).mockResolvedValue([]);
    vi.mocked(enqueueOfflineBandRating).mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ upsert } as ReturnType<typeof supabase.from>);
  });

  it('sets rating when no existing score', async () => {
    vi.mocked(loadBandRatings).mockResolvedValue([]);

    await ratingsRepository.toggleRating(USER_ID, BAND_ID, SCORE);

    expect(saveBandRating).toHaveBeenCalledOnce();
    expect(removeBandRating).not.toHaveBeenCalled();
  });

  it('sets rating when existing score differs', async () => {
    vi.mocked(loadBandRatings).mockResolvedValue([
      { user_id: USER_ID, band_id: BAND_ID, score: 2, rated_at: '2026-01-01T00:00:00.000Z' },
    ]);

    await ratingsRepository.toggleRating(USER_ID, BAND_ID, SCORE);

    expect(saveBandRating).toHaveBeenCalledOnce();
    expect(saveBandRating).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, band_id: BAND_ID, score: SCORE }),
    );
    expect(removeBandRating).not.toHaveBeenCalled();
  });

  it('clears rating when same score tapped', async () => {
    vi.mocked(loadBandRatings).mockResolvedValue([
      { user_id: USER_ID, band_id: BAND_ID, score: SCORE, rated_at: '2026-01-01T00:00:00.000Z' },
    ]);
    const mockEq2 = vi.fn().mockResolvedValue({ error: null });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
    vi.mocked(supabase.from).mockReturnValue({ delete: mockDelete } as ReturnType<typeof supabase.from>);

    await ratingsRepository.toggleRating(USER_ID, BAND_ID, SCORE);

    expect(removeBandRating).toHaveBeenCalledWith(USER_ID, BAND_ID);
    expect(saveBandRating).not.toHaveBeenCalled();
  });
});
