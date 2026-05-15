import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const DUCK_QUACK_EVENT = 'viralatas:duck-quack';

export type DuckQuackEventDetail = {
  bandId: string;
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

    const channel = supabase
      .channel('duck_quacks_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'duck_quacks' },
        (payload) => {
          const row = payload.new as { user_id: string; band_id: string };
          if (row.user_id === userId) return;
          if (!pickedBandIds.has(row.band_id)) return;

          window.dispatchEvent(
            new CustomEvent<DuckQuackEventDetail>(DUCK_QUACK_EVENT, {
              detail: { bandId: row.band_id },
            }),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, pickedBandIds]);
}
