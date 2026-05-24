import { useEffect } from 'react';
import { subscribePostgresChanges } from '../lib/realtimeSync';

export const DUCK_QUACK_EVENT = 'viralatas:duck-quack';

export type DuckQuackEventDetail = {
  bandId: string;
  bandName?: string; // optional override — bypasses IndexedDB lookup (used for test quacks)
};

/**
 * Subscribes to Supabase Realtime INSERT events on duck_quacks.
 * Filters to bands the current user has picked and ignores their own quacks.
 * Dispatches a `viralatas:duck-quack` CustomEvent with `{ bandId }` for
 * DuckToast to consume.
 */
export function useDuckNotifications(
  userId: string | null,
  pickedBandIds: Set<string>,
) {
  useEffect(() => {
    if (!userId) return;

    return subscribePostgresChanges('duck_quacks_realtime', {
      filter: { event: 'INSERT', table: 'duck_quacks' },
      handler: (payload) => {
        const row = payload.new as { user_id: string; band_id: string };
        if (row.user_id === userId) return;
        if (!pickedBandIds.has(row.band_id)) return;

        window.dispatchEvent(
          new CustomEvent<DuckQuackEventDetail>(DUCK_QUACK_EVENT, {
            detail: { bandId: row.band_id },
          }),
        );
      },
    });
  }, [userId, pickedBandIds]);
}
