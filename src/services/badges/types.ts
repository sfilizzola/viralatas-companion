import type { Band } from '../../types';
import type { BandRatingAggregate } from '../bandRatings';

export type BadgeBand = Pick<Band, 'id' | 'name' | 'stage' | 'start_time' | 'end_time' | 'genre' | 'category'>;

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
  // Plural-form set-membership variants (Idea 6): a pick counts if its stage/genre
  // is included in the configured array; matches are OR-combined within the array.
  | { type: 'bands_picked_stages_min'; stages: string[]; count: number }
  | { type: 'bands_picked_genres_min'; genres: string[]; count: number }
  // `hour` is festival-local (CEST, +02:00); raw CEST hour < threshold
  | { type: 'bands_picked_before_hour_min'; hour: number; count: number }
  | { type: 'band_picked_named'; name: string }
  // Seen-based conditions (Phase 10b): picks credited after end_time, minus missed opt-outs
  | { type: 'bands_seen_min'; count: number }
  | { type: 'bands_seen_genre_min'; genre: string; count: number }
  | { type: 'bands_seen_stage_min'; stage: string; count: number }
  // Plural-form set-membership variants (Idea 6) for seen bands
  | { type: 'bands_seen_stages_min'; stages: string[]; count: number }
  | { type: 'bands_seen_genres_min'; genres: string[]; count: number }
  | { type: 'bands_seen_before_hour_min'; hour: number; count: number }
  | { type: 'band_seen_named'; name: string }
  // Missed-based conditions: bands user explicitly marked as "didn't watch" (picked ∩ missedBandIds)
  | { type: 'bands_missed_min'; count: number }
  // Arrival day: earned when arrival day sorts before condition.day
  | { type: 'wacken_arrived_before'; day: string }
  // Arrival day: earned when arrival day matches condition.day exactly
  | { type: 'wacken_arrived_on'; day: string }
  // Location visit count: earned when user has toggled into a location N+ times
  | { type: 'location_visit_count_min'; location: 'camping' | 'metal_place' | 'lost'; count: number }
  // Committed weak skips on /now ("I am weak"): count from user_metadata.weak_skips_2026
  | { type: 'weak_skips_min'; count: number }
  // Crew at location: earned when user is at a location AND N+ crew are there; permanent once earned
  | { type: 'crew_at_location_min'; location: 'camping' | 'lost'; count: number }
  // Time-based: count bands whose CEST start_time >= hour (symmetric to `before` variants)
  | { type: 'bands_picked_after_hour_min'; hour: number; count: number }
  | { type: 'bands_seen_after_hour_min'; hour: number; count: number }
  // Stage diversity: earned when user has seen at least 1 band on N+ distinct stages
  | { type: 'stage_diversity_min'; count: number }
  // Assigned: godlike manually assigns this badge slug via the assign-badge Edge Function
  | { type: 'assigned' }
  // Rating predicates (Phase 34 — engine only; no registry entries yet)
  | { type: 'bands_rated_min'; count: number }
  | {
      type: 'band_rated_score_min';
      score: number;
      name?: string;
      stage?: string;
      genre?: string;
    }
  | { type: 'crew_avg_on_picked_band_min'; avg: number; minRaters?: number }
  | { type: 'user_rating_avg_min'; avg: number; minRatings: number }
  | { type: 'user_rating_avg_max'; avg: number; minRatings: number }
  | { type: 'bands_rated_pct_of_seen_min'; pct: number };

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
  missedBands: BadgeBand[];
  missedBandIds: Set<string>;
  locationVisits: Record<string, number>;
  weakSkipCount: number;
  currentLocation: string | null;
  crewLocationCounts: Record<string, number>;
  achievedBadgeSlugs: Set<string>; // persist:true badges already recorded in user_metadata
  userRatingsByBandId: Map<string, number>;
  ratingAggregates: Record<string, BandRatingAggregate>;
  bandsRatedCount: number;
  userRatingAvg: number | null;
  ratedPctOfSeen: number;
};
