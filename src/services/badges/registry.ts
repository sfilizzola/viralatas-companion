import type { BadgeConfig } from './types';

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
    year: 2026,
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
  {
    slug: 'dreamer',
    imagePath: '/badges/badge_dreamer.png',
    labelKey: 'badgeDreamer',
    descriptionKey: 'badgeDreamerDescription',
    condition: { type: 'bands_picked_min', count: 30 },
    year: 2026,
    persist: true,
  },
  // Festival 2026 music badges
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
    slug: 'roots',
    imagePath: '/badges/badge_roots.png',
    labelKey: 'badgeRoots',
    descriptionKey: 'badgeRootsDescription',
    // Witnessed Sepultura's farewell show at Wacken 2026 (HAR6, Day 3, 19:00–20:30)
    condition: { type: 'band_seen_named', name: 'Sepultura' },
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
  {
    slug: 'denim-and-leather',
    imagePath: '/badges/badge_denim-and-leather.png',
    labelKey: 'badgeDenimAndLeather',
    descriptionKey: 'badgeDenimAndLeatherDescription',
    condition: { type: 'bands_seen_genre_min', genre: 'Heavy Metal', count: 4 },
    year: 2026,
  },
  {
    slug: 'kvlt',
    imagePath: '/badges/badge_kvlt.png',
    labelKey: 'badgeKvlt',
    descriptionKey: 'badgeKvltDescription',
    condition: { type: 'bands_seen_genre_min', genre: 'Black Metal', count: 4 },
    year: 2026,
  },
  {
    slug: 'wall-of-death',
    imagePath: '/badges/badge_wall-of-death.png',
    labelKey: 'badgeWallOfDeath',
    descriptionKey: 'badgeWallOfDeathDescription',
    condition: { type: 'bands_seen_genre_min', genre: 'Thrash Metal', count: 2 },
    year: 2026,
  },
  {
    slug: 'viking-fur',
    imagePath: '/badges/badge_viking-fur.png',
    labelKey: 'badgeVikingFur',
    descriptionKey: 'badgeVikingFurDescription',
    condition: { type: 'bands_seen_genre_min', genre: 'Folk Metal', count: 4 },
    year: 2026,
  },
  {
    slug: 'slow-and-low',
    imagePath: '/badges/badge_slow-and-low.png',
    labelKey: 'badgeSlowAndLow',
    descriptionKey: 'badgeSlowAndLowDescription',
    condition: { type: 'bands_seen_genre_min', genre: 'Doom Metal', count: 3 },
    year: 2026,
  },
  {
    slug: 'breakdown-believer',
    imagePath: '/badges/badge_breakdown-believer.png',
    labelKey: 'badgeBreakdownBeliever',
    descriptionKey: 'badgeBreakdownBelieverDescription',
    condition: { type: 'bands_seen_genre_min', genre: 'Metalcore', count: 2 },
    year: 2026,
  },
  {
    slug: 'dad-rock-respect',
    imagePath: '/badges/badge_dad-rock-respect.png',
    labelKey: 'badgeDadRockRespect',
    descriptionKey: 'badgeDadRockRespectDescription',
    condition: { type: 'bands_seen_genre_min', genre: 'Hard Rock', count: 3 },
    year: 2026,
  },
  {
    slug: 'pit-pup',
    imagePath: '/badges/badge_pit-pup.png',
    labelKey: 'badgePitPup',
    descriptionKey: 'badgePitPupDescription',
    condition: { type: 'bands_seen_genre_min', genre: 'Punk', count: 2 },
    year: 2026,
  },
  {
    slug: 'live-beast',
    imagePath: '/badges/badge_live-beast.png',
    labelKey: 'badgeLiveBeast',
    descriptionKey: 'badgeLiveBeastDescription',
    condition: { type: 'bands_seen_min', count: 22 },
    year: 2026,
  },
  // Joke badges — assigned manually by godlike via the assign-badge Edge Function
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
  {
    slug: 'melon',
    imagePath: '/badges/badge_melon.png',
    labelKey: 'badgeMelon',
    descriptionKey: 'badgeMelonDescription',
    condition: { type: 'assigned' },
  },
  {
    slug: 'bbq-king-2026',
    imagePath: '/badges/badge_bbq-king-26.png',
    labelKey: 'badgeBbqKing2026',
    descriptionKey: 'badgeBbqKing2026Description',
    condition: { type: 'assigned' },
    year: 2026,
  },
  {
    slug: 'jagger-king',
    imagePath: '/badges/badge_jagger-king.png',
    labelKey: 'badgeJaggerKing',
    descriptionKey: 'badgeJaggerKingDescription',
    condition: { type: 'assigned' },
    year: 2026,
  },
  {
    slug: 'total-kaput-2026',
    imagePath: '/badges/badge_total-kaput-26.png',
    labelKey: 'badgeTotalKaput2026',
    descriptionKey: 'badgeTotalKaput2026Description',
    condition: { type: 'assigned' },
    year: 2026,
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
    condition: { type: 'crew_at_location_min', location: 'lost', count: 10 },
    year: 2026,
    persist: true,
  },
  // Festival 2026 — band-named witness badges
  {
    slug: 'wacken-firefighters',
    imagePath: '/badges/badge_firefighters.png',
    labelKey: 'badgeWackenFirefighters',
    descriptionKey: 'badgeWackenFirefightersDescription',
    // Wacken Firefighters open (Day 1 12:00, WAK1) and close (Day 4 12:00, WAK22) the festival on the Wackinger stage.
    condition: { type: 'band_seen_named', name: 'Wacken Firefighters' },
    year: 2026,
  },
  {
    slug: 'gutalax',
    imagePath: '/badges/badge_gutalax.png',
    labelKey: 'badgeGutalax',
    descriptionKey: 'badgeGutalaxDescription',
    // Gutalax (Goregrind) — Wasteland Day 3, 21:30 (WAS20).
    condition: { type: 'band_seen_named', name: 'Gutalax' },
    year: 2026,
  },
  {
    slug: 'heavysaurus',
    imagePath: '/badges/badge_heavysaurus.png',
    labelKey: 'badgeHeavysaurus',
    descriptionKey: 'badgeHeavysaurusDescription',
    // Heavysaurus (Children's Metal) — Wasteland Day 4, 21:30 (WAS28).
    condition: { type: 'band_seen_named', name: 'Heavysaurus' },
    year: 2026,
  },
  // Festival 2026 — stage-loyalty badges
  {
    slug: 'wackinger-regular',
    imagePath: '/badges/badge_wackinger.png',
    labelKey: 'badgeWackingerRegular',
    descriptionKey: 'badgeWackingerRegularDescription',
    condition: { type: 'bands_seen_stage_min', stage: 'Wackinger', count: 3 },
    year: 2026,
  },
  {
    slug: 'wasteland-warrior',
    imagePath: '/badges/badge_wasteland.png',
    labelKey: 'badgeWastelandWarrior',
    descriptionKey: 'badgeWastelandWarriorDescription',
    condition: { type: 'bands_seen_stage_min', stage: 'Wasteland', count: 1 },
    year: 2026,
  },
  // Festival 2026 — Bullhead loyalty (Faster + Harder main-infield corridor)
  {
    slug: 'bullhead-heat',
    imagePath: '/badges/badge_heat.png',
    labelKey: 'badgeBullheadHeat',
    descriptionKey: 'badgeBullheadHeatDescription',
    // "More than 5" → strictly > 5 → count: 6 across Faster ∪ Harder (the flaming bullhead sits between them).
    condition: { type: 'bands_seen_stages_min', stages: ['Faster', 'Harder'], count: 6 },
    year: 2026,
  },
  // Festival 2026 — Arrival-day badges (one per camping-open day, exact match)
  {
    slug: 'civil-engineers-of-doom',
    imagePath: '/badges/badge_civil.png',
    labelKey: 'badgeCivilEngineersOfDoom',
    descriptionKey: 'badgeCivilEngineersOfDoomDescription',
    condition: { type: 'wacken_arrived_on', day: 'sun-jul26' },
    year: 2026,
  },
  {
    slug: 'beerforcement',
    imagePath: '/badges/badge_beerforcement.png',
    labelKey: 'badgeBeerforcement',
    descriptionKey: 'badgeBeerforcementDescription',
    condition: { type: 'wacken_arrived_on', day: 'mon-jul27' },
    year: 2026,
  },
  {
    slug: 'campfire-veteran',
    imagePath: '/badges/badge_veteran.png',
    labelKey: 'badgeCampfireVeteran',
    descriptionKey: 'badgeCampfireVeteranDescription',
    condition: { type: 'wacken_arrived_on', day: 'tue-jul28' },
    year: 2026,
  },
  {
    slug: 'spawn-point-infield',
    imagePath: '/badges/badge_spawn-infield.png',
    labelKey: 'badgeSpawnPointInfield',
    descriptionKey: 'badgeSpawnPointInfieldDescription',
    condition: { type: 'wacken_arrived_on', day: 'wed-jul29' },
    year: 2026,
  },
  // Festival 2026 — late-night endurance badges
  {
    slug: 'witching-hour',
    imagePath: '/badges/badge_witching-hour.png',
    labelKey: 'badgeWitchingHour',
    descriptionKey: 'badgeWitchingHourDescription',
    condition: { type: 'bands_seen_after_hour_min', hour: 22, count: 4 },
    year: 2026,
  },
  {
    slug: 'vampire',
    imagePath: '/badges/badge_vampire.png',
    labelKey: 'badgeVampire',
    descriptionKey: 'badgeVampireDescription',
    condition: { type: 'bands_seen_after_hour_min', hour: 22, count: 8 },
    year: 2026,
  },
  // Festival 2026 — small stage loyalty
  {
    slug: 'small-stage-champion',
    imagePath: '/badges/badge_small-stage-champion.png',
    labelKey: 'badgeSmallStageChampion',
    descriptionKey: 'badgeSmallStageChampionDescription',
    condition: { type: 'bands_seen_stages_min', stages: ['W.E.T.', 'Headbangers'], count: 6 },
    year: 2026,
  },
  // Festival 2026 — crew presence milestones (persist: true — full crew moments)
  {
    slug: 'full-pack',
    imagePath: '/badges/badge_full-pack.png',
    labelKey: 'badgeFullPack',
    descriptionKey: 'badgeFullPackDescription',
    condition: { type: 'crew_at_location_min', location: 'camping', count: 21 },
    year: 2026,
    persist: true,
  },
  {
    slug: 'mass-lost',
    imagePath: '/badges/badge_mass-lost.png',
    labelKey: 'badgeMassLost',
    descriptionKey: 'badgeMassLostDescription',
    condition: { type: 'crew_at_location_min', location: 'lost', count: 21 },
    year: 2026,
    persist: true,
  },
  // Joke badges — assigned manually by godlike via the assign-badge Edge Function
  {
    slug: 'medic',
    imagePath: '/badges/badge_medic.png',
    labelKey: 'badgeMedic',
    descriptionKey: 'badgeMedicDescription',
    condition: { type: 'assigned' },
    year: 2026,
  },
  // Festival 2026 — band-named witness badges
  {
    slug: 'judas-witness',
    imagePath: '/badges/badge_judas-witness.png',
    labelKey: 'badgeJudasWitness',
    descriptionKey: 'badgeJudasWitnessDescription',
    condition: { type: 'band_seen_named', name: 'Judas Priest' },
    year: 2026,
  },
  // Festival 2026 — stage diversity badges (stage_diversity_min)
  {
    slug: 'stage-hopper',
    imagePath: '/badges/badge_stage-hopper.png',
    labelKey: 'badgeStageHopper',
    descriptionKey: 'badgeStageHopperDescription',
    condition: { type: 'stage_diversity_min', count: 4 },
    year: 2026,
  },
  {
    slug: 'octopus',
    imagePath: '/badges/badge_octopus.png',
    labelKey: 'badgeOctopus',
    descriptionKey: 'badgeOctopusDescription',
    condition: { type: 'stage_diversity_min', count: 8 },
    year: 2026,
    persist: true,
  },
  // Joke badges — assigned manually by godlike via the assign-badge Edge Function
  {
    slug: 'smoke-signals',
    imagePath: '/badges/badge_smoke-signals.png',
    labelKey: 'badgeSmokeSignals',
    descriptionKey: 'badgeSmokeSignalsDescription',
    condition: { type: 'assigned' },
    year: 2026,
  },
  {
    slug: 'space-brownie',
    imagePath: '/badges/badge_space-brownie.png',
    labelKey: 'badgeSpaceBrownie',
    descriptionKey: 'badgeSpaceBrownieDescription',
    condition: { type: 'assigned' },
    year: 2026,
  },
  {
    slug: 'beer-master',
    imagePath: '/badges/badge_beer-master.png',
    labelKey: 'badgeBeerMaster',
    descriptionKey: 'badgeBeerMasterDescription',
    condition: { type: 'assigned' },
    year: 2026,
  },
  {
    slug: 'beer-hater',
    imagePath: '/badges/badge_beer-hater.png',
    labelKey: 'badgeBeerHater',
    descriptionKey: 'badgeBeerHaterDescription',
    condition: { type: 'assigned' },
    year: 2026,
  },
  {
    slug: 'code-wizards',
    imagePath: '/badges/badge_code-wizards.png',
    labelKey: 'badgeCodeWizards',
    descriptionKey: 'badgeCodeWizardsDescription',
    condition: { type: 'assigned' },
    year: 2026,
  },
  {
    slug: 'sun-sacrifice',
    imagePath: '/badges/badge_sun-sacrifice.png',
    labelKey: 'badgeSunSacrifice',
    descriptionKey: 'badgeSunSacrificeDescription',
    condition: { type: 'assigned' },
    year: 2026,
  },
  {
    slug: 'tactical-nap',
    imagePath: '/badges/badge_tactical-nap.png',
    labelKey: 'badgeTacticalNap',
    descriptionKey: 'badgeTacticalNapDescription',
    condition: { type: 'assigned' },
    year: 2026,
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
// wacken_arrived_on
//   User's arrival day matches the given day exactly. Use one badge per arrival day
//   when you want a different patch per camping-open day.
//   Example: arrived Sunday (the campsite-builders)
//   { slug: 'civil-engineers-of-doom', condition: { type: 'wacken_arrived_on', day: 'sun-jul26' } }
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
// bands_picked_stages_min
//   User picked N+ bands whose stage is any of the listed stages (set membership, OR-combined).
//   A pick is counted if its `stage` is in the array; total picks across the listed stages
//   must reach `count`. Does NOT require ≥1 from each stage.
//   Example: Main Infield corridor lover — 6+ picks across Faster ∪ Harder
//   { slug: 'infield-rat', condition: { type: 'bands_picked_stages_min', stages: ['Faster', 'Harder'], count: 6 } }
//
// bands_picked_genres_min
//   User picked N+ bands whose genre is any of the listed genres (set membership, OR-combined).
//   Bands with `genre = null` are never counted (no matching string). Genre names must match exactly.
//   Example: extreme-metal devotee — 5+ picks across heavy sub-genres
//   { slug: 'extreme-picker',
//     condition: { type: 'bands_picked_genres_min',
//                  genres: ['Death Metal', 'Black Metal', 'Grindcore', 'Brutal Death Metal'],
//                  count: 5 } }
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
// bands_seen_stages_min
//   Seen N+ bands whose stage is any of the listed stages (set membership, OR-combined).
//   Same semantics as `bands_picked_stages_min` but counted against `seenBands`.
//   Example: hung around the Main Infield corridor — saw 6+ bands across Faster ∪ Harder
//   { slug: 'infield-rat', condition: { type: 'bands_seen_stages_min', stages: ['Faster', 'Harder'], count: 6 } }
//
// bands_seen_genres_min
//   Seen N+ bands whose genre is any of the listed genres (set membership, OR-combined).
//   Bands with `genre = null` are never counted.
//   Example: confirmed extreme-metal devotee — saw 5+ across heavy sub-genres
//   { slug: 'extreme-devotee',
//     condition: { type: 'bands_seen_genres_min',
//                  genres: ['Death Metal', 'Black Metal', 'Grindcore', 'Brutal Death Metal'],
//                  count: 5 } }
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
