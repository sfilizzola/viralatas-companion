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
  | { type: 'band_seen_named'; name: string }
  // Arrival day: earned when arrival day sorts before condition.day
  | { type: 'wacken_arrived_before'; day: string }
  // Location visit count: earned when user has toggled into a location N+ times
  | { type: 'location_visit_count_min'; location: 'camping' | 'metal_place' | 'lost'; count: number }
  // Crew at location: earned when user is at a location AND N+ crew are there; permanent once earned
  | { type: 'crew_at_location_min'; location: 'camping' | 'lost'; count: number }
  // Time-based: count bands whose CEST start_time >= hour (symmetric to `before` variants)
  | { type: 'bands_picked_after_hour_min'; hour: number; count: number }
  | { type: 'bands_seen_after_hour_min'; hour: number; count: number }
  // Assigned: godlike manually assigns this badge slug via the assign-badge Edge Function
  | { type: 'assigned' };

export type BadgeConfig = {
  slug: string;
  imagePath: string;
  labelKey: string;
  descriptionKey: string;
  condition: BadgeCondition;
  year?: number; // Historical Wacken year chip (e.g. 2025 → "'25"). Omit for non-historical badges.
  // When true, the slug is stored permanently in user_metadata.achieved_badge_slugs the first time
  // this badge is earned. Future loads show the badge even if the underlying condition no longer holds
  // (e.g. user removes picks, changes location, crew count drops).
  // Leave unset/false for conditional badges that reflect current state (country, active picks, etc.)
  persist?: boolean;
};

export type BadgeContext = {
  wacken_years: number[];
  country: string | null;
  wacken_arrival_day: string | null;
  assignedBadges: string[];
  bandsPicked: number;
  maxAttendanceInPicks: number;
  pickedBands: BadgeBand[];
  seenBands: BadgeBand[];
  missedBandIds: Set<string>;
  locationVisits: Record<string, number>;
  currentLocation: string | null;
  crewLocationCounts: Record<string, number>;
  achievedBadgeSlugs: Set<string>; // persist:true badges already recorded in user_metadata
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
  assignedBadges: string[] = [],
  locationVisits: Record<string, number> = {},
  currentLocation: string | null = null,
  crewLocationCounts: Record<string, number> = {},
  achievedBadgeSlugs: Set<string> = new Set(),
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
    wacken_arrival_day: (meta?.['wacken_arrival_day'] as string | undefined) ?? null,
    assignedBadges,
    bandsPicked: userPickBandIds.length,
    maxAttendanceInPicks: maxAttendance,
    pickedBands,
    seenBands,
    missedBandIds,
    locationVisits,
    currentLocation,
    crewLocationCounts,
    achievedBadgeSlugs,
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
    case 'wacken_arrived_before': {
      if (!ctx.wacken_arrival_day) return false;
      const arrivalDayOrder = ['sun-jul26', 'mon-jul27', 'tue-jul28', 'wed-jul29', 'thu-plus'];
      const userIndex = arrivalDayOrder.indexOf(ctx.wacken_arrival_day);
      const conditionIndex = arrivalDayOrder.indexOf(condition.day);
      return userIndex >= 0 && userIndex < conditionIndex;
    }
    case 'location_visit_count_min':
      return (ctx.locationVisits[condition.location] ?? 0) >= condition.count;
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
    case 'assigned':
      return ctx.assignedBadges.includes(badge.slug);
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
    imagePath: '/badges/badge_5-years.png',
    labelKey: 'badge5Wackens',
    descriptionKey: 'badge5WackensDescription',
    condition: { type: 'wacken_years_count_min', count: 5 },
  },
  {
    slug: '10-wackens',
    imagePath: '/badges/badge_10-years.png',
    labelKey: 'badge10Wackens',
    descriptionKey: 'badge10WackensDescription',
    condition: { type: 'wacken_years_count_min', count: 10 },
  },
  {
    slug: 'early-bird',
    imagePath: '/badges/badge_early-bird.png',
    labelKey: 'badgeEarlyBird',
    descriptionKey: 'badgeEarlyBirdDescription',
    condition: { type: 'bands_seen_before_hour_min', hour: 13, count: 5 },
    year: 2026,
  },
  // Joke badges — assigned manually by godlike via the assign-badge Edge Function
  {
    slug: 'death-metal',
    imagePath: '/badges/badge_death-metal.png',
    labelKey: 'badgeDeathMetal',
    descriptionKey: 'badgeDeathMetalDescription',
    condition: { type: 'bands_seen_genre_min', genre: 'Death Metal', count: 3 },
    year: 2026,
  },
  {
    slug: 'power-metal',
    imagePath: '/badges/badge_power-metal.png',
    labelKey: 'badgePowerMetal',
    descriptionKey: 'badgePowerMetalDescription',
    condition: { type: 'bands_seen_genre_min', genre: 'Power Metal', count: 3 },
    year: 2026,
  },
  {
    slug: 'alestorm',
    imagePath: '/badges/badge_alestorm.png',
    labelKey: 'badgeAlestorm',
    descriptionKey: 'badgeAlestormDescription',
    condition: { type: 'band_seen_named', name: 'Alestorm' },
    year: 2026,
  },
  {
    slug: 'mosh-pit',
    imagePath: '/badges/badge_mosh-pit.png',
    labelKey: 'badgeMoshPit',
    descriptionKey: 'badgeMoshPitDescription',
    condition: { type: 'assigned' },
    year: 2026,
  },
  {
    slug: 'crowdsurfer',
    imagePath: '/badges/badge_crowdsurfer.png',
    labelKey: 'badgeCrowdsurfer',
    descriptionKey: 'badgeCrowdsurferDescription',
    condition: { type: 'assigned' },
    year: 2026,
  },
  {
    slug: 'party-metal',
    imagePath: '/badges/badge_party-metal.png',
    labelKey: 'badgePartyMetal',
    descriptionKey: 'badgePartyMetalDescription',
    condition: { type: 'bands_seen_genre_min', genre: 'Party Metal', count: 2 },
    year: 2026,
  },
  // Joke badges — assigned manually by godlike via the assign-badge Edge Function
  {
    slug: 'girl-power',
    imagePath: '/badges/badge_girl-power.png',
    labelKey: 'badgeGirlPower',
    descriptionKey: 'badgeGirlPowerDescription',
    condition: { type: 'assigned' },
    year: 2026,
  },
  {
    slug: 'nutella',
    imagePath: '/badges/badge_nutella.png',
    labelKey: 'badgeNutella',
    descriptionKey: 'badgeNutellaDescription',
    condition: { type: 'assigned' },
  },
  // Location visit count badges
  {
    slug: 'metal-place-2026',
    imagePath: '/badges/badge_metal-place26.png',
    labelKey: 'badgeMetalPlace2026',
    descriptionKey: 'badgeMetalPlace2026Description',
    condition: { type: 'location_visit_count_min', location: 'metal_place', count: 1 },
    year: 2026,
    persist: true,
  },
  // Crew at location badges
  {
    slug: 'bbq-crew',
    imagePath: '/badges/badge_bbq.png',
    labelKey: 'badgeBbqCrew',
    descriptionKey: 'badgeBbqCrewDescription',
    condition: { type: 'crew_at_location_min', location: 'camping', count: 15 },
    year: 2026,
    persist: true,
  },
  {
    slug: 'lost-together',
    imagePath: '/badges/badge_lost_together.png',
    labelKey: 'badgeLostTogether',
    descriptionKey: 'badgeLostTogetherDescription',
    condition: { type: 'crew_at_location_min', location: 'lost', count: 5 },
    year: 2026,
    persist: true,
  },
];

