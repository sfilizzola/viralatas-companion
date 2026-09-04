import { useMemo } from 'react';
import { type BadgeIdbSnapshot } from '../services/badges/badgeContextBuilder';
import { buildFestivalWrapStats, type FestivalWrapStats } from '../services/festivalWrap';
import { useAllRatingsCache } from './useAllRatingsCache';
import { useAuth } from './useAuth';
import { useMissedBands } from './useMissedBands';
import { useNow } from './useNow';
import { useSocialSnapshot } from './useSocialSnapshot';
import { useActiveFestival } from './useActiveFestival';

export type FestivalWrapData = {
  stats: FestivalWrapStats | null;
  loading: boolean;
  error: string | null;
};

export function useFestivalWrapStats(userId: string): FestivalWrapData {
  const { user } = useAuth();
  const { festival } = useActiveFestival();
  const nowDate = useNow();
  const { snapshot: social, crewUsers, presence, picks, bands, loading } =
    useSocialSnapshot(nowDate, festival);
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
      festival,
    };
    return buildFestivalWrapStats(idbSnap, userId, user, social, allRatings, festival);
  }, [loading, social, user, userId, crewUsers, presence, picks, bands, allMissed, allRatings, festival]);

  return useMemo(
    () => ({
      stats,
      loading: loading || !user,
      error: null,
    }),
    [stats, loading, user],
  );
}
