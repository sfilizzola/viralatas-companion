import { useMemo } from 'react';
import type { CrewUser, UserPick, UserPresence } from '../types';
import {
  derivePresenceValue,
  findLivePlan,
  resolveFocusUserLivePlan,
  type CrewLiveGroup,
  type CrewLivePlan,
  type LivePlan,
  type PresenceLocation,
} from '../services/livePreview';
import type { SocialSnapshot } from '../services/socialSnapshot';
import type { Festival } from '../types/festival';
import type { TimedBand } from '../services/timedBand';

const DUCK_WINDOW_MS = 15 * 60 * 1000;

type UseNowPlansParams = {
  social: SocialSnapshot;
  bands: TimedBand[];
  picks: UserPick[];
  crewUsers: CrewUser[];
  presence: UserPresence[];
  userId: string | null;
  userDisplayName: string | null;
  now: Date;
  festival: Festival | null | undefined;
};

export type NowPlans = {
  isMetalPlaceWindowActive: boolean;
  liveTestBandId: string | null;
  liveTestBand: TimedBand | null;
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
  social,
  bands,
  picks,
  crewUsers,
  presence,
  userId,
  now,
  festival,
}: UseNowPlansParams): NowPlans {
  const isMetalPlaceWindowActive = social.metalPlaceWindowActive;
  const liveTestBandId = social.liveTestBandId;

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
      festival,
      liveTestBandId,
    );
  }, [bands, picks, userId, now, festival, liveTestBandId]);

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

  const crewPlans = social.crewPlans;
  const crewGroups = social.crewGroups;

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
