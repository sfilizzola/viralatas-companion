import { useState, useEffect } from 'react';
import { PICKS_CHANGED_EVENT, loadAllUserPicks } from '../lib/db';
import type { UserPick } from '../types';

export function countPicks(picks: UserPick[]) {
  const map: Record<string, number> = {};
  for (const pick of picks) {
    map[pick.band_id] = (map[pick.band_id] ?? 0) + 1;
  }
  return map;
}

export function usePickCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;

    async function refreshFromCache() {
      const picks = await loadAllUserPicks();
      if (active) setCounts(countPicks(picks));
    }

    refreshFromCache();
    window.addEventListener(PICKS_CHANGED_EVENT, refreshFromCache);

    return () => {
      active = false;
      window.removeEventListener(PICKS_CHANGED_EVENT, refreshFromCache);
    };
  }, []);

  return counts;
}
