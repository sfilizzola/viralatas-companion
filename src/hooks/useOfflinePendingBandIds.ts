import { useEffect, useState } from 'react';
import { PICKS_CHANGED_EVENT, loadOfflineQueue } from '../lib/db';

export function useOfflinePendingBandIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set());

  async function load() {
    const queue = await loadOfflineQueue();
    setIds(new Set(queue.map((op) => op.band_id)));
  }

  useEffect(() => {
    load();
    window.addEventListener(PICKS_CHANGED_EVENT, load);
    return () => window.removeEventListener(PICKS_CHANGED_EVENT, load);
  }, []);

  return ids;
}
