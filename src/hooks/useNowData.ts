import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Announcement, Band, LiveBandTestConfig, MetalPlaceConfig, UserPick } from '../types';
import type { CrewLiveGroup, CrewLivePlan, LivePlan, PresenceLocation } from '../services/livePreview';
import { loadUserPicks } from '../lib/db';
import { presenceRepository } from '../repositories';
import { WEAK_SKIP_UNDO_MS, recordCommittedSkip } from '../services/weakSkips';
import { usePickActions } from './usePickActions';
import { useDuckQuack } from './useDuckQuack';
import { useAuth } from './useAuth';
import { useLiveBandTestConfig } from './useLiveBandTestConfig';
import { useMetalPlaceConfig } from './useMetalPlaceConfig';
import { useNowCache } from './useNowCache';
import { useNowPlans } from './useNowPlans';
import { useNow } from './useNow';
import { useSocialSnapshot } from './useSocialSnapshot';

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
  const { unpickBand, pickBand } = usePickActions(userId);
  const [undoState, setUndoState] = useState<{ bandId: string; bandName: string } | null>(null);
  const [undoTimerId, setUndoTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const pendingWeakSkipRef = useRef<{ bandId: string } | null>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metalPlaceConfig = useMetalPlaceConfig();
  const liveBandTestConfig = useLiveBandTestConfig();

  const { latestAnnouncement, cacheLoading: announcementLoading } = useNowCache();
  const loading = socialLoading || announcementLoading || social === null;

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

  useEffect(() => {
    return () => {
      if (undoTimerId) clearTimeout(undoTimerId);
    };
  }, [undoTimerId]);

  useEffect(() => {
    if (!metalPlaceConfig || !userId) return;
    presenceRepository.validateAndAutoCheckout(metalPlaceConfig, userId).catch(() => {});
  }, [metalPlaceConfig, userId, isMetalPlaceWindowActive]);

  useEffect(() => {
    if (!userId) return;
    presenceRepository
      .autoClearCampingOnCurrentBand(userId, isCamping, myRawPlan.status)
      .catch(() => {});
  }, [userId, isCamping, myRawPlan.status]);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, []);

  const commitWeakSkip = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      const userPicks = await loadUserPicks(userId);
      if (userPicks.some((pick) => pick.band_id === bandId)) return;
      await recordCommittedSkip(userId, bandId);
    },
    [userId],
  );

  const clearSkipTimers = useCallback(() => {
    if (undoTimerId) clearTimeout(undoTimerId);
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = null;
    setUndoTimerId(null);
  }, [undoTimerId]);

  const handleSkip = useCallback(async () => {
    if (!myPlan.band || !userId) return;
    const bandId = myPlan.band.id;
    const bandName = myPlan.band.name;

    if (pendingWeakSkipRef.current) {
      await commitWeakSkip(pendingWeakSkipRef.current.bandId);
      pendingWeakSkipRef.current = null;
    }

    clearSkipTimers();
    await unpickBand(bandId);
    pendingWeakSkipRef.current = { bandId };
    setUndoState({ bandId, bandName });

    const nextUndoTimerId = setTimeout(() => {
      setUndoState(null);
    }, WEAK_SKIP_UNDO_MS);
    setUndoTimerId(nextUndoTimerId);

    commitTimerRef.current = setTimeout(() => {
      void commitWeakSkip(bandId).finally(() => {
        pendingWeakSkipRef.current = null;
        commitTimerRef.current = null;
      });
    }, WEAK_SKIP_UNDO_MS);
  }, [myPlan, userId, clearSkipTimers, unpickBand, commitWeakSkip]);

  const handleUndo = useCallback(async () => {
    if (!undoState || !userId) return;
    clearSkipTimers();
    pendingWeakSkipRef.current = null;
    await pickBand(undoState.bandId);
    setUndoState(null);
  }, [undoState, userId, clearSkipTimers, pickBand]);

  const { quack: duckQuack, cooldownUntil: duckCooldownUntil } = useDuckQuack(userId, duckBandId);

  const handlePresenceChange = useCallback(async (nextValue: PresenceLocation) => {
    if (!userId) return;
    await presenceRepository.applyPresenceToggle(userId, nextValue, {
      myRawPlanStatus: myRawPlan.status,
      isAtMetalPlace,
      isCamping,
    });
  }, [userId, myRawPlan.status, isAtMetalPlace, isCamping]);

  const nextBand = useMemo(() => {
    if (myPlan.status === 'current' || !userId) return null;
    const upcomingBands = picks
      .filter((pick) => pick.user_id === userId)
      .map((pick) => bands.find((b) => b.id === pick.band_id))
      .filter((b): b is Band => b !== undefined && b.start_time > now.toISOString())
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return upcomingBands[0] ?? null;
  }, [picks, bands, myPlan.status, userId, now]);

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
