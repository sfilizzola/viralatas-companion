import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDuckNotifications } from '../../hooks/useDuckNotifications';
import { PICKS_CHANGED_EVENT, loadUserPicks } from '../../lib/db';

/**
 * Top-level listener that subscribes to Supabase Realtime duck_quacks events
 * and dispatches `viralatas:duck-quack` window events for DuckToast to consume.
 */
export function DuckNotificationsListener() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [pickedBandIds, setPickedBandIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    async function loadPicks() {
      const picks = await loadUserPicks(userId!);
      setPickedBandIds(new Set(picks.map((p) => p.band_id)));
    }

    loadPicks().catch(() => {});
    window.addEventListener(PICKS_CHANGED_EVENT, loadPicks);
    return () => window.removeEventListener(PICKS_CHANGED_EVENT, loadPicks);
  }, [userId]);

  useDuckNotifications(userId, pickedBandIds);

  return null;
}
