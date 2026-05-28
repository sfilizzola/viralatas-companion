import type { User as AuthUser } from '@supabase/supabase-js';
import type { BadgeBand, BadgeConfig, BadgeContext } from './types';
import { BADGES } from './registry';

// Festival-local (CEST = UTC+2) hour for `bands_picked_before_hour_min`.
// Wacken runs late-July / early-August so Berlin is always on CEST; the simple
// offset matches `bandTime.ts` and avoids dragging in `Intl.DateTimeFormat`.
function festivalLocalHour(startIso: string): number {
  const d = new Date(startIso);
  const cest = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  return cest.getUTCHours();
}

export function buildBadgeContext(
  user: AuthUser,
  userPickBandIds: string[],
  allPickCounts: Map<string, number>,
  bandsById: Map<string, BadgeBand>,
  missedBandIds: Set<string> = new Set(),
  now: Date = new Date(),
  assignedBadges: string[] = [],
  locationVisits: Record<string, number> = {},
  currentLocation: string | null = null,
  crewLocationCounts: Record<string, number> = {},
  achievedBadgeSlugs: Set<string> = new Set(),
  weakSkipCount: number = 0,
): BadgeContext {
  const meta = user.user_metadata;
  const maxAttendance = userPickBandIds.reduce(
    (max, bandId) => Math.max(max, allPickCounts.get(bandId) ?? 0),
    0,
  );
  const pickedBands = userPickBandIds
    .map((id) => bandsById.get(id))
    .filter((b): b is BadgeBand => b !== undefined && b.category !== 'ceremony');
  const seenBands = pickedBands.filter(
    (b) => new Date(b.end_time) < now && !missedBandIds.has(b.id),
  );
  return {
    wacken_years: Array.isArray(meta?.['wacken_years']) ? (meta['wacken_years'] as number[]) : [],
    country: (meta?.['country'] as string | undefined) ?? null,
    wacken_arrival_day: (meta?.['wacken_arrival_day'] as string | undefined) ?? null,
    assignedBadges,
    bandsPicked: userPickBandIds.length,
    maxAttendanceInPicks: maxAttendance,
    pickedBands,
    seenBands,
    missedBandIds,
    locationVisits,
    weakSkipCount,
    currentLocation,
    crewLocationCounts,
    achievedBadgeSlugs,
    userRatingsByBandId: new Map(),
    ratingAggregates: {},
    bandsRatedCount: 0,
    userRatingAvg: null,
    ratedPctOfSeen: 0,
  };
}

