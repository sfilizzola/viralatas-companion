import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Announcement, Band, CrewUser, LiveBandTestConfig, MetalPlaceConfig, UserPick, UserPresence } from '../types';
import type { CrewLiveGroup, CrewLivePlan, LivePlan, PresenceLocation } from '../services/livePreview';
import { presenceRepository } from '../repositories';
import { usePickActions } from './usePickActions';
import { useDuckQuack } from './useDuckQuack';
import { useAuth } from './useAuth';
import { useBands } from './useBands';
import { useLiveBandTestConfig } from './useLiveBandTestConfig';
import { useMetalPlaceConfig } from './useMetalPlaceConfig';
import { useNowCache } from './useNowCache';
import { useNowPlans } from './useNowPlans';
import { useNow } from './useNow';

export type NowData = {
  userId: string | null;
  user: ReturnType<typeof useAuth>['user'];
  userDisplayName: string | null;
  isFriend: boolean;
  bands: Band[];
  picks: UserPick[];
  crewUsers: CrewUser[];
  presence: UserPresence[];
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
  const { bands: rawBands, loading: bandsLoading } = useBands();
  const bands = useMemo(
    () => rawBands.slice().sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [rawBands],
  );
  const { unpickBand, pickBand } = usePickActions(userId);
  const [undoState, setUndoState] = useState<{ bandId: string; bandName: string } | null>(null);
  const [undoTimerId, setUndoTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const metalPlaceConfig = useMetalPlaceConfig();
  const liveBandTestConfig = useLiveBandTestConfig();

  const { picks, crewUsers, presence, latestAnnouncement, cacheLoading } =
    useNowCache(undoTimerId);
  const loading = bandsLoading || cacheLoading;

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
    bands,
    picks,
    crewUsers,
    presence,
    userId,
    userDisplayName,
    now,
    metalPlaceConfig,
    liveBandTestConfig,
  });

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

  const handleSkip = useCallback(async () => {
    if (!myPlan.band || !userId) return;
    const bandId = myPlan.band.id;
    const bandName = myPlan.band.name;
    if (undoTimerId) clearTimeout(undoTimerId);
    await unpickBand(bandId);
    setUndoState({ bandId, bandName });
    const timerId = setTimeout(() => setUndoState(null), 5000);
    setUndoTimerId(timerId);
  }, [myPlan, userId, undoTimerId, unpickBand]);

  const handleUndo = useCallback(async () => {
    if (!undoState || !userId) return;
    if (undoTimerId) clearTimeout(undoTimerId);
    setUndoTimerId(null);
    await pickBand(undoState.bandId);
    setUndoState(null);
  }, [undoState, userId, undoTimerId, pickBand]);

  const { quack: duckQuack, cooldownUntil: duckCooldownUntil } = useDuckQuack(userId, duckBandId);

  const handlePresenceChange = useCallback(async (nextValue: PresenceLocation) => {
    if (!userId) return;
    await presenceRepository.applyPresenceToggle(userId, nextValue, {
      myRawPlanStatus: myRawPlan.status,
      isAtMetalPlace,
      isCamping,
    });
  }, [userId, myRawPlan.status, isAtMetalPlace, isCamping]);

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
