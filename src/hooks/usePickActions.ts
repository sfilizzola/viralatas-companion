import { useCallback } from 'react';
import { picksRepository, ratingsRepository } from '../repositories';
import { useMyPicks } from './useMyPicks';

export function usePickActions(userId: string | null) {
  const { pickedIds, refresh } = useMyPicks(userId);

  const togglePick = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      const wasPicked = pickedIds.has(bandId);
      await picksRepository.toggle(userId, bandId, wasPicked);
      if (wasPicked) {
        void ratingsRepository.clearRating(userId, bandId);
      }
      await refresh();
    },
    [userId, pickedIds, refresh],
  );

  const pickBand = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      await picksRepository.toggle(userId, bandId, false);
      await refresh();
    },
    [userId, refresh],
  );

  const unpickBand = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      await picksRepository.toggle(userId, bandId, true);
      await refresh();
    },
    [userId, refresh],
  );

  return { pickedIds, refresh, togglePick, pickBand, unpickBand };
}
