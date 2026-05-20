/**
 * Seed script — Wacken 2026 lineup
 *
 * Run:  npx tsx supabase/seed/bands.ts
 *       (or: npm run seed:bands)
 *
 * Requires env vars (reads from .env.local automatically):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← service role bypasses RLS; required for writes
 *
 * SOURCE OF TRUTH:
 *   - Band names, genres, stages, image URLs:  docs/ai-wiki/lineup.md
 *   - Slot start/end times:                    docs/ai-wiki/stages.md
 *
 * Rules applied when generating this file:
 *   - Slots whose `Name` is `TBD` in lineup.md are NOT seeded (12 dropped:
 *     JUN1-JUN8, LOU21, WET30, WAS24, WAS32).
 *   - Slots whose `Name` is `TDB MTB` (Metal Battle placeholders) ARE seeded
 *     with the literal name `TDB MTB`, the genre column from lineup.md
 *     (e.g. "Metal Battle Hungary"), and `image_url = PLACEHOLDER`. Once
 *     Wacken announces the representative band, replace `name` + `image_url`
 *     here AND update lineup.md (`Band Status` → CONFIRMED, `Name` → real
 *     band, `Image URL` → real URL) — see Speak in Whispers (WET2) as the
 *     reference pattern.
 *   - Bands with `Band Status: TBD` keep their name but use PLACEHOLDER image.
 *   - Bands with `Genre: TBD` use the fallback genre `"Generic Metal"`.
 *   - Each slot's start_time / end_time comes from stages.md (Slot ID → time).
 *
 * Expected row count after seed: **187**
 *   = 155 CONFIRMED + 31 TDB MTB + 1 ceremony (HAR13 Farewell & Announcements).
 *
 * ────────────────────────────────────────────────────────────────────────
 * DESTRUCTIVE BEHAVIOR — this script REPLACES the entire `bands` table.
 * ────────────────────────────────────────────────────────────────────────
 *
 * On every run, the script will:
 *   1. Count existing bands.
 *   2. DELETE every row in `public.bands`.
 *      Cascades to dependents:
 *        - `user_picks`         (ON DELETE CASCADE  — all picks erased)
 *        - `user_missed_bands`  (ON DELETE CASCADE  — all "seen" flags erased)
 *        - `live_band_test_config.band_id`  (ON DELETE SET NULL)
 *   3. Verify the table is empty (aborts on mismatch).
 *   4. INSERT all bands from the constant array below.
 *   5. Verify row count equals the constant length (aborts on mismatch).
 *
 * Times (start_time/end_time) are part of each band row, so old times are
 * replaced as part of the table replacement — there is no per-row update path.
 *
 * Run with --force to skip the confirmation prompt (useful in CI / scripts).
 * Without --force the script will print a 5-second warning before deleting.
 *
 * NEVER run this against a live festival session — picks WILL be lost.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Env loading
// ---------------------------------------------------------------------------

function loadEnvFile() {
  try {
    const raw = readFileSync('.env.local', 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local not found — rely on process.env being set by the caller
  }
}

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------

// All times are CEST (UTC+2) — Wacken, Germany in summer
function t(date: string, hour: number, min = 0) {
  return `${date}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00+02:00`;
}

const D1  = '2026-07-29'; // Festival Day 1 — Wednesday
const D1n = '2026-07-30'; // After-midnight slots of Day 1
const D2  = '2026-07-30'; // Festival Day 2 — Thursday
const D2n = '2026-07-31'; // After-midnight slots of Day 2
const D3  = '2026-07-31'; // Festival Day 3 — Friday
const D3n = '2026-08-01'; // After-midnight slots of Day 3
const D4  = '2026-08-01'; // Festival Day 4 — Saturday
const D4n = '2026-08-02'; // After-midnight slots of Day 4

// All 8 Wacken stages
const STAGES = {
  HARDER:      'Harder',
  FASTER:      'Faster',
  LOUDER:      'Louder',
  WET:         'W.E.T.',
  HEADBANGERS: 'Headbangers',
  WASTELAND:   'Wasteland',
  WACKINGER:   'Wackinger',
  JUNGLE:      'Welcome to the Jungle',
};

const WOA         = 'https://www.wacken.com'; // base for all thumbnail URLs
const PLACEHOLDER = 'https://www.wacken.com/_assets/3fb8fb6daec87d7565c05103aa89d6b0/2026/Images/news_list_dummy%401x.png';

// Fallback genre for bands whose lineup.md genre is still "TBD".
const TBD_GENRE = 'Generic Metal';

// Literal name placeholder used for Metal Battle slots whose representative
// band has not yet been announced. Mirrors lineup.md exactly. Once a band is
// announced for one of these slots, edit both lineup.md and this file.
const MTB = 'TDB MTB';

export type BandSeed = {
  name: string;
  stage: string;
  start_time: string;
  end_time: string;
  genre: string | null;
  image_url: string | null;
  category?: 'band' | 'ceremony';
};

// ---------------------------------------------------------------------------
// Band data — 187 entries total (mirrors lineup.md exactly)
// Comment after each row: Slot ID (from stages.md).
// Stage order within each day (per lineup.md):
//   Harder · Faster · Louder · W.E.T. · Headbangers · Wasteland · Wackinger · Jungle
// Welcome to the Jungle has no entries — all JUN slots are TBD in the running order.
// ---------------------------------------------------------------------------

export const bands: BandSeed[] = [

  // ═══════════════════════════════════════════════════════
  // DAY 1 — Wednesday 29 July
  // (Harder stage is closed on Day 1.)
  // ═══════════════════════════════════════════════════════

  // FASTER STAGE — Day 1
  { name: 'Lovebites',           stage: STAGES.FASTER, start_time: t(D1,16, 0), end_time: t(D1,17, 0),  genre: 'Heavy Metal',      image_url: `${WOA}/fileadmin/_processed_/8/d/csm_lovebites_26b_38ca926080.jpg` },          // FAS1
  { name: 'The Butcher Sisters', stage: STAGES.FASTER, start_time: t(D1,18, 0), end_time: t(D1,19, 0),  genre: TBD_GENRE,          image_url: `${WOA}/fileadmin/_processed_/7/a/csm_the_butcher_sisters26_63acf7d891.jpg` }, // FAS2
  { name: 'Electric Bassboy',    stage: STAGES.FASTER, start_time: t(D1,20, 0), end_time: t(D1,21, 0),  genre: TBD_GENRE,          image_url: `${WOA}/fileadmin/_processed_/2/3/csm_electric_bassboy26_c1af9b52ad.jpg` },    // FAS3
  { name: 'Hämatom',             stage: STAGES.FASTER, start_time: t(D1,22, 0), end_time: t(D1n, 0, 0), genre: 'Industrial Metal', image_url: `${WOA}/fileadmin/_processed_/5/e/csm_haematom_26_a104ede3d5.jpg` },          // FAS4

  // LOUDER STAGE — Day 1
  { name: 'Broken By The Scream', stage: STAGES.LOUDER, start_time: t(D1,12, 0), end_time: t(D1,12,45), genre: 'Visual Kei Metal', image_url: `${WOA}/fileadmin/_processed_/6/5/csm_Broken_By_The_Scream-WOA26_8ad83f8245.jpg` }, // LOU1
  { name: 'Visions of Atlantis',  stage: STAGES.LOUDER, start_time: t(D1,13,30), end_time: t(D1,14,30), genre: 'Symphonic Metal',  image_url: `${WOA}/fileadmin/_processed_/1/6/csm_visions_of_atlantis_26_2bfe817394.jpg` },     // LOU2
  { name: 'Thundermother',        stage: STAGES.LOUDER, start_time: t(D1,15,15), end_time: t(D1,16,15), genre: 'Rock',             image_url: `${WOA}/fileadmin/_processed_/9/a/csm_Thundermother-Band-2023_d61771d790.jpg` },     // LOU3
  { name: 'The Hardkiss',         stage: STAGES.LOUDER, start_time: t(D1,17, 0), end_time: t(D1,18, 0), genre: 'Rock',             image_url: `${WOA}/fileadmin/_processed_/9/8/csm_The_Hardkiss-WOA26_2db7165b54.jpg` },          // LOU4
  { name: 'The Gathering',        stage: STAGES.LOUDER, start_time: t(D1,18,45), end_time: t(D1,20, 0), genre: 'Gothic Metal',     image_url: `${WOA}/fileadmin/_processed_/0/2/csm_The_Gathering-WOA26_57ded7843d.jpg` },         // LOU5
  { name: 'Lacuna Coil',          stage: STAGES.LOUDER, start_time: t(D1,21, 0), end_time: t(D1,22,30), genre: 'Gothic Metal',     image_url: `${WOA}/fileadmin/_processed_/6/3/csm_lacuna_coil_26_289f52868d.jpg` },              // LOU6

  // W.E.T. STAGE — Day 1
  { name: MTB,                  stage: STAGES.WET, start_time: t(D1,11, 0), end_time: t(D1,11,20),  genre: 'Metal Battle Hungary',    image_url: PLACEHOLDER },                                                                  // WET1
  { name: 'Speak in Whispers',  stage: STAGES.WET, start_time: t(D1,11,50), end_time: t(D1,12,10),  genre: 'Metal Battle Cyprus',     image_url: `${WOA}/fileadmin/_processed_/9/9/csm_speak_in_whispers_26_157b14e684.jpg` }, // WET2
  { name: MTB,                  stage: STAGES.WET, start_time: t(D1,12,40), end_time: t(D1,13, 0),  genre: 'Metal Battle Greece',     image_url: PLACEHOLDER },                                                                  // WET3
  { name: MTB,                  stage: STAGES.WET, start_time: t(D1,13,30), end_time: t(D1,13,50),  genre: 'Metal Battle Sweden',     image_url: PLACEHOLDER },                                                                  // WET4
  { name: MTB,                  stage: STAGES.WET, start_time: t(D1,14,20), end_time: t(D1,14,40),  genre: 'Metal Battle Austria',    image_url: PLACEHOLDER },                                                                  // WET5
  { name: MTB,                  stage: STAGES.WET, start_time: t(D1,15,50), end_time: t(D1,16,10),  genre: 'Metal Battle France',     image_url: PLACEHOLDER },                                                                  // WET6
  { name: MTB,                  stage: STAGES.WET, start_time: t(D1,16,40), end_time: t(D1,17, 0),  genre: 'Metal Battle Luxembourg', image_url: PLACEHOLDER },                                                                  // WET7
  { name: MTB,                  stage: STAGES.WET, start_time: t(D1,17,30), end_time: t(D1,17,50),  genre: 'Metal Battle Belgium',    image_url: PLACEHOLDER },                                                                  // WET8
  { name: MTB,                  stage: STAGES.WET, start_time: t(D1,18,20), end_time: t(D1,18,40),  genre: 'Metal Battle Mexico',     image_url: PLACEHOLDER },                                                                  // WET9
  { name: MTB,                  stage: STAGES.WET, start_time: t(D1,19,10), end_time: t(D1,19,30),  genre: 'Metal Battle Latvia',     image_url: PLACEHOLDER },                                                                  // WET10
  { name: 'Velvet Rush',        stage: STAGES.WET, start_time: t(D1,20,15), end_time: t(D1,21, 0),  genre: 'AOR',                     image_url: `${WOA}/fileadmin/_processed_/c/c/csm_velvet_rush_26_79ee43e0e7.jpg` },         // WET11
  { name: 'Rose Tattoo',        stage: STAGES.WET, start_time: t(D1,22,45), end_time: t(D1n, 0, 0), genre: 'Hard Rock',               image_url: `${WOA}/fileadmin/_processed_/5/5/csm_rose_tattoo26_a5747c907d.jpg` },          // WET12

  // HEADBANGERS STAGE — Day 1
  { name: MTB,           stage: STAGES.HEADBANGERS, start_time: t(D1,11,25), end_time: t(D1,11,45),  genre: 'Metal Battle USA',                  image_url: PLACEHOLDER },                                                          // HBA1
  { name: MTB,           stage: STAGES.HEADBANGERS, start_time: t(D1,12,15), end_time: t(D1,12,35),  genre: 'Metal Battle Canada',               image_url: PLACEHOLDER },                                                          // HBA2
  { name: MTB,           stage: STAGES.HEADBANGERS, start_time: t(D1,13, 5), end_time: t(D1,13,25),  genre: 'Metal Battle Sub Saharan Africa',   image_url: PLACEHOLDER },                                                          // HBA3
  { name: MTB,           stage: STAGES.HEADBANGERS, start_time: t(D1,13,55), end_time: t(D1,14,15),  genre: 'Metal Battle Ireland',              image_url: PLACEHOLDER },                                                          // HBA4
  { name: 'Expellow',    stage: STAGES.HEADBANGERS, start_time: t(D1,14,45), end_time: t(D1,15,45),  genre: TBD_GENRE,                           image_url: `${WOA}/fileadmin/_processed_/b/b/csm_expellow_26b_f274263240.jpg` }, // HBA5
  { name: MTB,           stage: STAGES.HEADBANGERS, start_time: t(D1,16,15), end_time: t(D1,16,35),  genre: 'Metal Battle Lithuania',            image_url: PLACEHOLDER },                                                          // HBA6
  { name: MTB,           stage: STAGES.HEADBANGERS, start_time: t(D1,17, 5), end_time: t(D1,17,25),  genre: 'Metal Battle Italy',                image_url: PLACEHOLDER },                                                          // HBA7
  { name: MTB,           stage: STAGES.HEADBANGERS, start_time: t(D1,17,55), end_time: t(D1,18,15),  genre: 'Metal Battle Finland',              image_url: PLACEHOLDER },                                                          // HBA8
  { name: MTB,           stage: STAGES.HEADBANGERS, start_time: t(D1,18,45), end_time: t(D1,19, 5),  genre: 'Metal Battle Norway',               image_url: PLACEHOLDER },                                                          // HBA9
  { name: MTB,           stage: STAGES.HEADBANGERS, start_time: t(D1,19,35), end_time: t(D1,19,55),  genre: 'Metal Battle Iceland',              image_url: PLACEHOLDER },                                                          // HBA10
  { name: 'Kadavar',     stage: STAGES.HEADBANGERS, start_time: t(D1,21,15), end_time: t(D1,22,30),  genre: 'Stoner Rock',                       image_url: `${WOA}/fileadmin/_processed_/f/9/csm_kadavar_26b_5241b42bda.jpg` },  // HBA11
  { name: 'Mambo Kurt',  stage: STAGES.HEADBANGERS, start_time: t(D1n, 0,15), end_time: t(D1n, 1, 0), genre: TBD_GENRE,                          image_url: `${WOA}/fileadmin/_processed_/f/4/csm_mambo_kurt_25_d25410db45.jpg` }, // HBA12

  // WASTELAND STAGE — Day 1
  { name: 'Diabolisches Werk',  stage: STAGES.WASTELAND, start_time: t(D1,14, 0), end_time: t(D1,14,45),  genre: TBD_GENRE,      image_url: `${WOA}/fileadmin/_processed_/8/3/csm_diabolisches_werk_26_584e2240f9.jpg` }, // WAS1
  { name: 'Battlecreek',        stage: STAGES.WASTELAND, start_time: t(D1,15,30), end_time: t(D1,16,15),  genre: TBD_GENRE,      image_url: `${WOA}/fileadmin/_processed_/5/e/csm_Battlecreek-WOA26_ebdf45051d.jpg` },     // WAS2
  { name: 'Poison The Preacher',stage: STAGES.WASTELAND, start_time: t(D1,17, 0), end_time: t(D1,17,45),  genre: 'Metal',        image_url: `${WOA}/fileadmin/_processed_/5/c/csm_poison_the_preacher_26_719f682a4a.jpg` }, // WAS3
  { name: 'Phantom',            stage: STAGES.WASTELAND, start_time: t(D1,18,30), end_time: t(D1,19,15),  genre: 'Heavy Metal',  image_url: `${WOA}/fileadmin/_processed_/c/7/csm_phantom_26_2946b95d36.jpg` },             // WAS4
  { name: 'Crypt Sermon',       stage: STAGES.WASTELAND, start_time: t(D1,20, 0), end_time: t(D1,20,45),  genre: 'Doom Metal',   image_url: `${WOA}/fileadmin/_processed_/4/4/csm_crypt_sermon_26_25a80f0eed.jpg` },        // WAS5
  { name: 'The Troops Of Doom', stage: STAGES.WASTELAND, start_time: t(D1,21,30), end_time: t(D1,22,15),  genre: 'Thrash Metal', image_url: `${WOA}/fileadmin/_processed_/6/6/csm_troops_of_doom26_13f1c1c107.jpg` },        // WAS6
  { name: 'Sacred Steel',       stage: STAGES.WASTELAND, start_time: t(D1,23, 0), end_time: t(D1n, 0, 0), genre: 'Power Metal',  image_url: `${WOA}/fileadmin/_processed_/d/0/csm_sacred_steel_26_78f1daf932.jpg` },         // WAS7

  // WACKINGER STAGE — Day 1
  { name: 'Wacken Firefighters',   stage: STAGES.WACKINGER, start_time: t(D1,12, 0), end_time: t(D1,12,45), genre: TBD_GENRE,           image_url: `${WOA}/fileadmin/_processed_/0/6/csm_wacken_firefighters_25_5f6d39317e.jpg` }, // WAK1
  { name: 'Alien Rockin Explosion',stage: STAGES.WACKINGER, start_time: t(D1,13,30), end_time: t(D1,14,15), genre: 'Rock',              image_url: `${WOA}/fileadmin/_processed_/a/4/csm_alien_rockin_explosion_26_dba5a44bfe.jpg` }, // WAK2
  { name: '5th Avenue',            stage: STAGES.WACKINGER, start_time: t(D1,15, 0), end_time: t(D1,16, 0), genre: TBD_GENRE,           image_url: `${WOA}/fileadmin/_processed_/5/f/csm_5th_Avenue25_9d44c97386.jpg` },               // WAK3
  { name: 'Ricky Warwick',         stage: STAGES.WACKINGER, start_time: t(D1,16,45), end_time: t(D1,17,45), genre: 'Hard Rock',         image_url: `${WOA}/fileadmin/_processed_/9/d/csm_ricky_warwick26c_9f35eea5b5.jpg` },           // WAK4
  { name: 'Vanir',                 stage: STAGES.WACKINGER, start_time: t(D1,18,30), end_time: t(D1,19,30), genre: 'Viking Metal',      image_url: `${WOA}/fileadmin/_processed_/0/f/csm_vanir_26_4989af5ab2.jpg` },                   // WAK5
  { name: 'Dirty Shirt',           stage: STAGES.WACKINGER, start_time: t(D1,20,15), end_time: t(D1,21,15), genre: 'Crossover Metal',   image_url: `${WOA}/fileadmin/_processed_/8/d/csm_dirty_Shirt_26_d6b1aa60da.jpg` },             // WAK6
  { name: 'Unzucht',               stage: STAGES.WACKINGER, start_time: t(D1,22,15), end_time: t(D1,23,15), genre: 'Industrial / Gothic', image_url: `${WOA}/fileadmin/_processed_/b/2/csm_unzucht_26_5662cb7925.jpg` },              // WAK7

  // WELCOME TO THE JUNGLE — Day 1
  // JUN1, JUN2 — dropped (Name = TBD in lineup.md)

  // ═══════════════════════════════════════════════════════
  // DAY 2 — Thursday 30 July
  // ═══════════════════════════════════════════════════════

  // HARDER STAGE — Day 2
  { name: 'Uli Jon Roth', stage: STAGES.HARDER, start_time: t(D2,16,15), end_time: t(D2,17,15),  genre: 'Rock',       image_url: `${WOA}/fileadmin/_processed_/3/b/csm_uli_jon_roth26_db0812a7ce.jpg` },     // HAR1
  { name: 'Europe',       stage: STAGES.HARDER, start_time: t(D2,19, 0), end_time: t(D2,20,15),  genre: 'Hard Rock',  image_url: `${WOA}/fileadmin/_processed_/5/3/csm_Europe-WOA26_9d76063492.jpg` },        // HAR2
  { name: 'Def Leppard',  stage: STAGES.HARDER, start_time: t(D2,22,15), end_time: t(D2n, 0, 0), genre: 'Hard Rock',  image_url: `${WOA}/fileadmin/_processed_/3/4/csm_Def_Leppard-WOA26_27e5f4ed42.jpg` },   // HAR3

  // FASTER STAGE — Day 2
  { name: 'Skyline',          stage: STAGES.FASTER, start_time: t(D2,15, 0), end_time: t(D2,16, 0),  genre: TBD_GENRE,           image_url: `${WOA}/fileadmin/_processed_/6/5/csm_skyline_2024_a76c70015c.jpg` },          // FAS5
  { name: 'Yngwie Malmsteen', stage: STAGES.FASTER, start_time: t(D2,17,30), end_time: t(D2,18,45),  genre: 'Neoclassical Metal',image_url: `${WOA}/fileadmin/_processed_/9/0/csm_yngwie_malmsteen_26_451945c4f5.jpg` }, // FAS6
  { name: 'Savatage',         stage: STAGES.FASTER, start_time: t(D2,20,30), end_time: t(D2,22, 0),  genre: 'Heavy Metal',       image_url: `${WOA}/fileadmin/_processed_/9/9/csm_Savatage-WOA26_6be2e38515.jpg` },     // FAS7

  // LOUDER STAGE — Day 2
  { name: 'Alien Ant Farm', stage: STAGES.LOUDER, start_time: t(D2,12, 0), end_time: t(D2,13, 0),  genre: 'Alternative Rock', image_url: `${WOA}/fileadmin/_processed_/a/b/csm_alien_ant_farm_26_f4695d8f52.jpg` }, // LOU7
  { name: 'H-Blockx',       stage: STAGES.LOUDER, start_time: t(D2,13,45), end_time: t(D2,14,45),  genre: 'Rap Metal',        image_url: `${WOA}/fileadmin/_processed_/c/7/csm_H_Blockx-WOA26_c10c9dda61.jpg` },    // LOU8
  { name: 'Therapy?',       stage: STAGES.LOUDER, start_time: t(D2,15,30), end_time: t(D2,16,30),  genre: 'Alternative Rock', image_url: `${WOA}/fileadmin/_processed_/8/5/csm_therapy26_acbd2ac94b.jpg` },         // LOU9
  { name: 'Life of Agony',  stage: STAGES.LOUDER, start_time: t(D2,17,30), end_time: t(D2,18,45),  genre: 'Alternative Metal',image_url: `${WOA}/fileadmin/_processed_/9/4/csm_life_of_agony26_68ef27b061.jpg` },  // LOU10
  { name: 'P.O.D.',         stage: STAGES.LOUDER, start_time: t(D2,19,45), end_time: t(D2,21, 0),  genre: 'Nu Metal',         image_url: `${WOA}/fileadmin/_processed_/f/0/csm_POD_26_52d8ce1512.jpg` },          // LOU11
  { name: 'Turbonegro',     stage: STAGES.LOUDER, start_time: t(D2,22, 0), end_time: t(D2,22,30),  genre: 'Punk Rock',        image_url: `${WOA}/fileadmin/_processed_/1/b/csm_turbonegro26_2118d824cd.jpg` },     // LOU12

  // W.E.T. STAGE — Day 2
  { name: MTB,                     stage: STAGES.WET, start_time: t(D2,11, 0), end_time: t(D2,11,20),  genre: 'Metal Battle Balkan Regions', image_url: PLACEHOLDER }, // WET13
  { name: MTB,                     stage: STAGES.WET, start_time: t(D2,11,50), end_time: t(D2,12,10),  genre: 'Metal Battle Malta',          image_url: PLACEHOLDER }, // WET14
  { name: MTB,                     stage: STAGES.WET, start_time: t(D2,12,40), end_time: t(D2,13, 0),  genre: 'Metal Battle Bulgaria',       image_url: PLACEHOLDER }, // WET15
  { name: MTB,                     stage: STAGES.WET, start_time: t(D2,13,30), end_time: t(D2,13,50),  genre: 'Metal Battle Philippines',    image_url: PLACEHOLDER }, // WET16
  { name: MTB,                     stage: STAGES.WET, start_time: t(D2,14,20), end_time: t(D2,14,40),  genre: 'Metal Battle Japan',          image_url: PLACEHOLDER }, // WET17
  { name: MTB,                     stage: STAGES.WET, start_time: t(D2,15,10), end_time: t(D2,15,30),  genre: 'Metal Battle Spain',          image_url: PLACEHOLDER }, // WET18
  { name: 'Craft',                 stage: STAGES.WET, start_time: t(D2,16,15), end_time: t(D2,17, 0),  genre: 'Black Metal',                 image_url: `${WOA}/fileadmin/_processed_/8/d/csm_Craft_cropped_size_-_photo_by_Soile_Siirtola_fabe03b40f.jpg` }, // WET19
  { name: 'Spectral Wound',        stage: STAGES.WET, start_time: t(D2,18,15), end_time: t(D2,19, 0),  genre: 'Black Metal',                 image_url: `${WOA}/fileadmin/_processed_/2/e/csm_spectral_wound26_3263ad4710.jpg` }, // WET20
  { name: 'Misery Index',          stage: STAGES.WET, start_time: t(D2,20,30), end_time: t(D2,21,30),  genre: 'Death Metal / Grindcore',     image_url: `${WOA}/fileadmin/_processed_/5/a/csm_Misery_Index-WOA26_477d278139.jpg` }, // WET21
  { name: 'Misþyrming & Nergal',   stage: STAGES.WET, start_time: t(D2,23, 0), end_time: t(D2n, 0, 0), genre: 'Black Metal',                 image_url: `${WOA}/fileadmin/_processed_/5/c/csm_Sventevith-Logo-2_da655748b4.jpg` }, // WET22

  // HEADBANGERS STAGE — Day 2
  { name: MTB,                    stage: STAGES.HEADBANGERS, start_time: t(D2,11,25), end_time: t(D2,11,45),  genre: 'Metal Battle Netherlands',     image_url: PLACEHOLDER }, // HBA13
  { name: MTB,                    stage: STAGES.HEADBANGERS, start_time: t(D2,12,15), end_time: t(D2,12,35),  genre: 'Metal Battle Czech Republic',  image_url: PLACEHOLDER }, // HBA14
  { name: MTB,                    stage: STAGES.HEADBANGERS, start_time: t(D2,13, 5), end_time: t(D2,13,25),  genre: 'Metal Battle Chile',           image_url: PLACEHOLDER }, // HBA15
  { name: MTB,                    stage: STAGES.HEADBANGERS, start_time: t(D2,13,55), end_time: t(D2,14,15),  genre: 'Metal Battle India',           image_url: PLACEHOLDER }, // HBA16
  { name: MTB,                    stage: STAGES.HEADBANGERS, start_time: t(D2,14,45), end_time: t(D2,15, 5),  genre: 'Metal Battle El Salvador',     image_url: PLACEHOLDER }, // HBA17
  { name: MTB,                    stage: STAGES.HEADBANGERS, start_time: t(D2,15,35), end_time: t(D2,15,55),  genre: 'Metal Battle Switzerland',     image_url: PLACEHOLDER }, // HBA18
  { name: 'Firespawn',            stage: STAGES.HEADBANGERS, start_time: t(D2,17,15), end_time: t(D2,18, 0),  genre: 'Death Metal',                  image_url: `${WOA}/fileadmin/_processed_/0/3/csm_Firespawn-WOA26_b9d52bcc7e.jpg` }, // HBA19
  { name: 'Blood Red Throne',     stage: STAGES.HEADBANGERS, start_time: t(D2,19,15), end_time: t(D2,20,15),  genre: 'Death Metal',                  image_url: `${WOA}/fileadmin/_processed_/0/a/csm_blood_red_throne26_98867522b5.jpg` }, // HBA20
  { name: 'Anaal Nathrakh',       stage: STAGES.HEADBANGERS, start_time: t(D2,21,45), end_time: t(D2,22,45),  genre: 'Black Metal / Grindcore',      image_url: `${WOA}/fileadmin/_processed_/c/6/csm_AnaalNathrakh1_1706ff6610.jpg` }, // HBA21
  { name: 'Cowgirls From Hell',   stage: STAGES.HEADBANGERS, start_time: t(D2n, 0, 0), end_time: t(D2n, 3, 0), genre: TBD_GENRE,                     image_url: `${WOA}/fileadmin/_processed_/4/0/csm_cowgirls_from_hell_26_30a60185cc.jpg` }, // HBA22 (00:00*–03:00*)

  // WASTELAND STAGE — Day 2
  { name: 'Saviourself',         stage: STAGES.WASTELAND, start_time: t(D2,14, 0), end_time: t(D2,14,30),  genre: TBD_GENRE,                 image_url: `${WOA}/fileadmin/_processed_/a/5/csm_saviourself_26_2359155f97.jpg` },     // WAS8
  { name: 'Black Tish',          stage: STAGES.WASTELAND, start_time: t(D2,15, 0), end_time: t(D2,15,30),  genre: TBD_GENRE,                 image_url: `${WOA}/fileadmin/_processed_/c/6/csm_black_tish_26_9887b0d604.jpg` },      // WAS9
  { name: 'Brunhilde',           stage: STAGES.WASTELAND, start_time: t(D2,16, 0), end_time: t(D2,16,45),  genre: 'Folk Metal',              image_url: `${WOA}/fileadmin/_processed_/b/4/csm_brunhilde_26_489882e4fb.jpg` },        // WAS10
  { name: '9mm Headshot',        stage: STAGES.WASTELAND, start_time: t(D2,17,15), end_time: t(D2,18, 0),  genre: TBD_GENRE,                 image_url: `${WOA}/fileadmin/_processed_/5/c/csm_9mm_26_b14cffe6c2.jpg` },              // WAS11
  { name: 'Wytch Hazel',         stage: STAGES.WASTELAND, start_time: t(D2,18,30), end_time: t(D2,19,15),  genre: 'Traditional Heavy Metal', image_url: `${WOA}/fileadmin/_processed_/2/5/csm_Wytch_Hazel-WOA26_3a3c5566d4.jpg` }, // WAS12
  { name: 'Temple of the Absurd',stage: STAGES.WASTELAND, start_time: t(D2,19,45), end_time: t(D2,20,45),  genre: TBD_GENRE,                 image_url: `${WOA}/fileadmin/_processed_/f/a/csm_temple_of_the_absurd_26_ad20ecb9ce.jpg` }, // WAS13
  { name: 'Evil Jared & Krogi',  stage: STAGES.WASTELAND, start_time: t(D2,21,15), end_time: t(D2,22,15),  genre: TBD_GENRE,                 image_url: `${WOA}/fileadmin/_processed_/9/5/csm_evil_jared_krogi26_9d4bb77d9d.jpg` }, // WAS14
  { name: 'Year of the Goat',    stage: STAGES.WASTELAND, start_time: t(D2,23, 0), end_time: t(D2n, 0, 0), genre: 'Occult Rock',             image_url: `${WOA}/fileadmin/_processed_/4/e/csm_year_of_the_goat_26_f271ba4dd9.jpg` }, // WAS15

  // WACKINGER STAGE — Day 2
  { name: 'Wüstenberg',   stage: STAGES.WACKINGER, start_time: t(D2,12, 0), end_time: t(D2,12,45), genre: TBD_GENRE,    image_url: `${WOA}/fileadmin/_processed_/1/1/csm_wuestenberg_26_7a5a7ede3d.jpg` },     // WAK8
  { name: 'Katerfahrt',   stage: STAGES.WACKINGER, start_time: t(D2,13,30), end_time: t(D2,14,15), genre: 'Rock',       image_url: `${WOA}/fileadmin/_processed_/7/0/csm_Katerfahrt-WOA26_4213c9f3a0.jpg` },   // WAK9
  { name: 'Vogelfrey',    stage: STAGES.WACKINGER, start_time: t(D2,15, 0), end_time: t(D2,16, 0), genre: 'Folk Metal', image_url: `${WOA}/fileadmin/_processed_/a/3/csm_vogelfrey_26_b_0c6f4b5859.jpg` },     // WAK10
  { name: 'Sagenbringer', stage: STAGES.WACKINGER, start_time: t(D2,16,45), end_time: t(D2,17,45), genre: 'Folk Metal', image_url: `${WOA}/fileadmin/_processed_/7/2/csm_sagenbringer_26_b57d26c84d.jpg` },    // WAK11
  { name: 'Storm Seeker', stage: STAGES.WACKINGER, start_time: t(D2,18,30), end_time: t(D2,19,30), genre: 'Folk Metal', image_url: `${WOA}/fileadmin/_processed_/c/9/csm_stormseeker26_ffac69751b.jpg` },      // WAK12
  { name: 'Kupfergold',   stage: STAGES.WACKINGER, start_time: t(D2,20,15), end_time: t(D2,21,15), genre: TBD_GENRE,    image_url: `${WOA}/fileadmin/_processed_/2/c/csm_Kupfergold-WOA26_1d73350ab6.jpg` },   // WAK13
  { name: 'Manntra',      stage: STAGES.WACKINGER, start_time: t(D2,22,15), end_time: t(D2,23,15), genre: 'Folk Metal', image_url: `${WOA}/fileadmin/_processed_/1/3/csm_manntra_26_a22fae1fff.jpg` },         // WAK14

  // WELCOME TO THE JUNGLE — Day 2
  // JUN3, JUN4 — dropped (Name = TBD in lineup.md)

  // ═══════════════════════════════════════════════════════
  // DAY 3 — Friday 31 July
  // ═══════════════════════════════════════════════════════

  // HARDER STAGE — Day 3
  { name: 'Vreid',        stage: STAGES.HARDER, start_time: t(D3,13,30), end_time: t(D3,14,15),  genre: TBD_GENRE,        image_url: `${WOA}/fileadmin/_processed_/8/0/csm_vreid_26_f92e6e9af1.jpg` },               // HAR4
  { name: 'Danko Jones',  stage: STAGES.HARDER, start_time: t(D3,15,45), end_time: t(D3,16,45),  genre: 'Hard Rock',      image_url: `${WOA}/fileadmin/_processed_/d/e/csm_danko_jones_26_3405a63446.jpg` },         // HAR5
  { name: 'Saxon',        stage: STAGES.HARDER, start_time: t(D3,18,15), end_time: t(D3,19,30),  genre: 'Heavy Metal',    image_url: `${WOA}/fileadmin/_processed_/3/6/csm_saxon_26_0097ea04d2.jpg` },               // HAR6
  { name: 'Judas Priest', stage: STAGES.HARDER, start_time: t(D3,21,30), end_time: t(D3,23, 0),  genre: 'Heavy Metal',    image_url: `${WOA}/fileadmin/_processed_/0/d/csm_judas_priest26_47424c35d1.jpg` },         // HAR7
  { name: 'Sepultura',    stage: STAGES.HARDER, start_time: t(D3n, 1, 0), end_time: t(D3n, 2,15), genre: 'Groove Metal',   image_url: `${WOA}/fileadmin/_processed_/6/1/csm_Sepultura-WOA26_f6b8328d6d.jpg` },        // HAR8 (01:00*–02:15*)

  // FASTER STAGE — Day 3
  { name: 'Gutalax',           stage: STAGES.FASTER, start_time: t(D3,12,30), end_time: t(D3,13,30),  genre: 'Goregrind',           image_url: `${WOA}/fileadmin/_processed_/f/4/csm_Gutalax-WOA26_6c3c4625c6.jpg` },        // FAS8
  { name: 'Paradise Lost',     stage: STAGES.FASTER, start_time: t(D3,14,30), end_time: t(D3,15,30),  genre: 'Gothic Metal',        image_url: `${WOA}/fileadmin/_processed_/8/a/csm_oaradise_lost_26_339356239c.jpg` },     // FAS9
  { name: 'Black Label Society',stage: STAGES.FASTER, start_time: t(D3,17, 0), end_time: t(D3,18, 0),  genre: 'Heavy Metal',         image_url: `${WOA}/fileadmin/_processed_/d/4/csm_Blacl_Label_Society_26_315019e5cb.jpg` }, // FAS10
  { name: 'In Flames',         stage: STAGES.FASTER, start_time: t(D3,19,45), end_time: t(D3,21,15),  genre: 'Melodic Death Metal', image_url: `${WOA}/fileadmin/_processed_/8/6/csm_In-Flames-WOA26_9e6947d658.jpg` },     // FAS11
  { name: 'Running Wild',      stage: STAGES.FASTER, start_time: t(D3,23,15), end_time: t(D3n, 0,45), genre: 'Speed Metal',         image_url: `${WOA}/fileadmin/_processed_/b/f/csm_Running_Wild-WOA26_5c9b78de18.jpg` },   // FAS12

  // LOUDER STAGE — Day 3
  { name: 'Mr. Hurley und die Pulveraffen', stage: STAGES.LOUDER, start_time: t(D3,12, 0), end_time: t(D3,13, 0),  genre: 'Pirate Metal',                  image_url: `${WOA}/fileadmin/_processed_/b/0/csm_mr_hurley_und_die_pulveraffen_26_39b0d12506.jpg` }, // LOU13
  { name: 'Future Palace',                  stage: STAGES.LOUDER, start_time: t(D3,13,45), end_time: t(D3,14,45),  genre: 'Metalcore',                     image_url: `${WOA}/fileadmin/_processed_/c/6/csm_Future_Palace-WOA26_03d8bb4d08.jpg` }, // LOU14
  { name: 'Mantar',                         stage: STAGES.LOUDER, start_time: t(D3,15,30), end_time: t(D3,16,30),  genre: 'Doom Metal',                    image_url: `${WOA}/fileadmin/_processed_/0/1/csm_Mantar-WOA26_41ea1e294a.jpg` }, // LOU15
  { name: 'Paleface Swiss',                 stage: STAGES.LOUDER, start_time: t(D3,17,15), end_time: t(D3,18,15),  genre: 'Metal',                         image_url: `${WOA}/fileadmin/_processed_/6/2/csm_Paleface_Swiss-WOA26_9755b4556f.jpg` }, // LOU16
  { name: 'Hatebreed',                      stage: STAGES.LOUDER, start_time: t(D3,19, 0), end_time: t(D3,20, 0),  genre: 'Metalcore',                     image_url: `${WOA}/fileadmin/_processed_/a/6/csm_hatebreed_26_1a7dea75de.jpg` }, // LOU17
  { name: 'Blood Fire Death',               stage: STAGES.LOUDER, start_time: t(D3,20,45), end_time: t(D3,22, 0),  genre: 'Black Metal (Bathory tribute)', image_url: `${WOA}/fileadmin/_processed_/5/d/csm_Blood_Fire_Death-WOA26_c420b03929.jpg` }, // LOU18
  { name: 'Emperor',                        stage: STAGES.LOUDER, start_time: t(D3,22,45), end_time: t(D3n, 0, 0), genre: 'Black Metal',                   image_url: `${WOA}/fileadmin/_processed_/d/2/csm_Emperor-WOA26_d4f869c941.jpg` }, // LOU19
  { name: 'Subway to Sally',                stage: STAGES.LOUDER, start_time: t(D3n, 0,45), end_time: t(D3n, 2, 0), genre: 'Medieval Rock',                 image_url: `${WOA}/fileadmin/_processed_/6/3/csm_subway_to_sally_26_c89a7c04fa.jpg` }, // LOU20

  // W.E.T. STAGE — Day 3
  { name: MTB,                  stage: STAGES.WET, start_time: t(D3,11, 0), end_time: t(D3,11,45),  genre: 'Metal Battle Award Ceremony', image_url: PLACEHOLDER },                                                                  // WET23
  { name: 'Employed to Serve',  stage: STAGES.WET, start_time: t(D3,13, 0), end_time: t(D3,13,45),  genre: 'Metalcore',                   image_url: `${WOA}/fileadmin/_processed_/a/a/csm_employed_to_serve26_631874c4dd.jpg` }, // WET24
  { name: 'Deafheaven',         stage: STAGES.WET, start_time: t(D3,15, 0), end_time: t(D3,15,45),  genre: 'Blackgaze',                   image_url: `${WOA}/fileadmin/_processed_/1/0/csm_deafheaven_26_4d801d532f.jpg` },        // WET25
  { name: 'The Haunted',        stage: STAGES.WET, start_time: t(D3,17, 0), end_time: t(D3,17,45),  genre: 'Melodic Death Metal',         image_url: `${WOA}/fileadmin/_processed_/d/3/csm_The_Haunted-WOA26_849d3b2a7e.jpg` },    // WET26
  { name: 'Animals as Leaders', stage: STAGES.WET, start_time: t(D3,19, 0), end_time: t(D3,19,45),  genre: 'Progressive Metal',           image_url: `${WOA}/fileadmin/_processed_/2/b/csm_animals_as_leaders26_0a9b3dfbf5.jpg` }, // WET27
  { name: 'Crematory',          stage: STAGES.WET, start_time: t(D3,21,15), end_time: t(D3,22,15),  genre: 'Gothic / Industrial Metal',   image_url: `${WOA}/fileadmin/_processed_/7/c/csm_crematory_26_8ae2e22d82.jpg` },         // WET28
  { name: 'Skynd',              stage: STAGES.WET, start_time: t(D3,23,45), end_time: t(D3n, 0,45), genre: 'Dark Electronic',             image_url: `${WOA}/fileadmin/_processed_/7/3/csm_skynd26_fdaccaa45e.jpg` },              // WET29

  // HEADBANGERS STAGE — Day 3
  { name: 'Ten56.',           stage: STAGES.HEADBANGERS, start_time: t(D3,12, 0), end_time: t(D3,12,45),  genre: 'Metalcore',              image_url: `${WOA}/fileadmin/_processed_/c/b/csm_Ten56-WOA26_515bdac59e.jpg` },            // HBA23
  { name: 'Grand Magus',      stage: STAGES.HEADBANGERS, start_time: t(D3,14, 0), end_time: t(D3,14,45),  genre: 'Heavy Metal',            image_url: `${WOA}/fileadmin/_processed_/2/a/csm_Grand_Magus-WOA26_00bbab917e.jpg` },      // HBA24
  { name: 'Any Given Day',    stage: STAGES.HEADBANGERS, start_time: t(D3,16, 0), end_time: t(D3,16,45),  genre: 'Metalcore',              image_url: `${WOA}/fileadmin/_processed_/d/f/csm_Any_given_Day-WOA26_45b0bb14e2.jpg` },    // HBA25
  { name: 'Pig Destroyer',    stage: STAGES.HEADBANGERS, start_time: t(D3,18, 0), end_time: t(D3,18,45),  genre: 'Grindcore',              image_url: `${WOA}/fileadmin/_processed_/7/9/csm_Pig_Destroyer-WOA26_111d076650.jpg` },    // HBA26
  { name: 'Bear McCreary',    stage: STAGES.HEADBANGERS, start_time: t(D3,20, 0), end_time: t(D3,21, 0),  genre: 'Orchestral / Film Music',image_url: `${WOA}/fileadmin/_processed_/a/e/csm_bear_mccreary_26b_802dfd47bf.jpg` },     // HBA27
  { name: 'Bleed from Within',stage: STAGES.HEADBANGERS, start_time: t(D3,22,30), end_time: t(D3,23,30),  genre: 'Metalcore',              image_url: `${WOA}/fileadmin/_processed_/c/6/csm_bleed_from_within_26_c38f26c402.jpg` },  // HBA28
  { name: 'Alcest',           stage: STAGES.HEADBANGERS, start_time: t(D3n, 1, 0), end_time: t(D3n, 2, 0), genre: 'Post-Black Metal',      image_url: `${WOA}/fileadmin/_processed_/d/2/csm_alcest_26_ca67b9d832.jpg` },              // HBA29

  // WASTELAND STAGE — Day 3
  { name: 'Heartless Human Harvest', stage: STAGES.WASTELAND, start_time: t(D3,14, 0), end_time: t(D3,14,30),  genre: 'Death Metal',         image_url: `${WOA}/fileadmin/_processed_/b/9/csm_heartless_human_harvest_26_5c7a455a4e.jpg` }, // WAS16
  { name: 'Cursed Abyss',            stage: STAGES.WASTELAND, start_time: t(D3,15, 0), end_time: t(D3,15,30),  genre: 'Black Metal',         image_url: `${WOA}/fileadmin/_processed_/e/d/csm_cursed_abyss_26_924d9b9653.jpg` },             // WAS17
  { name: 'Chaosbay',                stage: STAGES.WASTELAND, start_time: t(D3,16, 0), end_time: t(D3,16,45),  genre: 'Melodic Death Metal', image_url: `${WOA}/fileadmin/_processed_/c/8/csm_chaos_bay_26_6d40a05540.jpg` },                // WAS18
  { name: 'Luna Kills',              stage: STAGES.WASTELAND, start_time: t(D3,17,15), end_time: t(D3,18, 0),  genre: 'Symphonic Metal',     image_url: `${WOA}/fileadmin/_processed_/3/3/csm_Luna_Kills-WOA26_9c2715ab09.jpg` },            // WAS19
  { name: 'Insanity Alert',          stage: STAGES.WASTELAND, start_time: t(D3,18,30), end_time: t(D3,19,15),  genre: 'Crossover Thrash',    image_url: `${WOA}/fileadmin/_processed_/a/3/csm_Insanity_Alert-WOA26_32944b8820.jpg` },        // WAS20
  { name: 'Arroganz',                stage: STAGES.WASTELAND, start_time: t(D3,19,45), end_time: t(D3,20,45),  genre: 'Metal',               image_url: `${WOA}/fileadmin/_processed_/6/f/csm_arroganz_26b_b0fc829592.jpg` },                // WAS21
  { name: 'Divlje Jagode',           stage: STAGES.WASTELAND, start_time: t(D3,21,15), end_time: t(D3,22,15),  genre: 'Hard Rock',           image_url: `${WOA}/fileadmin/_processed_/5/0/csm_divlje_jagode_26_e0a2c64203.jpg` },             // WAS22
  { name: 'Alfahanne',               stage: STAGES.WASTELAND, start_time: t(D3,23, 0), end_time: t(D3n, 0, 0), genre: 'Black Metal',         image_url: `${WOA}/fileadmin/_processed_/b/6/csm_alfahanne_26_9c1f0784c4.jpg` },                 // WAS23

  // WACKINGER STAGE — Day 3
  { name: 'tuXedoo',         stage: STAGES.WACKINGER, start_time: t(D3,12, 0), end_time: t(D3,12,45), genre: 'Heavy Metal',         image_url: `${WOA}/fileadmin/_processed_/a/b/csm_tuxedoo_26_2cbaa64988.jpg` },              // WAK15
  { name: 'Blaas of Glory',  stage: STAGES.WACKINGER, start_time: t(D3,13,15), end_time: t(D3,13,45), genre: 'Folk / Brass Metal',  image_url: `${WOA}/fileadmin/_processed_/e/5/csm_blaas_of_glory_26_f53a31927e.jpg` },         // WAK16
  { name: 'Metaklapa',       stage: STAGES.WACKINGER, start_time: t(D3,14,15), end_time: t(D3,15, 0), genre: 'Folk',                image_url: `${WOA}/fileadmin/_processed_/8/7/csm_metaklapa_2024_ec19d5fd80.jpg` },            // WAK17
  { name: 'Trold',           stage: STAGES.WACKINGER, start_time: t(D3,15,30), end_time: t(D3,16,15), genre: 'Black Metal',         image_url: `${WOA}/fileadmin/_processed_/7/2/csm_trold_26_e2d88c204e.jpg` },                  // WAK18
  { name: 'Cruachan',        stage: STAGES.WACKINGER, start_time: t(D3,17, 0), end_time: t(D3,18, 0), genre: 'Folk Metal',          image_url: `${WOA}/fileadmin/_processed_/4/0/csm_cruachan_26_fe9f62c6a3.jpg` },               // WAK19
  { name: 'Eläkeläiset',     stage: STAGES.WACKINGER, start_time: t(D3,18,45), end_time: t(D3,19,45), genre: 'Humppa',              image_url: `${WOA}/fileadmin/_processed_/e/d/csm_Elaekelaeiset-WOA26_0517340ca3.jpg` },        // WAK20
  { name: 'Dubioza Kolektiv',stage: STAGES.WACKINGER, start_time: t(D3,20,30), end_time: t(D3,21,30), genre: 'Ska / Reggae Metal',  image_url: `${WOA}/fileadmin/_processed_/e/8/csm_dubioza_kollektiv26_190126a762.jpg` },        // WAK21
  { name: 'Faun',            stage: STAGES.WACKINGER, start_time: t(D3,22,15), end_time: t(D3,23,15), genre: 'Folk',                image_url: `${WOA}/fileadmin/_processed_/2/4/csm_Faun2-WOA26_dec165b202.jpg` },                 // WAK22

  // WELCOME TO THE JUNGLE — Day 3
  // JUN5 — dropped (Name = TBD in lineup.md)

  // ═══════════════════════════════════════════════════════
  // DAY 4 — Saturday 1 August
  // (Closing ceremony "Farewell & Announcements" is HAR13, between HAR12 Arch Enemy and HAR14 Sabaton.)
  // ═══════════════════════════════════════════════════════

  // HARDER STAGE — Day 4
  { name: 'Heavysaurus',   stage: STAGES.HARDER, start_time: t(D4,11,30), end_time: t(D4,12,15),  genre: "Children's Metal",    image_url: `${WOA}/fileadmin/_processed_/3/0/csm_heavysaurus_26_9d1aa2a6db.jpg` },     // HAR9
  { name: 'Orbit Culture', stage: STAGES.HARDER, start_time: t(D4,13,45), end_time: t(D4,14,45),  genre: 'Melodic Death Metal', image_url: `${WOA}/fileadmin/_processed_/d/c/csm_Orbit_Culture-WOA26_e0ccb2b84a.jpg` }, // HAR10
  { name: 'Lamb of God',   stage: STAGES.HARDER, start_time: t(D4,16,15), end_time: t(D4,17,15),  genre: 'Groove Metal',        image_url: `${WOA}/fileadmin/_processed_/7/4/csm_lamb_of_god_26b_d0cd004159.jpg` },    // HAR11
  { name: 'Arch Enemy',    stage: STAGES.HARDER, start_time: t(D4,19, 0), end_time: t(D4,20,30),  genre: 'Melodic Death Metal', image_url: `${WOA}/fileadmin/_processed_/c/c/csm_arch_enemy_26c_e1e9c04c76.jpg` },     // HAR12

  // HAR13 — Closing ceremony (category: 'ceremony' — excluded from /popular and badge conditions).
  {
    name:       'Farewell & Announcements',
    stage:      STAGES.HARDER,
    start_time: t(D4, 22, 30),
    end_time:   t(D4, 23,  0),
    genre:      null,
    image_url:  '/ceremony-farewell.png',
    category:   'ceremony',
  },                                                                                                                                                                                                                                       // HAR13

  { name: 'Sabaton', stage: STAGES.HARDER, start_time: t(D4,23, 0), end_time: t(D4n, 0,45),  genre: 'Power Metal', image_url: `${WOA}/fileadmin/_processed_/a/4/csm_sabaton_26_143decf5a4.jpg` }, // HAR14

  // FASTER STAGE — Day 4
  { name: 'Kim Dracula', stage: STAGES.FASTER, start_time: t(D4,12,30), end_time: t(D4,13,30),  genre: 'Alternative Metal',  image_url: `${WOA}/fileadmin/_processed_/3/4/csm_kim_dracula26_6085add158.jpg` }, // FAS13
  { name: 'Nevermore',   stage: STAGES.FASTER, start_time: t(D4,15, 0), end_time: t(D4,16, 0),  genre: 'Progressive Metal',  image_url: `${WOA}/fileadmin/_processed_/6/6/csm_nevermore_26b_55b9630985.jpg` }, // FAS14
  { name: 'Airbourne',   stage: STAGES.FASTER, start_time: t(D4,17,30), end_time: t(D4,18,45),  genre: 'Party Metal',        image_url: `${WOA}/fileadmin/_processed_/d/e/csm_Airborn-WOA26_24e9c1f588.jpg` },  // FAS15
  { name: 'Powerwolf',   stage: STAGES.FASTER, start_time: t(D4,20,45), end_time: t(D4,22,30),  genre: 'Power Metal',        image_url: `${WOA}/fileadmin/_processed_/9/f/csm_Powerwolf-WOA26_acf32b8b68.jpg` }, // FAS16
  { name: 'Alestorm',    stage: STAGES.FASTER, start_time: t(D4n, 1, 0), end_time: t(D4n, 2, 0), genre: 'Party Metal',        image_url: `${WOA}/fileadmin/_processed_/6/d/csm_alestorm_26_9ddf45fa2e.jpg` },     // FAS17 (01:00*–02:00*)

  // LOUDER STAGE — Day 4
  // LOU21 — dropped (Name = TBD in lineup.md)
  { name: 'Kittie',             stage: STAGES.LOUDER, start_time: t(D4,13,45), end_time: t(D4,14,45),  genre: 'Heavy Metal',         image_url: `${WOA}/fileadmin/_processed_/d/6/csm_kittie_26_31697daab6.jpg` },              // LOU22
  { name: 'Thrown',             stage: STAGES.LOUDER, start_time: t(D4,15,30), end_time: t(D4,16,30),  genre: 'Post-Metal',          image_url: `${WOA}/fileadmin/_processed_/4/9/csm_Thrown-WOA26_f70cc40622.jpg` },           // LOU23
  { name: 'Of Mice and Men',    stage: STAGES.LOUDER, start_time: t(D4,17,15), end_time: t(D4,18,15),  genre: 'Metalcore',           image_url: `${WOA}/fileadmin/_processed_/5/2/csm_of_mice_and_men_26_26aab5f25c.jpg` },     // LOU24
  { name: 'Kärbholz',           stage: STAGES.LOUDER, start_time: t(D4,19, 0), end_time: t(D4,20, 0),  genre: 'Folk Punk',           image_url: `${WOA}/fileadmin/_processed_/7/4/csm_kaerbholz_26_85a563b793.jpg` },           // LOU25
  { name: 'Thy Art Is Murder',  stage: STAGES.LOUDER, start_time: t(D4,20,45), end_time: t(D4,21,45),  genre: 'Deathcore',           image_url: `${WOA}/fileadmin/_processed_/8/0/csm_thy_art_is_murder_26_9e88fcd95e.jpg` },   // LOU26
  { name: 'Triptykon',          stage: STAGES.LOUDER, start_time: t(D4,22,45), end_time: t(D4n, 0, 0), genre: 'Black / Doom Metal',  image_url: `${WOA}/fileadmin/_processed_/3/c/csm_Triptykon-WOA26_0599ad9698.jpg` },         // LOU27

  // W.E.T. STAGE — Day 4
  // WET30 — dropped (Name = TBD in lineup.md)
  { name: 'Blood Command',          stage: STAGES.WET, start_time: t(D4,13, 0), end_time: t(D4,13,45),  genre: 'Punk Metal',       image_url: `${WOA}/fileadmin/_processed_/e/8/csm_Blood_Command-WOA26_f82b942e22.jpg` },      // WET31
  { name: 'Our Promise',            stage: STAGES.WET, start_time: t(D4,15, 0), end_time: t(D4,15,45),  genre: 'Metal',            image_url: `${WOA}/fileadmin/_processed_/a/0/csm_our_promise_26_661c3c384d.jpg` },             // WET32
  { name: 'Hardline',               stage: STAGES.WET, start_time: t(D4,17, 0), end_time: t(D4,17,45),  genre: 'AOR / Hard Rock',  image_url: `${WOA}/fileadmin/_processed_/c/5/csm_hardline_26_73180980cd.jpg` },                // WET33
  { name: 'Lagwagon',               stage: STAGES.WET, start_time: t(D4,19, 0), end_time: t(D4,19,45),  genre: 'Melodic Hardcore', image_url: `${WOA}/fileadmin/_processed_/a/e/csm_lagwagon26_9b4cccaa2b.jpg` },                 // WET34
  { name: 'Corrosion of Conformity',stage: STAGES.WET, start_time: t(D4,21,15), end_time: t(D4,22,15),  genre: 'Sludge Metal',     image_url: `${WOA}/fileadmin/_processed_/0/b/csm_corrosion_of_conformity_26_8ba7dabe09.jpg` }, // WET35
  { name: 'Fit For An Autopsy',     stage: STAGES.WET, start_time: t(D4,23,45), end_time: t(D4n, 0,45), genre: 'Death Metal',      image_url: `${WOA}/fileadmin/_processed_/b/7/csm_fit_for_an_autopsy_26_1695f9334e.jpg` },      // WET36

  // HEADBANGERS STAGE — Day 4
  { name: 'Focus.',           stage: STAGES.HEADBANGERS, start_time: t(D4,12, 0), end_time: t(D4,12,45),  genre: TBD_GENRE,           image_url: `${WOA}/fileadmin/_processed_/8/9/csm_focus_26_a98ab7e760.jpg` },             // HBA30
  { name: 'Crimson Glory',    stage: STAGES.HEADBANGERS, start_time: t(D4,14, 0), end_time: t(D4,14,45),  genre: 'Progressive Metal', image_url: `${WOA}/fileadmin/_processed_/8/2/csm_crimson_glory_26_59c22b790e.jpg` },     // HBA31
  { name: 'Angelus Apatrida', stage: STAGES.HEADBANGERS, start_time: t(D4,16, 0), end_time: t(D4,16,45),  genre: 'Thrash Metal',      image_url: `${WOA}/fileadmin/_processed_/d/0/csm_angelus_apatrida_26_0bf97316dd.jpg` },  // HBA32
  { name: 'Municipal Waste',  stage: STAGES.HEADBANGERS, start_time: t(D4,18, 0), end_time: t(D4,18,45),  genre: 'Thrash Metal',      image_url: `${WOA}/fileadmin/_processed_/4/1/csm_municipal_waste26_b40cb13d64.jpg` },     // HBA33
  { name: 'Dritte Wahl',      stage: STAGES.HEADBANGERS, start_time: t(D4,20, 0), end_time: t(D4,21, 0),  genre: 'Punk',              image_url: `${WOA}/fileadmin/_processed_/f/8/csm_Dritte_Wahl_26_89eac3e241.jpg` },        // HBA34
  { name: 'Vended',           stage: STAGES.HEADBANGERS, start_time: t(D4,22,30), end_time: t(D4,23,30),  genre: 'Nu Metal',          image_url: `${WOA}/fileadmin/_processed_/0/7/csm_vended_26_a96222e9bb.jpg` },             // HBA35
  { name: 'The Limit',        stage: STAGES.HEADBANGERS, start_time: t(D4n, 1, 0), end_time: t(D4n, 2, 0), genre: TBD_GENRE,          image_url: `${WOA}/fileadmin/_processed_/b/6/csm_the_limit_26_954965f6df.jpg` },          // HBA36

  // WASTELAND STAGE — Day 4
  // WAS24 — dropped (Name = TBD in lineup.md)
  { name: 'Stonem',     stage: STAGES.WASTELAND, start_time: t(D4,15, 0), end_time: t(D4,15,30),  genre: 'Metal',        image_url: `${WOA}/fileadmin/_processed_/4/9/csm_stonem_26_e1ff4b71dd.jpg` }, // WAS25
  { name: 'Asrock',     stage: STAGES.WASTELAND, start_time: t(D4,16, 0), end_time: t(D4,16,45),  genre: 'Metal',        image_url: `${WOA}/fileadmin/_processed_/c/a/csm_asrock_26_85c4a23518.jpg` },  // WAS26
  { name: 'Allt',       stage: STAGES.WASTELAND, start_time: t(D4,17,15), end_time: t(D4,18, 0),  genre: 'Black Metal',  image_url: `${WOA}/fileadmin/_processed_/a/f/csm_Allt-WOA26_20072966da.jpg` },  // WAS27
  { name: 'The Other',  stage: STAGES.WASTELAND, start_time: t(D4,18,30), end_time: t(D4,19,15),  genre: 'Horror Punk',  image_url: `${WOA}/fileadmin/_processed_/4/8/csm_the_other_26_bb6a90d46d.jpg` },// WAS28
  { name: 'Castle Rat', stage: STAGES.WASTELAND, start_time: t(D4,19,45), end_time: t(D4,20,45),  genre: 'Heavy Metal',  image_url: `${WOA}/fileadmin/_processed_/f/3/csm_castle_Rat_26_29b54db683.jpg` }, // WAS29
  { name: 'Guilt Trip', stage: STAGES.WASTELAND, start_time: t(D4,21,15), end_time: t(D4,22,15),  genre: 'Metal',        image_url: `${WOA}/fileadmin/_processed_/d/b/csm_guilt_trip_26_524191a47e.jpg` }, // WAS30
  { name: 'Hackneyed',  stage: STAGES.WASTELAND, start_time: t(D4,23, 0), end_time: t(D4n, 0, 0), genre: 'Death Metal',  image_url: `${WOA}/fileadmin/_processed_/3/f/csm_hacknayed_26_2bf550c457.jpg` },  // WAS31
  // WAS32 — dropped (Name = TBD in lineup.md)

  // WACKINGER STAGE — Day 4
  { name: 'Wacken Firefighters',    stage: STAGES.WACKINGER, start_time: t(D4,12, 0), end_time: t(D4,12,45), genre: TBD_GENRE,         image_url: `${WOA}/fileadmin/_processed_/0/6/csm_wacken_firefighters_25_5f6d39317e.jpg` }, // WAK23
  { name: 'Minotaurus',             stage: STAGES.WACKINGER, start_time: t(D4,13,30), end_time: t(D4,14,15), genre: TBD_GENRE,         image_url: `${WOA}/fileadmin/_processed_/9/0/csm_minotaurus_26_1ab67a12ae.jpg` },          // WAK24
  { name: 'Dieter "Maschine" Birr', stage: STAGES.WACKINGER, start_time: t(D4,15, 0), end_time: t(D4,16, 0), genre: TBD_GENRE,         image_url: `${WOA}/fileadmin/_processed_/e/5/csm_dieter_maschine_birr_26b_a569706c0c.jpg` }, // WAK25
  { name: 'Zeltinger Band',         stage: STAGES.WACKINGER, start_time: t(D4,16,45), end_time: t(D4,17,45), genre: TBD_GENRE,         image_url: `${WOA}/fileadmin/_processed_/1/0/csm_zeltinger_26_74420c1905.jpg` },           // WAK26
  { name: 'Ad Infinitum',           stage: STAGES.WACKINGER, start_time: t(D4,18,30), end_time: t(D4,19,30), genre: 'Symphonic Metal', image_url: `${WOA}/fileadmin/_processed_/f/a/csm_ad_infinitum_26_cb9028b792.jpg` },         // WAK27
  { name: 'Finsterforst',           stage: STAGES.WACKINGER, start_time: t(D4,20,15), end_time: t(D4,21,15), genre: 'Folk Metal',      image_url: `${WOA}/fileadmin/_processed_/b/8/csm_finsterforst_26_1eb394d15b.jpg` },         // WAK28
  { name: 'Einherjer',              stage: STAGES.WACKINGER, start_time: t(D4,22,15), end_time: t(D4,23,15), genre: 'Viking Metal',    image_url: `${WOA}/fileadmin/_processed_/c/2/csm_Einherjer-WOA26_9393fba15b.jpg` },          // WAK29

  // WELCOME TO THE JUNGLE — Day 4
  // JUN6, JUN7, JUN8 — dropped (Name = TBD in lineup.md)
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function countBands(
  supabase: ReturnType<typeof createClient>,
): Promise<number> {
  const { count, error } = await supabase
    .from('bands')
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Count failed:', error.message);
    process.exit(1);
  }
  return count ?? 0;
}

async function seed() {
  loadEnvFile();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const force = process.argv.includes('--force');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── Step 1: announce destructive intent ─────────────────────────────────
  console.log('━'.repeat(72));
  console.log('Wacken 2026 lineup seed — DESTRUCTIVE');
  console.log('━'.repeat(72));
  console.log(`Target:        ${supabaseUrl}`);
  console.log(`Bands to seed: ${bands.length} (from supabase/seed/bands.ts)`);

  const existing = await countBands(supabase);
  console.log(`Existing rows in public.bands: ${existing}`);
  console.log('');
  console.log('This will:');
  console.log('  • DELETE every row in public.bands');
  console.log('  • CASCADE-delete every row in public.user_picks');
  console.log('  • CASCADE-delete every row in public.user_missed_bands');
  console.log('  • NULL out live_band_test_config.band_id');
  console.log(`  • INSERT ${bands.length} fresh rows from lineup.md`);
  console.log('');

  if (!force) {
    console.log('Starting in 5s — press Ctrl-C to abort, or rerun with --force to skip wait.');
    await new Promise((r) => setTimeout(r, 5000));
  }

  // ── Step 2: delete everything ───────────────────────────────────────────
  // `.gte('start_time', '1900-01-01')` matches every row (start_time is NOT NULL).
  console.log('Deleting all rows in public.bands…');
  const { error: delError } = await supabase
    .from('bands')
    .delete()
    .gte('start_time', '1900-01-01T00:00:00Z');
  if (delError) {
    console.error('Delete failed:', delError.message);
    process.exit(1);
  }

  const afterDelete = await countBands(supabase);
  if (afterDelete !== 0) {
    console.error(
      `Delete verification failed — expected 0 rows, found ${afterDelete}.`,
    );
    process.exit(1);
  }
  console.log(`  Deleted ${existing} rows · table is now empty ✓`);

  // ── Step 3: insert fresh data ───────────────────────────────────────────
  console.log(`Inserting ${bands.length} bands…`);
  const { error: insError } = await supabase.from('bands').insert(bands);
  if (insError) {
    console.error('Insert failed:', insError.message);
    process.exit(1);
  }

  const afterInsert = await countBands(supabase);
  if (afterInsert !== bands.length) {
    console.error(
      `Insert verification failed — expected ${bands.length} rows, found ${afterInsert}.`,
    );
    process.exit(1);
  }
  console.log(`  Inserted ${bands.length} rows · verified ✓`);

  console.log('');
  console.log('Done 🤘');
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  seed();
}
