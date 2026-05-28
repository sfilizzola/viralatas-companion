import { useState, useEffect, useCallback } from 'react';
import { PICKS_CHANGED_EVENT, loadUserPicks } from '../lib/db';

export function useMyPicks(userId: string | null) {
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  /** False until the first IDB read for this `userId` finishes (avoids empty-picks flash on remount). */
  const [picksReady, setPicksReady] = useState(() => userId === null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setPickedIds(new Set());
      setPicksReady(true);
      return;
    }
    const picks = await loadUserPicks(userId);
    setPickedIds(new Set(picks.map((p) => p.band_id)));
    setPicksReady(true);
  }, [userId]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!userId) {
        if (active) {
          setPickedIds(new Set());
          setPicksReady(true);
        }
        return;
      }
      if (active) setPicksReady(false);
      const picks = await loadUserPicks(userId);
      if (active) {
        setPickedIds(new Set(picks.map((p) => p.band_id)));
        setPicksReady(true);
      }
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

  return { pickedIds, picksReady, refresh };
}
