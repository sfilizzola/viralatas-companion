import { useMemo } from 'react';
import { buildSocialSnapshot, type SocialSnapshot } from '../services/socialSnapshot';
import { useAllPicks } from './useAllPicks';
import { useBands } from './useBands';
import { useCrewUsersCache, usePresenceCache } from './useSocialSnapshotSpecs';
import { useLiveBandTestConfig } from './useLiveBandTestConfig';
import { useMetalPlaceConfig } from './useMetalPlaceConfig';
import { useActiveFestival } from './useActiveFestival';
import type { Festival } from '../types/festival';

export type SocialSnapshotData = {
  snapshot: SocialSnapshot | null;
  crewUsers: NonNullable<ReturnType<typeof useCrewUsersCache>>;
  presence: NonNullable<ReturnType<typeof usePresenceCache>>;
  picks: NonNullable<ReturnType<typeof useAllPicks>>;
  bands: ReturnType<typeof useBands>['bands'];
  loading: boolean;
};

export function useSocialSnapshot(
  now: Date,
  festivalOverride?: Festival | null,
): SocialSnapshotData {
  const { festival: contextFestival } = useActiveFestival();
  const festival = festivalOverride === undefined ? contextFestival : festivalOverride;
  const picks = useAllPicks();
  const { bands, loading: bandsLoading } = useBands();
  const crewUsers = useCrewUsersCache();
  const presence = usePresenceCache();
  const metalPlaceConfig = useMetalPlaceConfig();
  const liveBandTestConfig = useLiveBandTestConfig();

  const loading =
    picks === undefined ||
    bandsLoading ||
    crewUsers === undefined ||
    presence === undefined;

  const snapshot = useMemo(() => {
    if (loading) return null;
    return buildSocialSnapshot({
      bands,
      picks,
      crewUsers,
      presence,
      metalPlaceConfig,
      liveBandTestConfig,
      festival,
      now,
    });
  }, [loading, bands, picks, crewUsers, presence, metalPlaceConfig, liveBandTestConfig, festival, now]);

  return {
    snapshot,
    crewUsers: crewUsers ?? [],
    presence: presence ?? [],
    picks: picks ?? [],
    bands,
    loading,
  };
}
