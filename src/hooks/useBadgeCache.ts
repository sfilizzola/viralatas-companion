import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  CREW_USERS_CHANGED_EVENT,
  loadAllUserPresence,
  loadBands,
  loadCrewUsers,
  loadLiveBandTestConfig,
  loadMetalPlaceConfig,
  loadUserPicks,
  PRESENCE_CHANGED_EVENT,
} from '../lib/db';
import { supabase } from '../lib/supabase';
import { presenceRepository } from '../repositories';
import { resolveLiveTestBandId } from '../services/livePreview';
import { now } from '../services/time';
import type { Band, CrewUser, UserPick, UserPresence } from '../types';
import { useAllPicks } from './useAllPicks';
import { useMissedBands } from './useMissedBands';

export type BadgeCacheSnapshot = {
  userPicks: { band_id: string }[];
  allPicks: UserPick[];
  bands: Band[];
  allMissed: { user_id: string; band_id: string }[];
  presence: UserPresence[];
  crewUsers: CrewUser[];
  metalPlaceWindowActive: boolean;
  liveTestBandId: string | null;
  sessionUser: AuthUser;
};

export type BadgeCacheData = {
  snapshot: BadgeCacheSnapshot | null;
  cacheLoading: boolean;
};

export function useBadgeCache(userId: string): BadgeCacheData {
  const allPicks = useAllPicks();
  const { allMissed } = useMissedBands(userId);
  const [snapshot, setSnapshot] = useState<BadgeCacheSnapshot | null>(null);

  const refresh = useCallback(async () => {
    if (allPicks === undefined) return;

    const { data: { session } } = await supabase.auth.getSession();
    const sessionUser = session?.user;
    if (!sessionUser || sessionUser.id !== userId) return;

    const [userPicks, bands, presence, crewUsers, metalPlaceConfig, liveBandTestConfig] =
      await Promise.all([
        loadUserPicks(userId),
        loadBands(),
        loadAllUserPresence(),
        loadCrewUsers(),
        loadMetalPlaceConfig(),
        loadLiveBandTestConfig(),
      ]);

    const currentNow = now();
    const metalPlaceWindowActive = presenceRepository.isTimeWithinMetalPlaceWindow(
      metalPlaceConfig,
      currentNow,
    );
    const liveTestBandId = resolveLiveTestBandId(liveBandTestConfig);

    setSnapshot({
      userPicks,
      allPicks,
      bands,
      allMissed,
      presence,
      crewUsers,
      metalPlaceWindowActive,
      liveTestBandId,
      sessionUser,
    });
  }, [userId, allPicks, allMissed]);

  useEffect(() => {
    if (allPicks === undefined) return;

    refresh();
    window.addEventListener(PRESENCE_CHANGED_EVENT, refresh);
    window.addEventListener(CREW_USERS_CHANGED_EVENT, refresh);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'USER_UPDATED') void refresh();
    });

    return () => {
      window.removeEventListener(PRESENCE_CHANGED_EVENT, refresh);
      window.removeEventListener(CREW_USERS_CHANGED_EVENT, refresh);
      subscription.unsubscribe();
    };
  }, [allPicks, refresh]);

  return useMemo(
    () => ({
      snapshot,
      cacheLoading: allPicks === undefined || snapshot === null,
    }),
    [snapshot, allPicks],
  );
}
