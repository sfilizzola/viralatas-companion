import type { User as AuthUser } from '@supabase/supabase-js';
import type { Band } from '../types';

export type BadgeBand = Pick<Band, 'id' | 'name' | 'stage' | 'start_time' | 'end_time' | 'genre'>;

export type BadgeCondition =
  // Exclusive: user must have ONLY these years (checking 2022+2026 loses a "2026-only" badge)
  | { type: 'wacken_years_exactly'; years: number[] }
  // Permissive: user must have AT LEAST these years (other years don't disqualify)
  | { type: 'wacken_years_includes'; years: number[] }
  // Milestone: user has attended at least N Wackens total
  | { type: 'wacken_years_count_min'; count: number }
  // Anniversary: user attended in a specific year
  | { type: 'wacken_attended_in_year'; year: number }
  | { type: 'country_is'; country: string }
  | { type: 'bands_picked_min'; count: number }
  // True when at least one of the user's picks has N+ crew attending
  | { type: 'band_attendance_min'; count: number }
  // Picks-based characteristic conditions (Phase 10a)
  | { type: 'bands_picked_genre_min'; genre: string; count: number }
  | { type: 'bands_picked_stage_min'; stage: string; count: number }
  // `hour` is festival-local (CEST, +02:00); raw CEST hour < threshold
  | { type: 'bands_picked_before_hour_min'; hour: number; count: number }
  | { type: 'band_picked_named'; name: string }
  // Seen-based conditions (Phase 10b): picks credited after end_time, minus missed opt-outs
  | { type: 'bands_seen_min'; count: number }
  | { type: 'bands_seen_genre_min'; genre: string; count: number }
  | { type: 'bands_seen_stage_min'; stage: string; count: number }
  | { type: 'bands_seen_before_hour_min'; hour: number; count: number }
  | { type: 'band_seen_named'; name: string };

export type BadgeConfig = {
  slug: string;
  imagePath: string;
  labelKey: string;
  descriptionKey: string;
  condition: BadgeCondition;
  year?: number; // Historical Wacken year chip (e.g. 2025 → "'25"). Omit for non-historical badges.
};

export type BadgeContext = {
  wacken_years: number[];
  country: string | null;
  bandsPicked: number;
  maxAttendanceInPicks: number;
  pickedBands: BadgeBand[];
  seenBands: BadgeBand[];
  missedBandIds: Set<string>;
};

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
): BadgeContext {
  const meta = user.user_metadata;
  const maxAttendance = userPickBandIds.reduce(
    (max, bandId) => Math.max(max, allPickCounts.get(bandId) ?? 0),
    0,
  );
  const pickedBands = userPickBandIds
    .map((id) => bandsById.get(id))
    .filter((b): b is BadgeBand => b !== undefined);
  const seenBands = pickedBands.filter(
    (b) => new Date(b.end_time) < now && !missedBandIds.has(b.id),
  );
  return {
    wacken_years: Array.isArray(meta?.['wacken_years']) ? (meta['wacken_years'] as number[]) : [],
    country: (meta?.['country'] as string | undefined) ?? null,
    bandsPicked: userPickBandIds.length,
    maxAttendanceInPicks: maxAttendance,
    pickedBands,
    seenBands,
    missedBandIds,
  };
}

export function evaluateBadge(badge: BadgeConfig, ctx: BadgeContext): boolean {
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
      return ctx.bandsPicked >= condition.count;
    case 'band_attendance_min':
      return ctx.maxAttendanceInPicks >= condition.count;
    case 'bands_picked_genre_min':
      return ctx.pickedBands.filter((b) => b.genre === condition.genre).length >= condition.count;
    case 'bands_picked_stage_min':
      return ctx.pickedBands.filter((b) => b.stage === condition.stage).length >= condition.count;
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
    case 'bands_seen_before_hour_min':
      return (
        ctx.seenBands.filter((b) => festivalLocalHour(b.start_time) < condition.hour).length >=
        condition.count
      );
    case 'band_seen_named':
      return ctx.seenBands.some((b) => b.name === condition.name);
  }
}

