import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserMissedBand } from '../types';
import { MISSED_CHANGED_EVENT } from '../lib/db';
import { missedRepository } from '../repositories';

export function useMissedBands(userId: string | null) {
  const [allMissed, setAllMissed] = useState<UserMissedBand[]>([]);

  const refresh = useCallback(async () => {
    setAllMissed(await missedRepository.loadAll());
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      const data = await missedRepository.loadAll();
      if (active) setAllMissed(data);
    }

    function handleChange() {
      load();
    }

    load();

    window.addEventListener(MISSED_CHANGED_EVENT, handleChange);

    return () => {
      active = false;
      window.removeEventListener(MISSED_CHANGED_EVENT, handleChange);
    };
  }, [userId]);

  const missedBandIds = useMemo(
    () => new Set(allMissed.filter((m) => m.user_id === userId).map((m) => m.band_id)),
    [allMissed, userId],
  );

  const missedCountsByBand = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of allMissed) {
      map[m.band_id] = (map[m.band_id] ?? 0) + 1;
    }
    return map;
  }, [allMissed]);

  const mark = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      await missedRepository.mark(userId, bandId);
    },
    [userId],
  );

  const unmark = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      await missedRepository.unmark(userId, bandId);
    },
    [userId],
  );

  const toggleMissed = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      if (missedBandIds.has(bandId)) {
        await missedRepository.unmark(userId, bandId);
      } else {
        await missedRepository.mark(userId, bandId);
      }
    },
    [userId, missedBandIds],
  );

  return {
    allMissed,
    missedBandIds,
    missedCountsByBand,
    mark,
    unmark,
    toggleMissed,
    refresh,
  };
}
