import { useCallback, useEffect, useState } from 'react';
import type { Announcement } from '../types';
import { ANNOUNCEMENTS_CHANGED_EVENT, loadLatestAnnouncement } from '../lib/db';

export function useNowCache() {
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const ann = await loadLatestAnnouncement();
      setLatestAnnouncement(ann ?? null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    function handleCacheChange() {
      refresh();
    }
    window.queueMicrotask(handleCacheChange);
    window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handleCacheChange);
    return () => {
      window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handleCacheChange);
    };
  }, [refresh]);

  return {
    latestAnnouncement,
    cacheLoading: !loaded,
  };
}
