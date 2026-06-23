// src/hooks/useNowData.ts
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Announcement, Band, LiveBandTestConfig, MetalPlaceConfig, UserPick } from '../types';
import type { CrewLiveGroup, CrewLivePlan, LivePlan, PresenceLocation } from '../services/livePreview';
import { presenceService } from '../services/presenceService';
import { useAuth } from './useAuth';
import { useLiveBandTestConfig } from './useLiveBandTestConfig';
import { useMetalPlaceConfig } from './useMetalPlaceConfig';
import { useNowCache } from './useNowCache';
import { useNowPlans } from './useNowPlans';
import { useNow } from './useNow';
import { useSocialSnapshot } from './useSocialSnapshot';
import { useSkipUndo } from './useSkipUndo';
import { usePresenceAutoSync } from './usePresenceAutoSync';
import { useDuckQuack } from './useDuckQuack';

export type NowData = {
  userId: string | null;
  user: ReturnType<typeof useAuth>['user'];
  userDisplayName: string | null;
  isFriend: boolean;
  bands: Band[];
  picks: UserPick[];
  crewUsers: ReturnType<typeof useSocialSnapshot>['crewUsers'];
  presence: ReturnType<typeof useSocialSnapshot>['presence'];
  latestAnnouncement: Announcement | null;
  now: Date;
  loading: boolean;
  undoState: { bandId: string; bandName: string } | null;
  metalPlaceConfig: MetalPlaceConfig | null;
  liveBandTestConfig: LiveBandTestConfig | null;
  liveTestBand: Band | null;
  isMetalPlaceWindowActive: boolean;
  presenceValue: PresenceLocation;
  myPlan: LivePlan;
  nextBand: Band | null;
  crewPlans: CrewLivePlan[];
  crewGroups: CrewLiveGroup[];
  handleSkip: () => Promise<void>;
  handleUndo: () => Promise<void>;
  handlePresenceChange: (nextValue: PresenceLocation) => Promise<void>;
  duckBandId: string | null;
  duckQuack: () => Promise<void>;
  duckCooldownUntil: number | null;
};

export function useNowData(): NowData {
  const { session, user } = useAuth();
  const userId = session?.user?.id ?? null;
  const userDisplayName =
    (user?.user_metadata?.['display_name'] as string | undefined) ?? user?.email ?? null;

  const now = useNow(30_000);
  const {
    snapshot: social,
    crewUsers,
    presence,
    picks,
    bands: rawBands,
    loading: socialLoading,
  } = useSocialSnapshot(now);
  const bands = useMemo(
    () => rawBands.slice().sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [rawBands],
  );
  const metalPlaceConfig = useMetalPlaceConfig();
  const liveBandTestConfig = useLiveBandTestConfig();
  const { latestAnnouncement, cacheLoading: announcementLoading } = useNowCache();
  const loading = socialLoading || announcementLoading;
  const wasLoadingRef = useRef(true);

  useEffect(() => {
    if (loading || !wasLoadingRef.current) return;
    wasLoadingRef.current = false;
    if (import.meta.env.DEV) {
      console.info('[cold-start] /now data ready');
    }
  }, [loading]);

  const {
    isMetalPlaceWindowActive,
    liveTestBand,
    myRawPlan,
    isFriend,
    isCamping,
    isAtMetalPlace,
    presenceValue,
    myPlan,
    crewPlans,
    crewGroups,
    duckBandId,
  } = useNowPlans({
    social: social ?? {
      metalPlaceWindowActive: false,
      liveTestBandId: null,
      crewPlans: [],
      crewGroups: [],
      crewLocationCounts: { camping: 0, metal_place: 0, lost: 0 },
    },
    bands,
    picks,
    crewUsers,
    presence,
    userId,
    userDisplayName,
    now,
  });

  const { undoState, handleSkip, handleUndo } = useSkipUndo(myPlan, userId);

  usePresenceAutoSync({
    userId,
    metalPlaceConfig,
    isCamping,
    myRawPlanStatus: myRawPlan.status,
    isMetalPlaceWindowActive,
  });

  const handlePresenceChange = useCallback(
    async (nextValue: PresenceLocation) => {
      if (!userId) return;
      await presenceService.applyPresenceToggle(userId, nextValue, {
        myRawPlanStatus: myRawPlan.status,
        isAtMetalPlace,
        isCamping,
      });
    },
    [userId, myRawPlan.status, isAtMetalPlace, isCamping],
  );

  const nextBand = useMemo(() => {
    if (myPlan.status === 'current' || !userId) return null;
    const upcomingBands = picks
      .filter((pick) => pick.user_id === userId)
      .map((pick) => bands.find((b) => b.id === pick.band_id))
      .filter((b): b is Band => b !== undefined && b.start_time > now.toISOString())
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return upcomingBands[0] ?? null;
  }, [picks, bands, myPlan.status, userId, now]);

  const { quack: duckQuack, cooldownUntil: duckCooldownUntil } = useDuckQuack(userId, duckBandId);

  return {
    userId,
    user,
    userDisplayName,
    isFriend,
    bands,
    picks,
    crewUsers,
    presence,
    latestAnnouncement,
    now,
    loading,
    undoState,
    metalPlaceConfig,
    liveBandTestConfig,
    liveTestBand,
    isMetalPlaceWindowActive,
    presenceValue,
    myPlan,
    nextBand,
    crewPlans,
    crewGroups,
    handleSkip,
    handleUndo,
    handlePresenceChange,
    duckBandId,
    duckQuack,
    duckCooldownUntil,
  };
}
