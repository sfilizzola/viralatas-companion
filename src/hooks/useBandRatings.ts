import { useState, useEffect, useCallback, useMemo } from 'react';
import type { BandRatingScore, UserBandRating } from '../types';
import { RATINGS_CHANGED_EVENT } from '../lib/db';
import { ratingsRepository } from '../repositories';
import { computeRatingAggregates } from '../services/bandRatings';

export function useBandRatings(userId: string | null) {
  const [allRatings, setAllRatings] = useState<UserBandRating[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const data = await ratingsRepository.loadAll();
      if (active) setAllRatings(data);
    }

    function handleChange() {
      load();
    }

    load();
    window.addEventListener(RATINGS_CHANGED_EVENT, handleChange);

    return () => {
      active = false;
      window.removeEventListener(RATINGS_CHANGED_EVENT, handleChange);
    };
  }, [userId]);

  const userRatingByBand = useMemo(() => {
    const map: Record<string, BandRatingScore> = {};
    if (!userId) return map;
    for (const row of allRatings) {
      if (row.user_id === userId) map[row.band_id] = row.score;
    }
    return map;
  }, [allRatings, userId]);

  const aggregates = useMemo(() => computeRatingAggregates(allRatings), [allRatings]);

  const setRating = useCallback(
    async (bandId: string, score: BandRatingScore) => {
      if (!userId) return;
      await ratingsRepository.setRating(userId, bandId, score);
    },
    [userId],
  );

  const clearRating = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      await ratingsRepository.clearRating(userId, bandId);
    },
    [userId],
  );

  const toggleRating = useCallback(
    async (bandId: string, score: BandRatingScore) => {
      if (!userId) return;
      await ratingsRepository.toggleRating(userId, bandId, score);
    },
    [userId],
  );

  return {
    allRatings,
    userRatingByBand,
    aggregates,
    setRating,
    clearRating,
    toggleRating,
  };
}
