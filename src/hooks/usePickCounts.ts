import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  PICKS_CHANGED_EVENT,
  loadAllUserPicks,
  removeUserPick,
  saveUserPick,
} from '../lib/db';
import { picksRepository } from '../repositories';
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
    picksRepository.syncCrewFromRemote().catch(() => {});

    function handleLocalChange() {
      refreshFromCache();
    }

    window.addEventListener(PICKS_CHANGED_EVENT, handleLocalChange);

    const channel = supabase
      .channel('pick_counts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_picks' },
        async (payload) => {
          const pick = payload.new as UserPick;
          await saveUserPick(pick);
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'user_picks' },
        async (payload) => {
          const pick = payload.old as UserPick;
          await removeUserPick(pick.user_id, pick.band_id);
        },
      )
      .subscribe();

    return () => {
      active = false;
      window.removeEventListener(PICKS_CHANGED_EVENT, handleLocalChange);
      supabase.removeChannel(channel);
    };
  }, []);

  return counts;
}
