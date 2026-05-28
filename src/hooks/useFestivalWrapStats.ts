import { useMemo } from 'react';
import { type BadgeIdbSnapshot } from '../services/badges/badgeContextBuilder';
import { buildFestivalWrapStats, type FestivalWrapStats } from '../services/festivalWrap';
import { useAllRatingsCache } from './useAllRatingsCache';
import { useAuth } from './useAuth';
import { useMissedBands } from './useMissedBands';
import { useNow } from './useNow';
import { useSocialSnapshot } from './useSocialSnapshot';

export type FestivalWrapData = {
  stats: FestivalWrapStats | null;
  loading: boolean;
  error: string | null;
};

export function useFestivalWrapStats(userId: string): FestivalWrapData {
  const { user } = useAuth();
  const nowDate = useNow();
  const { snapshot: social, crewUsers, presence, picks, bands, loading } =
    useSocialSnapshot(nowDate);
  const { allMissed } = useMissedBands(userId);
  const { allRatings } = useAllRatingsCache();

  const stats = useMemo(() => {
    if (loading || !social || !user || user.id !== userId) return null;
    const crewRow = crewUsers.find((u) => u.id === userId);
    const idbSnap: BadgeIdbSnapshot = {
      userPicks: picks.filter((p) => p.user_id === userId),
      allPicks: picks,
      bands,
      allMissed,
      presence,
      crewUsers,
      assignedBadges: crewRow?.special_badges ?? [],
      isCurrentUserFriend: crewRow?.is_friend === true,
      metalPlaceWindowActive: social.metalPlaceWindowActive,
      liveTestBandId: social.liveTestBandId,
    };
    return buildFestivalWrapStats(idbSnap, userId, user, social, allRatings);
  }, [loading, social, user, userId, crewUsers, presence, picks, bands, allMissed, allRatings]);

  return useMemo(
    () => ({
      stats,
      loading: loading || !user,
      error: null,
    }),
    [stats, loading, user],
  );
}
