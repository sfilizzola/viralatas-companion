import { useMemo } from 'react';
import {
  type BadgeIdbSnapshot,
} from '../services/badges/badgeContextBuilder';
import { buildFestivalWrapStats, type FestivalWrapStats } from '../services/festivalWrap';
import { useBadgeCache } from './useBadgeCache';

export type FestivalWrapData = {
  stats: FestivalWrapStats | null;
  loading: boolean;
  error: string | null;
};

export function useFestivalWrapStats(userId: string): FestivalWrapData {
  const { snapshot, cacheLoading } = useBadgeCache(userId);

  const stats = useMemo(() => {
    if (!snapshot) return null;
    const crewRow = snapshot.crewUsers.find((u) => u.id === userId);
    const idbSnap: BadgeIdbSnapshot = {
      userPicks: snapshot.userPicks,
      allPicks: snapshot.allPicks,
      bands: snapshot.bands,
      allMissed: snapshot.allMissed,
      presence: snapshot.presence,
      crewUsers: snapshot.crewUsers,
      assignedBadges: crewRow?.special_badges ?? [],
      isCurrentUserFriend: crewRow?.is_friend === true,
      metalPlaceWindowActive: snapshot.metalPlaceWindowActive,
      liveTestBandId: snapshot.liveTestBandId,
    };
    return buildFestivalWrapStats(idbSnap, userId, snapshot.sessionUser);
  }, [snapshot, userId]);

  return useMemo(
    () => ({
      stats,
      loading: cacheLoading,
      error: null,
    }),
    [stats, cacheLoading],
  );
}