export function evaluateBadge(badge: BadgeConfig, ctx: BadgeContext): boolean {
  // Persist badges: once recorded in the user's profile, always shown regardless of current state.
  if (badge.persist && ctx.achievedBadgeSlugs.has(badge.slug)) return true;

  const { condition } = badge;
  switch (condition.type) {
    case 'wacken_years_exactly':
      return (
        ctx.wacken_years.length === condition.years.length &&
        condition.years.every((y) => ctx.wacken_years.includes(y))
      );
    case 'wacken_years_includes':
      return condition.years.every((y) => ctx.wacken_years.includes(y));
    case 'wacken_years_count_min':
      return ctx.wacken_years.length >= condition.count;
    case 'wacken_attended_in_year':
      return ctx.wacken_years.includes(condition.year);
    case 'country_is':
      return ctx.country === condition.country;
    case 'bands_picked_min':
      return ctx.pickedBands.length >= condition.count;
    case 'band_attendance_min':
      return ctx.maxAttendanceInPicks >= condition.count;
    case 'bands_picked_genre_min':
      return ctx.pickedBands.filter((b) => b.genre === condition.genre).length >= condition.count;
    case 'bands_picked_stage_min':
      return ctx.pickedBands.filter((b) => b.stage === condition.stage).length >= condition.count;
    case 'bands_picked_stages_min': {
      const set = new Set(condition.stages);
      return ctx.pickedBands.filter((b) => set.has(b.stage)).length >= condition.count;
    }
    case 'bands_picked_genres_min': {
      const set = new Set(condition.genres);
      return (
        ctx.pickedBands.filter((b) => b.genre != null && set.has(b.genre)).length >=
        condition.count
      );
    }
    case 'bands_picked_before_hour_min':
      return (
        ctx.pickedBands.filter((b) => festivalLocalHour(b.start_time) < condition.hour).length >=
        condition.count
      );
    case 'band_picked_named':
      return ctx.pickedBands.some((b) => b.name === condition.name);
    case 'bands_seen_min':
      return ctx.seenBands.length >= condition.count;
    case 'bands_seen_genre_min':
      return ctx.seenBands.filter((b) => b.genre === condition.genre).length >= condition.count;
    case 'bands_seen_stage_min':
      return ctx.seenBands.filter((b) => b.stage === condition.stage).length >= condition.count;
    case 'bands_seen_stages_min': {
      const set = new Set(condition.stages);
      return ctx.seenBands.filter((b) => set.has(b.stage)).length >= condition.count;
    }
    case 'bands_seen_genres_min': {
      const set = new Set(condition.genres);
      return (
        ctx.seenBands.filter((b) => b.genre != null && set.has(b.genre)).length >= condition.count
      );
    }
    case 'bands_seen_before_hour_min':
      return (
        ctx.seenBands.filter((b) => festivalLocalHour(b.start_time) < condition.hour).length >=
        condition.count
      );
    case 'band_seen_named':
      return ctx.seenBands.some((b) => b.name === condition.name);
    case 'wacken_arrived_before': {
      if (!ctx.wacken_arrival_day) return false;
      const arrivalDayOrder = ['sun-jul26', 'mon-jul27', 'tue-jul28', 'wed-jul29', 'thu-plus'];
      const userIndex = arrivalDayOrder.indexOf(ctx.wacken_arrival_day);
      const conditionIndex = arrivalDayOrder.indexOf(condition.day);
      return userIndex >= 0 && userIndex < conditionIndex;
    }
    case 'wacken_arrived_on':
      return ctx.wacken_arrival_day === condition.day;
    case 'location_visit_count_min':
      return (ctx.locationVisits[condition.location] ?? 0) >= condition.count;
    case 'weak_skips_min':
      return ctx.weakSkipCount >= condition.count;
    case 'crew_at_location_min':
      return (
        ctx.currentLocation === condition.location &&
        (ctx.crewLocationCounts[condition.location] ?? 0) >= condition.count
      );
    case 'bands_picked_after_hour_min':
      return (
        ctx.pickedBands.filter((b) => festivalLocalHour(b.start_time) >= condition.hour).length >=
        condition.count
      );
    case 'bands_seen_after_hour_min':
      return (
        ctx.seenBands.filter((b) => festivalLocalHour(b.start_time) >= condition.hour).length >=
        condition.count
      );
    case 'stage_diversity_min': {
      const distinctStages = new Set(ctx.seenBands.map((b) => b.stage));
      return distinctStages.size >= condition.count;
    }
    case 'assigned':
      return ctx.assignedBadges.includes(badge.slug);
    case 'bands_rated_min':
      return ctx.bandsRatedCount >= condition.count;
    case 'band_rated_score_min': {
      for (const band of ctx.seenBands) {
        const score = ctx.userRatingsByBandId.get(band.id);
        if (score === undefined || score < condition.score) continue;
        if (condition.name !== undefined && band.name !== condition.name) continue;
        if (condition.stage !== undefined && band.stage !== condition.stage) continue;
        if (condition.genre !== undefined && band.genre !== condition.genre) continue;
        return true;
      }
      return false;
    }
    case 'crew_avg_on_picked_band_min': {
      const minRaters = condition.minRaters ?? 1;
      for (const band of ctx.seenBands) {
        const aggregate = ctx.ratingAggregates[band.id];
        if (!aggregate || aggregate.count < minRaters) continue;
        if (aggregate.avg >= condition.avg) return true;
      }
      return false;
    }
    case 'user_rating_avg_min':
      return (
        ctx.bandsRatedCount >= condition.minRatings &&
        ctx.userRatingAvg !== null &&
        ctx.userRatingAvg >= condition.avg
      );
    case 'user_rating_avg_max':
      return (
        ctx.bandsRatedCount >= condition.minRatings &&
        ctx.userRatingAvg !== null &&
        ctx.userRatingAvg <= condition.avg
      );
    case 'bands_rated_pct_of_seen_min': {
      const seenCount = ctx.seenBands.length;
      if (seenCount === 0) return false;
      return (ctx.bandsRatedCount * 100) / seenCount >= condition.pct;
    }
  }
}

export function getEarnedBadges(ctx: BadgeContext): BadgeConfig[] {
  return BADGES.filter((badge) => evaluateBadge(badge, ctx));
}
