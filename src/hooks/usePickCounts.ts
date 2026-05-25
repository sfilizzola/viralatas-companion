import { useState, useEffect } from 'react';
import {
  PICKS_CHANGED_EVENT,
  loadAllUserPicks,
  removeUserPick,
  saveUserPick,
} from '../lib/db';
import { subscribePostgresChanges } from '../lib/realtimeSync';
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

    function handleLocalChange() {
      refreshFromCache();
    }

    window.addEventListener(PICKS_CHANGED_EVENT, handleLocalChange);

    const unsubscribeRealtime = subscribePostgresChanges('pick_counts', [
      {
        filter: { event: 'INSERT', table: 'user_picks' },
        handler: async (payload) => {
          const pick = payload.new as UserPick;
          await saveUserPick(pick);
        },
      },
      {
        filter: { event: 'DELETE', table: 'user_picks' },
        handler: async (payload) => {
          const pick = payload.old as UserPick;
          await removeUserPick(pick.user_id, pick.band_id);
        },
      },
    ]);

    return () => {
      active = false;
      window.removeEventListener(PICKS_CHANGED_EVENT, handleLocalChange);
      unsubscribeRealtime();
    };
  }, []);

  return counts;
}
