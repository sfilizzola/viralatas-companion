import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../repositories', () => ({
  ratingsRepository: {
    loadAll: vi.fn(),
    setRating: vi.fn(),
    clearRating: vi.fn(),
    toggleRating: vi.fn(),
  },
}));

vi.mock('../lib/db', () => ({
  RATINGS_CHANGED_EVENT: 'viralatas:ratings-changed',
}));

import { useBandRatings } from '../hooks/useBandRatings';
import { ratingsRepository } from '../repositories';
import { RATINGS_CHANGED_EVENT } from '../lib/db';

const USER_ID = 'user-1';

describe('useBandRatings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ratingsRepository.loadAll).mockResolvedValue([
      { user_id: USER_ID, band_id: 'b1', score: 4, rated_at: 't' },
      { user_id: 'user-2', band_id: 'b1', score: 5, rated_at: 't' },
    ]);
    vi.mocked(ratingsRepository.setRating).mockResolvedValue(undefined);
    vi.mocked(ratingsRepository.clearRating).mockResolvedValue(undefined);
    vi.mocked(ratingsRepository.toggleRating).mockResolvedValue(undefined);
  });

  it('loads ratings and computes aggregates', async () => {
    const { result } = renderHook(() => useBandRatings(USER_ID));

    await waitFor(() => {
      expect(result.current.allRatings).toHaveLength(2);
    });

    expect(result.current.userRatingByBand.b1).toBe(4);
    expect(result.current.aggregates.b1).toEqual({ avg: 4.5, count: 2 });
  });

  it('delegates setRating to repository', async () => {
    const { result } = renderHook(() => useBandRatings(USER_ID));
    await waitFor(() => expect(result.current.allRatings).toHaveLength(2));

    await act(async () => {
      await result.current.setRating('b2', 3);
    });

    expect(ratingsRepository.setRating).toHaveBeenCalledWith(USER_ID, 'b2', 3);
  });

  it('refreshes on RATINGS_CHANGED_EVENT', async () => {
    const { result } = renderHook(() => useBandRatings(USER_ID));
    await waitFor(() => expect(result.current.allRatings).toHaveLength(2));

    vi.mocked(ratingsRepository.loadAll).mockResolvedValue([
      { user_id: USER_ID, band_id: 'b1', score: 2, rated_at: 't' },
    ]);

    act(() => {
      window.dispatchEvent(new Event(RATINGS_CHANGED_EVENT));
    });

    await waitFor(() => {
      expect(result.current.userRatingByBand.b1).toBe(2);
    });
  });
});
