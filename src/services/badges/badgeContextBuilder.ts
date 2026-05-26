import type { User as AuthUser } from '@supabase/supabase-js';
import type { Band, CrewUser, UserPick, UserPresence } from '../../types';
import {
  crewLocationCountsFromGroups,
  deriveUserBadgeLocation,
  groupCrewLivePlans,
  mapCrewLivePlans,
} from '../livePreview';
import { now } from '../time';
import { getWeakSkipCount } from '../weakSkipMetadata';
import { buildBadgeContext } from './engine';
import type { BadgeBand, BadgeContext } from './types';
import { mergedPersistedBadgeSlugs } from './persistMetadata';

export const EMPTY_BADGE_CONTEXT: BadgeContext = {
  wacken_years: [],
  country: null,
  wacken_arrival_day: null,
  assignedBadges: [],
  bandsPicked: 0,
  maxAttendanceInPicks: 0,
  pickedBands: [],
  seenBands: [],
  missedBandIds: new Set(),
  locationVisits: {},
  weakSkipCount: 0,
  currentLocation: null,
  crewLocationCounts: {},
  achievedBadgeSlugs: new Set(),
};

export type BadgeIdbSnapshot = {
  userPicks: { band_id: string }[];
  allPicks: UserPick[];
  bands: Band[];
  allMissed: { user_id: string; band_id: string }[];
  presence: UserPresence[];
  crewUsers: CrewUser[];
  assignedBadges: string[];
  isCurrentUserFriend: boolean;
  metalPlaceWindowActive: boolean;
  liveTestBandId?: string | null;
};

export function buildBadgeContextFromSnapshot(
  snap: BadgeIdbSnapshot,
  userId: string,
  authUser: AuthUser,
): BadgeContext {
  const {
    userPicks,
    allPicks,
    bands,
    allMissed,
    assignedBadges,
    isCurrentUserFriend,
    presence,
    crewUsers,
    metalPlaceWindowActive,
    liveTestBandId,
  } = snap;
  const userPickBandIds = userPicks.map((p) => p.band_id);
  const allPickCounts = new Map<string, number>();
  allPicks.forEach((p) =>
    allPickCounts.set(p.band_id, (allPickCounts.get(p.band_id) ?? 0) + 1),
  );
  const bandsById = new Map<string, BadgeBand>(
    bands.map((b) => [b.id, b]),
  );
  const userMissedIds = new Set(
    allMissed.filter((m) => m.user_id === userId).map((m) => m.band_id),
  );

  const currentNow = now();
  const crewPlans = mapCrewLivePlans(
    bands,
    allPicks,
    crewUsers,
    presence,
    currentNow,
    liveTestBandId ?? null,
  );
  const crewGroups = groupCrewLivePlans(crewPlans, { metalPlaceWindowActive });
  const currentLocation = deriveUserBadgeLocation(userId, crewGroups, isCurrentUserFriend);
  const crewLocationCounts = crewLocationCountsFromGroups(crewGroups);

  const locationVisits = (authUser.user_metadata?.location_visits as Record<string, number>) ?? {};
  const weakSkipCount = getWeakSkipCount(authUser.user_metadata);
  const achievedBadgeSlugs = mergedPersistedBadgeSlugs(authUser.user_metadata);

  return buildBadgeContext(
    authUser,
    userPickBandIds,
    allPickCounts,
    bandsById,
    userMissedIds,
    currentNow,
    assignedBadges,
    locationVisits,
    currentLocation,
    crewLocationCounts,
    achievedBadgeSlugs,
    weakSkipCount,
  );
}
