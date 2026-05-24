import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Announcement, Band, CrewUser, LiveBandTestConfig, MetalPlaceConfig, UserPick, UserPresence } from '../types';
import {
  ANNOUNCEMENTS_CHANGED_EVENT,
  CREW_USERS_CHANGED_EVENT,
  PICKS_CHANGED_EVENT,
  PRESENCE_CHANGED_EVENT,
  loadAllUserPicks,
  loadAllUserPresence,
  loadCrewUsers,
  loadLatestAnnouncement,
} from '../lib/db';
import {
  derivePresenceValue,
  findLivePlan,
  groupCrewLivePlans,
  mapCrewLivePlans,
  resolveFocusUserLivePlan,
  type CrewLiveGroup,
  type CrewLivePlan,
  type LivePlan,
  type PresenceLocation,
} from '../services/livePreview';
import { presenceRepository } from '../repositories';
import { usePickActions } from './usePickActions';
import { useDuckQuack } from './useDuckQuack';
import { useAuth } from './useAuth';
import { useBands } from './useBands';
import { useLiveBandTestConfig } from './useLiveBandTestConfig';
import { useMetalPlaceConfig } from './useMetalPlaceConfig';
import { usePresenceRealtime } from './usePresenceRealtime';
import { useNow } from './useNow';
const DUCK_WINDOW_MS = 15 * 60 * 1000;

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

  const [picks, setPicks] = useState<UserPick[]>([]);
  const [crewUsers, setCrewUsers] = useState<CrewUser[]>([]);
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const now = useNow(30_000);
  const { bands: rawBands, loading: bandsLoading } = useBands();
  const bands = useMemo(
    () => rawBands.slice().sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [rawBands],
  );
  const { unpickBand, pickBand } = usePickActions(userId);
  const [cacheLoading, setCacheLoading] = useState(true);
  const loading = bandsLoading || cacheLoading;
  const [undoState, setUndoState] = useState<{ bandId: string; bandName: string } | null>(null);
  const [undoTimerId, setUndoTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const metalPlaceConfig = useMetalPlaceConfig();
  const liveBandTestConfig = useLiveBandTestConfig();
  usePresenceRealtime();

  const refreshFromCache = useCallback(async () => {
    try {
      const [cachedPicks, cachedUsers, cachedPresence, ann] = await Promise.all([
        loadAllUserPicks(),
        loadCrewUsers(),
        loadAllUserPresence(),
        loadLatestAnnouncement(),
      ]);
      setPicks(cachedPicks);
      setCrewUsers(cachedUsers);
      setPresence(cachedPresence);
      setLatestAnnouncement(ann ?? null);
    } finally {
      setCacheLoading(false);
    }
  }, []);

  useEffect(() => {
    function handleCacheChange() {
      refreshFromCache();
    }
    window.queueMicrotask(handleCacheChange);
    window.addEventListener(PICKS_CHANGED_EVENT, handleCacheChange);
    window.addEventListener(CREW_USERS_CHANGED_EVENT, handleCacheChange);
    window.addEventListener(PRESENCE_CHANGED_EVENT, handleCacheChange);
    window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handleCacheChange);
    return () => {
      window.removeEventListener(PICKS_CHANGED_EVENT, handleCacheChange);
      window.removeEventListener(CREW_USERS_CHANGED_EVENT, handleCacheChange);
      window.removeEventListener(PRESENCE_CHANGED_EVENT, handleCacheChange);
      window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handleCacheChange);
      if (undoTimerId) clearTimeout(undoTimerId);
    };
  }, [refreshFromCache, undoTimerId]);

  const isMetalPlaceWindowActive = useMemo(
    () => presenceRepository.isTimeWithinMetalPlaceWindow(metalPlaceConfig, now),
    [metalPlaceConfig, now],
  );

  const liveTestBandId = useMemo(
    () =>
      liveBandTestConfig?.enabled && liveBandTestConfig.band_id
        ? liveBandTestConfig.band_id
        : null,
    [liveBandTestConfig],
  );

  const liveTestBand = useMemo(
    () => (liveTestBandId ? bands.find((b) => b.id === liveTestBandId) ?? null : null),
    [bands, liveTestBandId],
  );

  useEffect(() => {
    if (!metalPlaceConfig || !userId) return;
    presenceRepository.validateAndAutoCheckout(metalPlaceConfig, userId).catch(() => {});
  }, [metalPlaceConfig, userId, isMetalPlaceWindowActive]);

  const myRawPlan = useMemo(() => {
    if (!userId) return { status: 'empty', band: null } satisfies LivePlan;
    return findLivePlan(
      bands,
      new Set(picks.filter((pick) => pick.user_id === userId).map((pick) => pick.band_id)),
      now,
      liveTestBandId,
    );
  }, [bands, picks, userId, now, liveTestBandId]);

  const myPresence = useMemo(
    () => (userId ? presence.find((item) => item.user_id === userId) : undefined),
    [presence, userId],
  );

  const isFriend = useMemo(
    () => crewUsers.find((u) => u.id === userId)?.is_friend === true,
    [crewUsers, userId],
  );

  const isCamping = myPresence?.is_camping ?? false;
  const isAtMetalPlace = myPresence?.is_at_metal_place ?? false;
  const presenceValue = derivePresenceValue(myPresence, myRawPlan, isMetalPlaceWindowActive);

  const myPlan = useMemo(
    () => resolveFocusUserLivePlan(myRawPlan, myPresence, isMetalPlaceWindowActive),
    [myRawPlan, myPresence, isMetalPlaceWindowActive],
  );

  useEffect(() => {
    if (!userId || !isCamping || myRawPlan.status !== 'current') return;
    presenceRepository.setCampingStatus(userId, false).catch(() => {});
  }, [userId, isCamping, myRawPlan.status]);

  const crewPlans = useMemo(() => {
    const users = [...crewUsers];
    if (userId && !users.some((crewUser) => crewUser.id === userId)) {
      users.push({ id: userId, display_name: userDisplayName, avatar_url: null });
    }
    return mapCrewLivePlans(bands, picks, users, presence, now, liveTestBandId);
  }, [bands, picks, crewUsers, presence, userId, userDisplayName, now, liveTestBandId]);

  const crewGroups = useMemo(
    () => groupCrewLivePlans(crewPlans, { metalPlaceWindowActive: isMetalPlaceWindowActive }),
    [crewPlans, isMetalPlaceWindowActive],
  );

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

  // Duck quack for the user's current live band (if any and not a ceremony),
  // only during the first 15 minutes of the set.
  const duckBandId = useMemo(() => {
    if (myPlan.status !== 'current' || !myPlan.band) return null;
    if (myPlan.band.category === 'ceremony') return null;
    if (now.getTime() >= new Date(myPlan.band.start_time).getTime() + DUCK_WINDOW_MS) return null;
    return myPlan.band.id;
  }, [myPlan, now]);

  const { quack: duckQuack, cooldownUntil: duckCooldownUntil } = useDuckQuack(userId, duckBandId);

  const handlePresenceChange = useCallback(async (nextValue: PresenceLocation) => {
    if (!userId) return;
    if (nextValue === 'camping') {
      if (myRawPlan.status === 'current') {
        await presenceRepository.setCampingStatus(userId, false);
        return;
      }
      await presenceRepository.setCampingStatus(userId, true);
      return;
    }
    if (nextValue === 'metal_place') {
      await presenceRepository.setMetalPlaceStatus(userId, true);
      return;
    }
    if (isAtMetalPlace) await presenceRepository.setMetalPlaceStatus(userId, false);
    if (isCamping) await presenceRepository.setCampingStatus(userId, false);
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