// ─── CONDITION EXAMPLES ───────────────────────────────────────────────────────
// Reference for all available condition types. Copy any example into BADGES[] above.
// Add `persist: true` when the badge should be recorded permanently once earned —
// the user's profile retains it even if the underlying data later changes.
// Omit `persist` (or set false) for badges that reflect live/current state.
//
// ── WACKEN HISTORY ────────────────────────────────────────────────────────────
//
// wacken_years_exactly
//   User attended ONLY the listed years (no other editions allowed).
//   Example: first-timer badge, cannot have any prior year
//   { slug: 'first-timer', condition: { type: 'wacken_years_exactly', years: [2026] } }
//
// wacken_years_includes
//   User attended ALL listed years (may have attended others too).
//   Example: survived both notorious mud years
//   { slug: 'mud-survivor', condition: { type: 'wacken_years_includes', years: [2023, 2025] } }
//
// wacken_years_count_min
//   User has attended at least N editions total.
//   Example: veteran after 5+ Wackens
//   { slug: 'veteran', condition: { type: 'wacken_years_count_min', count: 5 } }
//
// wacken_attended_in_year
//   User attended a specific edition — useful for anniversary badges.
//   Example: 10-year anniversary for those who were at Wacken 2016
//   { slug: 'decade-club', condition: { type: 'wacken_attended_in_year', year: 2016 } }
//
// ── PROFILE ATTRIBUTES ────────────────────────────────────────────────────────
//
// country_is
//   User's registered country matches the given ISO code.
//   Example: Brazilian flag badge
//   { slug: 'pais-tropical', condition: { type: 'country_is', country: 'br' } }
//
// ── ARRIVAL ───────────────────────────────────────────────────────────────────
//
// wacken_arrived_before
//   User's arrival day sorts before the given day in the camping-open order:
//   sun-jul26 → mon-jul27 → tue-jul28 → wed-jul29 → thu-plus
//   Example: arrived Sunday or Monday (before Tuesday)
//   { slug: 'early-bird', condition: { type: 'wacken_arrived_before', day: 'tue-jul28' } }
//
// ── BAND PICKS ────────────────────────────────────────────────────────────────
//
// bands_picked_min
//   User has picked at least N bands in total.
//   Example: picked 10 bands
//   { slug: 'collector', condition: { type: 'bands_picked_min', count: 10 } }
//
// band_attendance_min
//   At least one of the user's picks has N+ crew also attending it.
//   Example: share a pick with 10+ crew members
//   { slug: 'pack-member', condition: { type: 'band_attendance_min', count: 10 } }
//
// bands_picked_genre_min
//   User picked N+ bands in a specific genre. Genre must match exactly.
//   Example: dedicated thrash fan with 5+ thrash picks
//   { slug: 'thrasher', condition: { type: 'bands_picked_genre_min', genre: 'Thrash Metal', count: 5 } }
//
// bands_picked_stage_min
//   User picked N+ bands on a specific stage. Stage name must match exactly.
//   Example: loyal Faster stage follower
//   { slug: 'faster-fanatic', condition: { type: 'bands_picked_stage_min', stage: 'Faster', count: 8 } }
//
// bands_picked_before_hour_min
//   User picked N+ bands whose CEST start time is before the given hour (0–23).
//   Example: morning warrior — 3+ bands starting before 14:00 CEST
//   { slug: 'morning-warrior', condition: { type: 'bands_picked_before_hour_min', hour: 14, count: 3 } }
//
// bands_picked_after_hour_min
//   User picked N+ bands whose CEST start time is at or after the given hour.
//   Example: night owl — 3+ bands starting at or after 22:00 CEST
//   { slug: 'night-owl', condition: { type: 'bands_picked_after_hour_min', hour: 22, count: 3 } }
//
// band_picked_named
//   User picked a band with this exact name (case-sensitive).
//   Example: picked the headliner
//   { slug: 'headliner-fan', condition: { type: 'band_picked_named', name: 'Rammstein' } }
//
// ── BANDS SEEN (POST-END_TIME, MINUS OPT-OUTS) ───────────────────────────────
//
// bands_seen_min
//   User is credited with having seen at least N bands (pick ended, not opted out via "didn't see").
//   Example: saw 5 or more bands
//   { slug: 'spectator', condition: { type: 'bands_seen_min', count: 5 } }
//
// bands_seen_genre_min
//   Seen N+ bands in a specific genre.
//   Example: confirmed death metal fan
//   { slug: 'death-head', condition: { type: 'bands_seen_genre_min', genre: 'Death Metal', count: 3 } }
//
// bands_seen_stage_min
//   Seen N+ bands on a specific stage.
//   Example: Headbangers devotee
//   { slug: 'headbangers-regular', condition: { type: 'bands_seen_stage_min', stage: 'Headbangers', count: 4 } }
//
// bands_seen_before_hour_min
//   Seen N+ bands whose CEST start time is before the given hour.
//   Example: 2+ early-afternoon bands seen
//   { slug: 'early-doors', condition: { type: 'bands_seen_before_hour_min', hour: 14, count: 2 } }
//
// bands_seen_after_hour_min
//   Seen N+ bands whose CEST start time is at or after the given hour.
//   Example: survived until after midnight (2+ bands)
//   { slug: 'midnight-survivor', condition: { type: 'bands_seen_after_hour_min', hour: 23, count: 2 } }
//
// band_seen_named
//   User is credited with seeing a specific band (exact name match).
//   Example: saw the legendary headliner
//   { slug: 'rammstein-witness', condition: { type: 'band_seen_named', name: 'Rammstein' } }
//
// ── LOCATION PRESENCE ─────────────────────────────────────────────────────────
//
// location_visit_count_min
//   Badge earned when user has checked into a location at least N times.
//   The counter persists in user_metadata.location_visits — permanent.
//   Locations: 'camping' | 'metal_place' | 'lost'
//   Example: visited Metal Place at least once
//   { slug: 'metal-place-2026', condition: { type: 'location_visit_count_min', location: 'metal_place', count: 1 } }
//   Example: camped at least 3 separate times during the festival
//   { slug: 'tent-rat', condition: { type: 'location_visit_count_min', location: 'camping', count: 3 } }
//
// crew_at_location_min
//   Earned when user is at a location AND N+ crew members are there at the same time.
//   Permanent once earned (slug stored in user_metadata.crew_earned_badge_slugs).
//   Locations: 'camping' | 'lost'
//   Example: 10+ crew in camping simultaneously
//   { slug: 'camping-mob', condition: { type: 'crew_at_location_min', location: 'camping', count: 10 } }
//   Example: 5+ lost souls at once
//   { slug: 'lost-together', condition: { type: 'crew_at_location_min', location: 'lost', count: 5 } }
//
// ── ASSIGNED (GODLIKE ONLY) ───────────────────────────────────────────────────
//
// assigned
//   Badge has no automatic condition — godlike assigns it manually via the assign-badge Edge Function.
//   The badge slug must appear in the user's users.special_badges array.
//   Example: honorary inside-joke badge
//   { slug: 'cao-caramelo', condition: { type: 'assigned' } }
//
// ─────────────────────────────────────────────────────────────────────────────

export function getEarnedBadges(ctx: BadgeContext): BadgeConfig[] {
  return BADGES.filter((badge) => evaluateBadge(badge, ctx));
}
