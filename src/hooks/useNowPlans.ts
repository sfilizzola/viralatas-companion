import { useMemo } from 'react';
import type { Band, CrewUser, LiveBandTestConfig, MetalPlaceConfig, UserPick, UserPresence } from '../types';
import {
  derivePresenceValue,
  findLivePlan,
  groupCrewLivePlans,
  mapCrewLivePlans,
  resolveFocusUserLivePlan,
  resolveLiveTestBandId,
  type CrewLiveGroup,
  type CrewLivePlan,
  type LivePlan,
  type PresenceLocation,
} from '../services/livePreview';
import { presenceRepository } from '../repositories';

const DUCK_WINDOW_MS = 15 * 60 * 1000;

type UseNowPlansParams = {
  bands: Band[];
  picks: UserPick[];
  crewUsers: CrewUser[];
  presence: UserPresence[];
  userId: string | null;
  userDisplayName: string | null;
  now: Date;
  metalPlaceConfig: MetalPlaceConfig | null;
  liveBandTestConfig: LiveBandTestConfig | null;
};

export type NowPlans = {
  isMetalPlaceWindowActive: boolean;
  liveTestBandId: string | null;
  liveTestBand: Band | null;
  myRawPlan: LivePlan;
  myPresence: UserPresence | undefined;
  isFriend: boolean;
  isCamping: boolean;
  isAtMetalPlace: boolean;
  presenceValue: PresenceLocation;
  myPlan: LivePlan;
  crewPlans: CrewLivePlan[];
  crewGroups: CrewLiveGroup[];
  duckBandId: string | null;
};

export function useNowPlans({
  bands,
  picks,
  crewUsers,
  presence,
  userId,
  userDisplayName,
  now,
  metalPlaceConfig,
  liveBandTestConfig,
}: UseNowPlansParams): NowPlans {
  const isMetalPlaceWindowActive = useMemo(
    () => presenceRepository.isTimeWithinMetalPlaceWindow(metalPlaceConfig, now),
    [metalPlaceConfig, now],
  );

  const liveTestBandId = useMemo(
    () => resolveLiveTestBandId(liveBandTestConfig),
    [liveBandTestConfig],
  );

  const liveTestBand = useMemo(
    () => (liveTestBandId ? bands.find((b) => b.id === liveTestBandId) ?? null : null),
    [bands, liveTestBandId],
  );

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

  const duckBandId = useMemo(() => {
    if (myPlan.status !== 'current' || !myPlan.band) return null;
    if (myPlan.band.category === 'ceremony') return null;
    if (now.getTime() >= new Date(myPlan.band.start_time).getTime() + DUCK_WINDOW_MS) return null;
    return myPlan.band.id;
  }, [myPlan, now]);

  return {
    isMetalPlaceWindowActive,
    liveTestBandId,
    liveTestBand,
    myRawPlan,
    myPresence,
    isFriend,
    isCamping,
    isAtMetalPlace,
    presenceValue,
    myPlan,
    crewPlans,
    crewGroups,
    duckBandId,
  };
}
