import type { User as AuthUser } from '@supabase/supabase-js';
import type { Band, CrewUser, LiveBandTestConfig, MetalPlaceConfig, UserPick, UserPresence, UserBandRating } from '../../types';
import {
  crewLocationCountsFromGroups,
  deriveUserBadgeLocation,
  groupCrewLivePlans,
} from '../livePreview';
import { buildSocialSnapshot, type SocialSnapshot } from '../socialSnapshot';
import { now } from '../time';
import { getWeakSkipCount } from '../weakSkipMetadata';
import { buildBadgeContext } from './engine';
import type { BadgeBand, BadgeContext } from './types';
import { mergedPersistedBadgeSlugs } from './persistMetadata';
import {
  buildRatingStatsInputFromPicks,
  buildRatingStatsSnapshot,
} from '../ratingStats';

export const EMPTY_BADGE_CONTEXT: BadgeContext = {
  wacken_years: [],
  country: null,
  wacken_arrival_day: null,
  assignedBadges: [],
  bandsPicked: 0,
  maxAttendanceInPicks: 0,
  pickedBands: [],
  seenBands: [],
  missedBands: [],
  missedBandIds: new Set(),
  locationVisits: {},
  weakSkipCount: 0,
  currentLocation: null,
  crewLocationCounts: {},
  achievedBadgeSlugs: new Set(),
  userRatingsByBandId: new Map(),
  ratingAggregates: {},
  bandsRatedCount: 0,
  userRatingAvg: null,
  ratedPctOfSeen: 0,
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
  metalPlaceConfig?: MetalPlaceConfig | null;
  liveBandTestConfig?: LiveBandTestConfig | null;
  ratings?: UserBandRating[];
};

function legacyLiveBandTestConfig(
  liveTestBandId: string | null | undefined,
  liveBandTestConfig: LiveBandTestConfig | null | undefined,
): LiveBandTestConfig | null {
  if (liveBandTestConfig !== undefined) return liveBandTestConfig ?? null;
  if (!liveTestBandId) return null;
  return { band_id: liveTestBandId, enabled: true };
}

function buildSocialSnapshotForBadgeSnap(
  snap: BadgeIdbSnapshot,
  currentNow: Date,
): SocialSnapshot {
  const social = buildSocialSnapshot({
    bands: snap.bands,
    picks: snap.allPicks,
    crewUsers: snap.crewUsers,
    presence: snap.presence,
    metalPlaceConfig: snap.metalPlaceConfig ?? null,
    liveBandTestConfig: legacyLiveBandTestConfig(
      snap.liveTestBandId,
      snap.liveBandTestConfig,
    ),
    now: currentNow,
  });

  if (
    snap.metalPlaceConfig === undefined &&
    snap.metalPlaceWindowActive !== social.metalPlaceWindowActive
  ) {
    const crewGroups = groupCrewLivePlans(social.crewPlans, {
      metalPlaceWindowActive: snap.metalPlaceWindowActive,
    });
    return {
      ...social,
      metalPlaceWindowActive: snap.metalPlaceWindowActive,
      crewGroups,
      crewLocationCounts: crewLocationCountsFromGroups(crewGroups),
    };
  }

  return social;
}

export function buildBadgeContextFromSocialSnapshot(
  snap: BadgeIdbSnapshot,
  social: SocialSnapshot,
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
  const currentLocation = deriveUserBadgeLocation(
    userId,
    social.crewGroups,
    isCurrentUserFriend,
  );
  const crewLocationCounts = social.crewLocationCounts;

  const locationVisits = (authUser.user_metadata?.location_visits as Record<string, number>) ?? {};
  const weakSkipCount = getWeakSkipCount(authUser.user_metadata);
  const achievedBadgeSlugs = mergedPersistedBadgeSlugs(authUser.user_metadata);

  const ctx = buildBadgeContext(
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

  return mergeRatingFields(ctx, snap, userId, currentNow);
}

function mergeRatingFields(
  ctx: BadgeContext,
  snap: BadgeIdbSnapshot,
  userId: string,
  currentNow: Date,
): BadgeContext {
  const ratings = snap.ratings ?? [];
  const ratingInput = buildRatingStatsInputFromPicks(
    ratings,
    snap.bands,
    userId,
    snap.userPicks.map((p) => p.band_id),
    snap.allPicks,
    new Set(snap.allMissed.filter((m) => m.user_id === userId).map((m) => m.band_id)),
    currentNow,
  );
  const ratingSnap = buildRatingStatsSnapshot(ratingInput);
  return {
    ...ctx,
    userRatingsByBandId: ratingSnap.userRatingsByBandId,
    ratingAggregates: ratingSnap.aggregates,
    bandsRatedCount: ratingSnap.bandsRatedCount,
    userRatingAvg: ratingSnap.userRatingAvg,
    ratedPctOfSeen: ratingSnap.ratedPctOfSeen,
  };
}

export function buildBadgeContextFromSnapshot(
  snap: BadgeIdbSnapshot,
  userId: string,
  authUser: AuthUser,
): BadgeContext {
  const social = buildSocialSnapshotForBadgeSnap(snap, now());
  return buildBadgeContextFromSocialSnapshot(snap, social, userId, authUser);
}
