import type { User as AuthUser } from '@supabase/supabase-js';
import { computeBandOverlaps } from '../hooks/useBandConflicts';
import type { Band } from '../types';
import {
  buildBadgeContextFromSnapshot,
  type BadgeIdbSnapshot,
} from './badges/badgeContextBuilder';
import { getEarnedBadges } from './badges/engine';
import { BADGES } from './badges/registry';
import type { BadgeBand } from './badges/types';

const ASSIGNABLE_BADGE_SLUGS = new Set(
  BADGES.filter((b) => b.condition.type === 'assigned').map((b) => b.slug),
);

function assignedBadgeSlugsFromMeta(assignedBadges: string[]): string[] {
  return assignedBadges.filter((slug) => ASSIGNABLE_BADGE_SLUGS.has(slug));
}
import { getWeakSkipCount } from './weakSkipMetadata';
import { now } from './time';

export type FestivalWrapPersonal = {
  bandsPicked: number;
  bandsSeen: number;
  bandsSkipped: number;
  topGenre: string | null;
  topStage: string | null;
  topStageVisitCount: number;
  stageDiversity: number;
  hardConflicts: number;
  softConflicts: number;
  weakSkips: number;
  badgesEarnedCount: number;
  earnedBadgeSlugs: string[];
  assignedBadgeSlugs: string[];
  maxCrewAtPick: number;
  locationVisitsTotal: number | null;
};

export type FestivalWrapCrew = {
  topBandName: string | null;
  topBandPickCount: number;
  activeViraLatas: number;
  pickTwinUserId: string | null;
  pickTwinDisplayName: string | null;
  pickTwinAvatarUrl: string | null;
  pickTwinOverlapPct: number | null;
  currentUserDisplayName: string | null;
  currentUserAvatarUrl: string | null;
};

export type FestivalWrapStats = {
  hasPicks: boolean;
  personal: FestivalWrapPersonal;
  crew: FestivalWrapCrew;
};

export const EMPTY_WRAP_STATS: FestivalWrapStats = {
  hasPicks: false,
  personal: {
    bandsPicked: 0,
    bandsSeen: 0,
    bandsSkipped: 0,
    topGenre: null,
    topStage: null,
    topStageVisitCount: 0,
    stageDiversity: 0,
    hardConflicts: 0,
    softConflicts: 0,
    weakSkips: 0,
    badgesEarnedCount: 0,
    earnedBadgeSlugs: [],
    assignedBadgeSlugs: [],
    maxCrewAtPick: 0,
    locationVisitsTotal: null,
  },
  crew: {
    topBandName: null,
    topBandPickCount: 0,
    activeViraLatas: 0,
    pickTwinUserId: null,
    pickTwinDisplayName: null,
    pickTwinAvatarUrl: null,
    pickTwinOverlapPct: null,
    currentUserDisplayName: null,
    currentUserAvatarUrl: null,
  },
};

function modeFromSeenBands(
  seenBands: BadgeBand[],
  key: 'genre' | 'stage',
): string | null {
  const counts = new Map<string, number>();
  for (const band of seenBands) {
    const value = key === 'genre' ? band.genre : band.stage;
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = name;
    } else if (count === bestCount && best !== null && name.localeCompare(best) < 0) {
      best = name;
    }
  }
  return best;
}

function countConflictPairs(pickedBands: Band[]): { hard: number; soft: number } {
  const overlaps = computeBandOverlaps(pickedBands);
  const seenHard = new Set<string>();
  const seenSoft = new Set<string>();

  for (const band of pickedBands) {
    for (const overlap of overlaps.get(band.id) ?? []) {
      const pairKey = [band.id, overlap.band.id].sort().join(':');
      if (overlap.severity === 'hard') {
        if (!seenHard.has(pairKey)) seenHard.add(pairKey);
      } else if (!seenSoft.has(pairKey)) {
        seenSoft.add(pairKey);
      }
    }
  }

  return { hard: seenHard.size, soft: seenSoft.size };
}

