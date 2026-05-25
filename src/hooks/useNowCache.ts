import { useCallback, useEffect, useState } from 'react';
import type { Announcement, CrewUser, UserPresence } from '../types';
import {
  ANNOUNCEMENTS_CHANGED_EVENT,
  CREW_USERS_CHANGED_EVENT,
  PRESENCE_CHANGED_EVENT,
  loadAllUserPresence,
  loadCrewUsers,
  loadLatestAnnouncement,
} from '../lib/db';
import { useAllPicks } from './useAllPicks';

export function useNowCache(undoTimerId: ReturnType<typeof setTimeout> | null) {
  const allPicks = useAllPicks();
  const [crewUsers, setCrewUsers] = useState<CrewUser[]>([]);
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [otherCacheLoaded, setOtherCacheLoaded] = useState(false);

  const refreshOtherCache = useCallback(async () => {
    try {
      const [cachedUsers, cachedPresence, ann] = await Promise.all([
        loadCrewUsers(),
        loadAllUserPresence(),
        loadLatestAnnouncement(),
      ]);
      setCrewUsers(cachedUsers);
      setPresence(cachedPresence);
      setLatestAnnouncement(ann ?? null);
    } finally {
      setOtherCacheLoaded(true);
    }
  }, []);

  useEffect(() => {
    function handleCacheChange() {
      refreshOtherCache();
    }
    window.queueMicrotask(handleCacheChange);
    window.addEventListener(CREW_USERS_CHANGED_EVENT, handleCacheChange);
    window.addEventListener(PRESENCE_CHANGED_EVENT, handleCacheChange);
    window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handleCacheChange);
    return () => {
      window.removeEventListener(CREW_USERS_CHANGED_EVENT, handleCacheChange);
      window.removeEventListener(PRESENCE_CHANGED_EVENT, handleCacheChange);
      window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handleCacheChange);
      if (undoTimerId) clearTimeout(undoTimerId);
    };
  }, [refreshOtherCache, undoTimerId]);

  const cacheLoading = allPicks === undefined || !otherCacheLoaded;

  return {
    picks: allPicks ?? [],
    crewUsers,
    presence,
    latestAnnouncement,
    cacheLoading,
  };
}
