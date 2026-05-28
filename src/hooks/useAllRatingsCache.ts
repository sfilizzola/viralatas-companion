import { useState, useEffect } from 'react';
import type { UserBandRating } from '../types';
import { RATINGS_CHANGED_EVENT } from '../lib/db';
import { ratingsRepository } from '../repositories';

/** Read-only crew-wide ratings cell — no mutation API. */
export function useAllRatingsCache() {
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
  }, []);

  return { allRatings };
}