function computeCrewWrapStats(
  snap: BadgeIdbSnapshot,
  userId: string,
  authUser: AuthUser,
): FestivalWrapCrew {
  const { allPicks, bands, crewUsers } = snap;
  const allPickCounts = new Map<string, number>();
  for (const pick of allPicks) {
    allPickCounts.set(pick.band_id, (allPickCounts.get(pick.band_id) ?? 0) + 1);
  }

  const topBand = [...bands]
    .filter((b) => b.category !== 'ceremony' && (allPickCounts.get(b.id) ?? 0) > 0)
    .sort((a, b) => {
      const countDelta = (allPickCounts.get(b.id) ?? 0) - (allPickCounts.get(a.id) ?? 0);
      if (countDelta !== 0) return countDelta;
      return a.start_time.localeCompare(b.start_time);
    })[0] ?? null;

  const activeViraLatas = new Set(allPicks.map((p) => p.user_id)).size;

  const myPickIds = new Set(
    allPicks.filter((p) => p.user_id === userId).map((p) => p.band_id),
  );

  const picksByUser = new Map<string, Set<string>>();
  for (const pick of allPicks) {
    if (!picksByUser.has(pick.user_id)) picksByUser.set(pick.user_id, new Set());
    picksByUser.get(pick.user_id)!.add(pick.band_id);
  }

  const displayNameById = new Map(
    crewUsers.map((u) => [u.id, u.display_name ?? u.id]),
  );
  const avatarById = new Map(crewUsers.map((u) => [u.id, u.avatar_url]));

  const metaDisplayName = authUser.user_metadata?.display_name;
  const metaAvatar = authUser.user_metadata?.avatar_url;
  const currentUserDisplayName =
    displayNameById.get(userId) ??
    (typeof metaDisplayName === 'string' ? metaDisplayName : null);
  const currentUserAvatarUrl =
    avatarById.get(userId) ??
    (typeof metaAvatar === 'string' ? metaAvatar : null);

  let pickTwinUserId: string | null = null;
  let pickTwinOverlapPct: number | null = null;

  if (myPickIds.size > 0) {
    let bestOverlap = -1;
    for (const [otherId, otherPicks] of picksByUser) {
      if (otherId === userId || otherPicks.size === 0) continue;
      const intersection = [...myPickIds].filter((id) => otherPicks.has(id)).length;
      const union = new Set([...myPickIds, ...otherPicks]).size;
      const pct = union === 0 ? 0 : Math.round((intersection / union) * 100);
      if (
        pct > bestOverlap ||
        (pct === bestOverlap &&
          pickTwinUserId !== null &&
          (displayNameById.get(otherId) ?? otherId).localeCompare(
            displayNameById.get(pickTwinUserId) ?? pickTwinUserId,
          ) < 0)
      ) {
        bestOverlap = pct;
        pickTwinUserId = otherId;
        pickTwinOverlapPct = pct;
      }
    }
  }

  return {
    topBandName: topBand?.name ?? null,
    topBandPickCount: topBand ? (allPickCounts.get(topBand.id) ?? 0) : 0,
    activeViraLatas,
    pickTwinUserId,
    pickTwinDisplayName: pickTwinUserId
      ? (displayNameById.get(pickTwinUserId) ?? pickTwinUserId)
      : null,
    pickTwinAvatarUrl: pickTwinUserId ? (avatarById.get(pickTwinUserId) ?? null) : null,
    pickTwinOverlapPct,
    currentUserDisplayName,
    currentUserAvatarUrl,
  };
}

export function buildFestivalWrapStats(
  snap: BadgeIdbSnapshot,
  userId: string,
  authUser: AuthUser,
): FestivalWrapStats {
  const ctx = buildBadgeContextFromSnapshot(snap, userId, authUser);

  if (ctx.bandsPicked === 0) {
    return {
      ...EMPTY_WRAP_STATS,
      crew: computeCrewWrapStats(snap, userId, authUser),
    };
  }

  const earned = getEarnedBadges(ctx);
  const { hard, soft } = countConflictPairs(ctx.pickedBands as Band[]);
  const weakSkips = getWeakSkipCount(authUser.user_metadata);

  const currentNow = now();
  const bandsSkipped = ctx.pickedBands.filter(
    (b) => new Date(b.end_time) < currentNow && ctx.missedBandIds.has(b.id),
  ).length;

  const stageDiversity = new Set(ctx.seenBands.map((b) => b.stage)).size;
  const topStage = modeFromSeenBands(ctx.seenBands, 'stage');
  const topStageVisitCount = topStage
    ? ctx.seenBands.filter((b) => b.stage === topStage).length
    : 0;
  const locationVisitsTotal = snap.isCurrentUserFriend
    ? null
    : Object.values(ctx.locationVisits).reduce((sum, n) => sum + n, 0);

  return {
    hasPicks: true,
    personal: {
      bandsPicked: ctx.pickedBands.length,
      bandsSeen: ctx.seenBands.length,
      bandsSkipped,
      topGenre: modeFromSeenBands(ctx.seenBands, 'genre'),
      topStage,
      topStageVisitCount,
      stageDiversity,
      hardConflicts: hard,
      softConflicts: soft,
      weakSkips,
      badgesEarnedCount: earned.length,
      earnedBadgeSlugs: earned.map((b) => b.slug),
      assignedBadgeSlugs: assignedBadgeSlugsFromMeta(ctx.assignedBadges),
      maxCrewAtPick: ctx.maxAttendanceInPicks,
      locationVisitsTotal,
    },
    crew: computeCrewWrapStats(snap, userId, authUser),
  };
}