// Badge image file specification:
// - Format: PNG (96×96 px recommended, displays at 40px on mobile)
// - Storage: public/badges/ directory
// - Naming: badge_{slug}.png (e.g., badge_new-puppy.png matches slug: 'new-puppy')
// - Accessibility: all images must have transparent backgrounds for dark theme compatibility
export const BADGES: BadgeConfig[] = [
  {
    slug: 'puppy',
    imagePath: '/badges/badge_new-puppy.png',
    labelKey: 'badgePuppy',
    descriptionKey: 'badgePuppyDescription',
    // Exclusive — only 2026 checked. Adding any other year removes this badge.
    condition: { type: 'wacken_years_exactly', years: [2026] },
  },
  {
    slug: 'pack-member',
    imagePath: '/badges/badge_vira-latas-pack.png',
    labelKey: 'badgePackMember',
    descriptionKey: 'badgePackMemberDescription',
    // Earned when you're attending a concert with 10+ crew members
    condition: { type: 'band_attendance_min', count: 10 },
  },
  {
    slug: 'pais-tropical',
    imagePath: '/badges/badge_br.png',
    labelKey: 'badgePaisTropical',
    descriptionKey: 'badgePaisTropicalDescription',
    condition: { type: 'country_is', country: 'br' },
  },
  {
    slug: 'deutscher',
    imagePath: '/badges/badge_de.png',
    labelKey: 'badgeDeutscher',
    descriptionKey: 'badgeDeutscherDescription',
    condition: { type: 'country_is', country: 'de' },
  },
  {
    slug: 'america-fuck-yeah',
    imagePath: '/badges/badge_usa.png',
    labelKey: 'badgeAmericaFuckYeah',
    descriptionKey: 'badgeAmericaFuckYeahDescription',
    condition: { type: 'country_is', country: 'us' },
  },
  {
    slug: 'belga',
    imagePath: '/badges/badge_be.png',
    labelKey: 'badgeBelga',
    descriptionKey: 'badgeBelgaDescription',
    condition: { type: 'country_is', country: 'be' },
  },
  {
    slug: 'cafetero',
    imagePath: '/badges/badge_co.png',
    labelKey: 'badgeCafetero',
    descriptionKey: 'badgeCafeteroDescription',
    condition: { type: 'country_is', country: 'co' },
  },
  {
    slug: 'og',
    imagePath: '/badges/badge_og.png',
    labelKey: 'badgeOG',
    descriptionKey: 'badgeOGDescription',
    // Original — founded the Vira-latas. Must have attended 2022 (founding year)
    condition: { type: 'wacken_years_includes', years: [2022] },
  },
  {
    slug: 'mud-survivor',
    imagePath: '/badges/badge_mud-warrior.png',
    labelKey: 'badgeMudSurvivor',
    descriptionKey: 'badgeMudSurvivorDescription',
    // Veteran who survived both 2023 and 2025 (may have attended other years too)
    condition: { type: 'wacken_years_includes', years: [2023, 2025] },
  },
  {
    slug: '5-wackens',
    imagePath: '/badges/badge_og.png',
    labelKey: 'badge5Wackens',
    descriptionKey: 'badge5WackensDescription',
    condition: { type: 'wacken_years_count_min', count: 5 },
  },
  {
    slug: 'anniversary-2016',
    imagePath: '/badges/badge_og.png',
    labelKey: 'badgeAnniversary2016',
    descriptionKey: 'badgeAnniversary2016Description',
    condition: { type: 'wacken_attended_in_year', year: 2016 },
    year: 2026,
  },
];

export function getEarnedBadges(ctx: BadgeContext): BadgeConfig[] {
  return BADGES.filter((badge) => evaluateBadge(badge, ctx));
}
