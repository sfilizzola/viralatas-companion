import { useState, useEffect, useCallback } from 'react';
import { PICKS_CHANGED_EVENT, loadUserPicks } from '../lib/db';

export function useMyPicks(userId: string | null) {
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!userId) {
      setPickedIds(new Set());
      return;
    }
    const picks = await loadUserPicks(userId);
    setPickedIds(new Set(picks.map((p) => p.band_id)));
  }, [userId]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!userId) {
        if (active) setPickedIds(new Set());
        return;
      }
      const picks = await loadUserPicks(userId);
      if (active) setPickedIds(new Set(picks.map((p) => p.band_id)));
    }

    function handleLocalChange() {
      load();
    }

    load();
    window.addEventListener(PICKS_CHANGED_EVENT, handleLocalChange);

    return () => {
      active = false;
      window.removeEventListener(PICKS_CHANGED_EVENT, handleLocalChange);
    };
  }, [userId]);

  return { pickedIds, refresh };
}
