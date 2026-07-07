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
 *   - Slots whose `Band Status` is `TDB MTB` ARE seeded with the literal name
 *     `TDB MTB` (`MTB` constant), genre from lineup.md, and `image_url =
 *     PLACEHOLDER`.
 *   - Slots whose `Band Status` is `UNCONFIRMED` (metal-battle.com winner, not
 *     yet on wacken.com) ARE seeded with the real band name and
 *     `image_url = PLACEHOLDER`. Promote to CONFIRMED when wacken.com publishes
 *     name + image — see Speak in Whispers (WET2).
 *   - Bands with `Band Status: TBD` keep their name but use PLACEHOLDER image.
 *   - Bands with `Genre: TBD` use the fallback genre `"Metal"`.
 *   - Each slot's start_time / end_time comes from stages.md (Slot ID → time).
 *
 * Expected row count after seed: **187** (each row declares `slot_id` explicitly)
 *   = 173 CONFIRMED + 12 UNCONFIRMED + 1 TDB MTB + 0 named TDB + 1 ceremony (HAR13 Farewell & Announcements).
 *
 * For small lineup edits (name, time, genre, image), use `npm run seed:bands:sync`
 * instead — it preserves user picks. This script is for festival reset only.
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
const TBD_GENRE = 'Metal';

// Literal name placeholder used for Metal Battle slots whose representative
// band has not yet been announced. Mirrors lineup.md exactly. Once a band is
// announced for one of these slots, edit both lineup.md and this file.
const MTB = 'TDB MTB';

export const EXPECTED_BAND_COUNT = 187;
export const SLOT_ID_RE = /^(HAR|FAS|LOU|WET|HBA|WAS|WAK|JUN)\d+$/;

export type BandSeed = {
  slot_id: string;
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
// Each row's slot_id matches the Slot ID in stages.md / lineup.md.
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
  { slot_id: 'FAS1', name: 'Lovebites',           stage: STAGES.FASTER, start_time: t(D1,16, 0), end_time: t(D1,17, 0),  genre: 'Heavy Metal',      image_url: `${WOA}/fileadmin/_processed_/8/d/csm_lovebites_26b_38ca926080.jpg` },          
  { slot_id: 'FAS2', name: 'The Butcher Sisters', stage: STAGES.FASTER, start_time: t(D1,18, 0), end_time: t(D1,19, 0),  genre: TBD_GENRE,          image_url: `${WOA}/fileadmin/_processed_/7/a/csm_the_butcher_sisters26_63acf7d891.jpg` }, 
  { slot_id: 'FAS3', name: 'Electric Bassboy',    stage: STAGES.FASTER, start_time: t(D1,20, 0), end_time: t(D1,21, 0),  genre: TBD_GENRE,          image_url: `${WOA}/fileadmin/_processed_/2/3/csm_electric_bassboy26_c1af9b52ad.jpg` },    
  { slot_id: 'FAS4', name: 'Hämatom',             stage: STAGES.FASTER, start_time: t(D1,22, 0), end_time: t(D1n, 0, 0), genre: 'Metal', image_url: `${WOA}/fileadmin/_processed_/5/e/csm_haematom_26_a104ede3d5.jpg` },          

  // LOUDER STAGE — Day 1
  { slot_id: 'LOU1', name: 'Broken By The Scream', stage: STAGES.LOUDER, start_time: t(D1,12, 0), end_time: t(D1,12,45), genre: 'Metal', image_url: `${WOA}/fileadmin/_processed_/6/5/csm_Broken_By_The_Scream-WOA26_8ad83f8245.jpg` }, 
  { slot_id: 'LOU2', name: 'Visions of Atlantis',  stage: STAGES.LOUDER, start_time: t(D1,13,30), end_time: t(D1,14,30), genre: 'Power Metal',  image_url: `${WOA}/fileadmin/_processed_/1/6/csm_visions_of_atlantis_26_2bfe817394.jpg` },     
  { slot_id: 'LOU3', name: 'Thundermother',        stage: STAGES.LOUDER, start_time: t(D1,15,15), end_time: t(D1,16,15), genre: 'Hard Rock',             image_url: `${WOA}/fileadmin/_processed_/9/a/csm_Thundermother-Band-2023_d61771d790.jpg` },     
  { slot_id: 'LOU4', name: 'The Hardkiss',         stage: STAGES.LOUDER, start_time: t(D1,17, 0), end_time: t(D1,18, 0), genre: 'Hard Rock',             image_url: `${WOA}/fileadmin/_processed_/9/8/csm_The_Hardkiss-WOA26_2db7165b54.jpg` },          
  { slot_id: 'LOU5', name: 'The Gathering',        stage: STAGES.LOUDER, start_time: t(D1,18,45), end_time: t(D1,20, 0), genre: 'Doom Metal',     image_url: `${WOA}/fileadmin/_processed_/0/2/csm_The_Gathering-WOA26_57ded7843d.jpg` },         
  { slot_id: 'LOU6', name: 'Lacuna Coil',          stage: STAGES.LOUDER, start_time: t(D1,21, 0), end_time: t(D1,22,30), genre: 'Doom Metal',     image_url: `${WOA}/fileadmin/_processed_/6/3/csm_lacuna_coil_26_289f52868d.jpg` },              

  // W.E.T. STAGE — Day 1
  { slot_id: 'WET1', name: 'Seers of Light',       stage: STAGES.WET, start_time: t(D1,11, 0), end_time: t(D1,11,20),  genre: 'Metal Battle',    image_url: `${WOA}/fileadmin/_processed_/5/1/csm_seers_of_light_26_d43bfa874a.jpg` },                                                                  
  { slot_id: 'WET2', name: 'Speak in Whispers',  stage: STAGES.WET, start_time: t(D1,11,50), end_time: t(D1,12,10),  genre: 'Metal Battle',     image_url: `${WOA}/fileadmin/_processed_/9/9/csm_speak_in_whispers_26_157b14e684.jpg` }, 
  { slot_id: 'WET3', name: 'I See Red',            stage: STAGES.WET, start_time: t(D1,12,40), end_time: t(D1,13, 0),  genre: 'Metal Battle',     image_url: `${WOA}/fileadmin/_processed_/2/7/csm_i_see_red_26_740c88bbf9.jpg` },                                                                  
  { slot_id: 'WET4', name: 'Goodnight Greatness',  stage: STAGES.WET, start_time: t(D1,13,30), end_time: t(D1,13,50),  genre: 'Metal Battle',     image_url: `${WOA}/fileadmin/_processed_/6/e/csm_goodnight_greatness_26_5e993ee771.jpg` },                                                                  
  { slot_id: 'WET5', name: "The Crescent's Call", stage: STAGES.WET, start_time: t(D1,14,20), end_time: t(D1,14,40),  genre: 'Metal Battle',    image_url: `${WOA}/fileadmin/_processed_/c/a/csm_The_Crescents_Call._26_ec89342cc5.jpg` },                                                                  
  { slot_id: 'WET6', name: 'Ashed Winter',         stage: STAGES.WET, start_time: t(D1,15,50), end_time: t(D1,16,10),  genre: 'Metal Battle',     image_url: `${WOA}/fileadmin/_processed_/b/4/csm_ashed_winter_26_9e44606ec2.jpg` },                                                                  
  { slot_id: 'WET7', name: 'Blanket Hill',         stage: STAGES.WET, start_time: t(D1,16,40), end_time: t(D1,17, 0),  genre: 'Metal Battle', image_url: `${WOA}/fileadmin/_processed_/b/8/csm_blanket_hill_26_0a741e61f3.jpg` },                                                                  
  { slot_id: 'WET8', name: 'Witchlords',           stage: STAGES.WET, start_time: t(D1,17,30), end_time: t(D1,17,50),  genre: 'Metal Battle',    image_url: `${WOA}/fileadmin/_processed_/1/9/csm_witchlords_26_c2f8cf6e6c.jpg` },                                                                  
  { slot_id: 'WET9', name: 'Elchivo',              stage: STAGES.WET, start_time: t(D1,18,20), end_time: t(D1,18,40),  genre: 'Metal Battle',     image_url: `${WOA}/fileadmin/_processed_/8/f/csm_elchivo_26_576ae82fc4.jpg` },                                                                  
  { slot_id: 'WET10', name: 'Morphide',             stage: STAGES.WET, start_time: t(D1,19,10), end_time: t(D1,19,30),  genre: 'Metal Battle',     image_url: `${WOA}/fileadmin/_processed_/8/e/csm_morphide_26_73f176435f.jpg` },                                                                  
  { slot_id: 'WET11', name: 'Velvet Rush',        stage: STAGES.WET, start_time: t(D1,20,15), end_time: t(D1,21, 0),  genre: 'Hard Rock',                     image_url: `${WOA}/fileadmin/_processed_/c/c/csm_velvet_rush_26_79ee43e0e7.jpg` },         
  { slot_id: 'WET12', name: 'Rose Tattoo',        stage: STAGES.WET, start_time: t(D1,22,45), end_time: t(D1n, 0, 0), genre: 'Hard Rock',               image_url: `${WOA}/fileadmin/_processed_/5/5/csm_rose_tattoo26_a5747c907d.jpg` },          

  // HEADBANGERS STAGE — Day 1
  { slot_id: 'HBA1', name: 'Gannondorf',           stage: STAGES.HEADBANGERS, start_time: t(D1,11,25), end_time: t(D1,11,45),  genre: 'Metal Battle',                  image_url: `${WOA}/fileadmin/_processed_/7/7/csm_ganondorf_26_282329a2d3.jpg` },                                                          
  { slot_id: 'HBA2', name: 'Born Broken',  stage: STAGES.HEADBANGERS, start_time: t(D1,12,15), end_time: t(D1,12,35),  genre: 'Metal Battle',               image_url: `${WOA}/fileadmin/_processed_/a/9/csm_born_broken_26_e3d993f78e.jpg` },                                                          
  { slot_id: 'HBA3', name: 'Human Nebula',         stage: STAGES.HEADBANGERS, start_time: t(D1,13, 5), end_time: t(D1,13,25),  genre: 'Metal Battle',   image_url: `${WOA}/fileadmin/_processed_/8/7/csm_human_nebula_26_595097da2b.jpg` },
  { slot_id: 'HBA4', name: 'Dead Memories',        stage: STAGES.HEADBANGERS, start_time: t(D1,13,55), end_time: t(D1,14,15),  genre: 'Metal Battle',              image_url: `${WOA}/fileadmin/_processed_/b/8/csm_dead_memories_26_6a49209120.jpg` },
  { slot_id: 'HBA5', name: 'Expellow',    stage: STAGES.HEADBANGERS, start_time: t(D1,14,45), end_time: t(D1,15,45),  genre: TBD_GENRE,                           image_url: `${WOA}/fileadmin/_processed_/b/b/csm_expellow_26b_f274263240.jpg` }, 
  { slot_id: 'HBA6', name: 'Sinamort',    stage: STAGES.HEADBANGERS, start_time: t(D1,16,15), end_time: t(D1,16,35),  genre: 'Metal Battle',            image_url: `${WOA}/fileadmin/_processed_/b/7/csm_sinamort_26_76b1458fee.jpg` },                                                          
  { slot_id: 'HBA7', name: 'Deflag',      stage: STAGES.HEADBANGERS, start_time: t(D1,17, 5), end_time: t(D1,17,25),  genre: 'Metal Battle',                image_url: `${WOA}/fileadmin/_processed_/5/b/csm_deflag_26_e9757893eb.jpg` },                                                          
  { slot_id: 'HBA8', name: 'Noiduin',              stage: STAGES.HEADBANGERS, start_time: t(D1,17,55), end_time: t(D1,18,15),  genre: 'Metal Battle',              image_url: `${WOA}/fileadmin/_processed_/e/c/csm_oiduim_26_38a376558c.jpg` },
  { slot_id: 'HBA9', name: 'Invasion',             stage: STAGES.HEADBANGERS, start_time: t(D1,18,45), end_time: t(D1,19, 5),  genre: 'Metal Battle',               image_url: `${WOA}/fileadmin/_processed_/6/7/csm_invasion_26_9270af2a05.jpg` },
  { slot_id: 'HBA10', name: 'SÓT',         stage: STAGES.HEADBANGERS, start_time: t(D1,19,35), end_time: t(D1,19,55),  genre: 'Metal Battle',              image_url: `${WOA}/fileadmin/_processed_/b/6/csm_sot_26_0252001d7e.jpg` },                                                          
  { slot_id: 'HBA11', name: 'Kadavar',     stage: STAGES.HEADBANGERS, start_time: t(D1,21,15), end_time: t(D1,22,30),  genre: 'Doom Metal',                       image_url: `${WOA}/fileadmin/_processed_/f/9/csm_kadavar_26b_5241b42bda.jpg` },  
  { slot_id: 'HBA12', name: 'Mambo Kurt',  stage: STAGES.HEADBANGERS, start_time: t(D1n, 0,15), end_time: t(D1n, 1, 0), genre: TBD_GENRE,                          image_url: `${WOA}/fileadmin/_processed_/f/4/csm_mambo_kurt_25_d25410db45.jpg` }, 

  // WASTELAND STAGE — Day 1
  { slot_id: 'WAS1', name: 'Diabolisches Werk',  stage: STAGES.WASTELAND, start_time: t(D1,14, 0), end_time: t(D1,14,45),  genre: TBD_GENRE,      image_url: `${WOA}/fileadmin/_processed_/8/3/csm_diabolisches_werk_26_584e2240f9.jpg` }, 
  { slot_id: 'WAS2', name: 'Battlecreek',        stage: STAGES.WASTELAND, start_time: t(D1,15,30), end_time: t(D1,16,15),  genre: TBD_GENRE,      image_url: `${WOA}/fileadmin/_processed_/5/e/csm_Battlecreek-WOA26_ebdf45051d.jpg` },     
  { slot_id: 'WAS3', name: 'Poison The Preacher',stage: STAGES.WASTELAND, start_time: t(D1,17, 0), end_time: t(D1,17,45),  genre: 'Metal',        image_url: `${WOA}/fileadmin/_processed_/5/c/csm_poison_the_preacher_26_719f682a4a.jpg` }, 
  { slot_id: 'WAS4', name: 'Phantom',            stage: STAGES.WASTELAND, start_time: t(D1,18,30), end_time: t(D1,19,15),  genre: 'Heavy Metal',  image_url: `${WOA}/fileadmin/_processed_/c/7/csm_phantom_26_2946b95d36.jpg` },             
  { slot_id: 'WAS5', name: 'Crypt Sermon',       stage: STAGES.WASTELAND, start_time: t(D1,20, 0), end_time: t(D1,20,45),  genre: 'Doom Metal',   image_url: `${WOA}/fileadmin/_processed_/4/4/csm_crypt_sermon_26_25a80f0eed.jpg` },        
  { slot_id: 'WAS6', name: 'The Troops Of Doom', stage: STAGES.WASTELAND, start_time: t(D1,21,30), end_time: t(D1,22,15),  genre: 'Thrash Metal', image_url: `${WOA}/fileadmin/_processed_/6/6/csm_troops_of_doom26_13f1c1c107.jpg` },        
  { slot_id: 'WAS7', name: 'Sacred Steel',       stage: STAGES.WASTELAND, start_time: t(D1,23, 0), end_time: t(D1n, 0, 0), genre: 'Power Metal',  image_url: `${WOA}/fileadmin/_processed_/d/0/csm_sacred_steel_26_78f1daf932.jpg` },         

  // WACKINGER STAGE — Day 1
  { slot_id: 'WAK1', name: 'Wacken Firefighters',   stage: STAGES.WACKINGER, start_time: t(D1,12, 0), end_time: t(D1,12,45), genre: TBD_GENRE,           image_url: `${WOA}/fileadmin/_processed_/0/6/csm_wacken_firefighters_25_5f6d39317e.jpg` }, 
  { slot_id: 'WAK2', name: 'Alien Rockin Explosion',stage: STAGES.WACKINGER, start_time: t(D1,13,30), end_time: t(D1,14,15), genre: 'Hard Rock',              image_url: `${WOA}/fileadmin/_processed_/a/4/csm_alien_rockin_explosion_26_dba5a44bfe.jpg` }, 
  { slot_id: 'WAK3', name: '5th Avenue',            stage: STAGES.WACKINGER, start_time: t(D1,15, 0), end_time: t(D1,16, 0), genre: TBD_GENRE,           image_url: `${WOA}/fileadmin/_processed_/5/f/csm_5th_Avenue25_9d44c97386.jpg` },               
  { slot_id: 'WAK4', name: 'Ricky Warwick',         stage: STAGES.WACKINGER, start_time: t(D1,16,45), end_time: t(D1,17,45), genre: 'Hard Rock',         image_url: `${WOA}/fileadmin/_processed_/9/d/csm_ricky_warwick26c_9f35eea5b5.jpg` },           
  { slot_id: 'WAK5', name: 'Vanir',                 stage: STAGES.WACKINGER, start_time: t(D1,18,30), end_time: t(D1,19,30), genre: 'Black Metal',      image_url: `${WOA}/fileadmin/_processed_/0/f/csm_vanir_26_4989af5ab2.jpg` },                   
  { slot_id: 'WAK6', name: 'Dirty Shirt',           stage: STAGES.WACKINGER, start_time: t(D1,20,15), end_time: t(D1,21,15), genre: 'Thrash Metal',   image_url: `${WOA}/fileadmin/_processed_/8/d/csm_dirty_Shirt_26_d6b1aa60da.jpg` },             
  { slot_id: 'WAK7', name: 'Unzucht',               stage: STAGES.WACKINGER, start_time: t(D1,22,15), end_time: t(D1,23,15), genre: 'Metal', image_url: `${WOA}/fileadmin/_processed_/b/2/csm_unzucht_26_5662cb7925.jpg` },              

  // WELCOME TO THE JUNGLE — Day 1
  // JUN1, JUN2 — dropped (Name = TBD in lineup.md)

  // ═══════════════════════════════════════════════════════
  // DAY 2 — Thursday 30 July
  // ═══════════════════════════════════════════════════════

  // HARDER STAGE — Day 2
  { slot_id: 'HAR1', name: 'Uli Jon Roth', stage: STAGES.HARDER, start_time: t(D2,16,15), end_time: t(D2,17,15),  genre: 'Hard Rock',       image_url: `${WOA}/fileadmin/_processed_/3/b/csm_uli_jon_roth26_db0812a7ce.jpg` },     
  { slot_id: 'HAR2', name: 'Europe',       stage: STAGES.HARDER, start_time: t(D2,19, 0), end_time: t(D2,20,15),  genre: 'Hard Rock',  image_url: `${WOA}/fileadmin/_processed_/5/3/csm_Europe-WOA26_9d76063492.jpg` },        
  { slot_id: 'HAR3', name: 'Def Leppard',  stage: STAGES.HARDER, start_time: t(D2,22,15), end_time: t(D2n, 0, 0), genre: 'Hard Rock',  image_url: `${WOA}/fileadmin/_processed_/3/4/csm_Def_Leppard-WOA26_27e5f4ed42.jpg` },   

  // FASTER STAGE — Day 2
  { slot_id: 'FAS5', name: 'Skyline',          stage: STAGES.FASTER, start_time: t(D2,15, 0), end_time: t(D2,16, 0),  genre: TBD_GENRE,           image_url: `${WOA}/fileadmin/_processed_/6/5/csm_skyline_2024_a76c70015c.jpg` },          
  { slot_id: 'FAS6', name: 'Yngwie Malmsteen', stage: STAGES.FASTER, start_time: t(D2,17,30), end_time: t(D2,18,45),  genre: 'Heavy Metal',image_url: `${WOA}/fileadmin/_processed_/9/0/csm_yngwie_malmsteen_26_451945c4f5.jpg` }, 
  { slot_id: 'FAS7', name: 'Savatage',         stage: STAGES.FASTER, start_time: t(D2,20,30), end_time: t(D2,22, 0),  genre: 'Heavy Metal',       image_url: `${WOA}/fileadmin/_processed_/9/9/csm_Savatage-WOA26_6be2e38515.jpg` },     

  // LOUDER STAGE — Day 2
  { slot_id: 'LOU7', name: 'Alien Ant Farm', stage: STAGES.LOUDER, start_time: t(D2,12, 0), end_time: t(D2,13, 0),  genre: 'Hard Rock', image_url: `${WOA}/fileadmin/_processed_/a/b/csm_alien_ant_farm_26_f4695d8f52.jpg` }, 
  { slot_id: 'LOU8', name: 'H-Blockx',       stage: STAGES.LOUDER, start_time: t(D2,13,45), end_time: t(D2,14,45),  genre: 'Metal',        image_url: `${WOA}/fileadmin/_processed_/c/7/csm_H_Blockx-WOA26_c10c9dda61.jpg` },    
  { slot_id: 'LOU9', name: 'Therapy?',       stage: STAGES.LOUDER, start_time: t(D2,15,30), end_time: t(D2,16,30),  genre: 'Hard Rock', image_url: `${WOA}/fileadmin/_processed_/8/5/csm_therapy26_acbd2ac94b.jpg` },         
  { slot_id: 'LOU10', name: 'Life of Agony',  stage: STAGES.LOUDER, start_time: t(D2,17,30), end_time: t(D2,18,45),  genre: 'Metal',image_url: `${WOA}/fileadmin/_processed_/9/4/csm_life_of_agony26_68ef27b061.jpg` },  
  { slot_id: 'LOU11', name: 'P.O.D.',         stage: STAGES.LOUDER, start_time: t(D2,19,45), end_time: t(D2,21, 0),  genre: 'Metal',         image_url: `${WOA}/fileadmin/_processed_/f/0/csm_POD_26_52d8ce1512.jpg` },          
  { slot_id: 'LOU12', name: 'Turbonegro',     stage: STAGES.LOUDER, start_time: t(D2,22, 0), end_time: t(D2,23,30),  genre: 'Punk',        image_url: `${WOA}/fileadmin/_processed_/1/b/csm_turbonegro26_2118d824cd.jpg` },     

  // W.E.T. STAGE — Day 2
  { slot_id: 'WET13', name: 'E.N.D.',                stage: STAGES.WET, start_time: t(D2,11, 0), end_time: t(D2,11,20),  genre: 'Metal Battle', image_url: `${WOA}/fileadmin/_processed_/f/a/csm_end_26_cc8178d602.jpg` }, 
  { slot_id: 'WET14', name: 'Haine',                 stage: STAGES.WET, start_time: t(D2,11,50), end_time: t(D2,12,10),  genre: 'Metal Battle',          image_url: `${WOA}/fileadmin/_processed_/2/c/csm_haine_26_0e543cf557.jpg` }, 
  { slot_id: 'WET15', name: 'Death Row',              stage: STAGES.WET, start_time: t(D2,12,40), end_time: t(D2,13, 0),  genre: 'Metal Battle',       image_url: `${WOA}/fileadmin/_processed_/1/6/csm_death_row_26_1520597d2a.jpg` },
  { slot_id: 'WET16', name: 'Sentient Void',          stage: STAGES.WET, start_time: t(D2,13,30), end_time: t(D2,13,50),  genre: 'Metal Battle',    image_url: `${WOA}/fileadmin/_processed_/6/4/csm_sentient_void_26_5fec72603f.jpg` },
  { slot_id: 'WET17', name: 'Given By The Flames',   stage: STAGES.WET, start_time: t(D2,14,20), end_time: t(D2,14,40),  genre: 'Metal Battle',          image_url: `${WOA}/fileadmin/_processed_/4/7/csm_given_by_the_flames_26_a72a8cc764.jpg` }, 
  { slot_id: 'WET18', name: 'Rise of Shadows',    stage: STAGES.WET, start_time: t(D2,15,10), end_time: t(D2,15,30),  genre: 'Metal Battle',          image_url: `${WOA}/fileadmin/_processed_/e/2/csm_raise_of_the_shadows_26_5f881e5e68.jpg` }, 
  { slot_id: 'WET19', name: 'Craft',                 stage: STAGES.WET, start_time: t(D2,16,15), end_time: t(D2,17, 0),  genre: 'Black Metal',                 image_url: `${WOA}/fileadmin/_processed_/8/d/csm_Craft_cropped_size_-_photo_by_Soile_Siirtola_fabe03b40f.jpg` }, 
  { slot_id: 'WET20', name: 'Spectral Wound',        stage: STAGES.WET, start_time: t(D2,18,15), end_time: t(D2,19, 0),  genre: 'Black Metal',                 image_url: `${WOA}/fileadmin/_processed_/2/e/csm_spectral_wound26_3263ad4710.jpg` }, 
  { slot_id: 'WET21', name: 'Misery Index',          stage: STAGES.WET, start_time: t(D2,20,30), end_time: t(D2,21,30),  genre: 'Death Metal',     image_url: `${WOA}/fileadmin/_processed_/5/a/csm_Misery_Index-WOA26_477d278139.jpg` }, 
  { slot_id: 'WET22', name: 'Misþyrming & Nergal',   stage: STAGES.WET, start_time: t(D2,23, 0), end_time: t(D2n, 0, 0), genre: 'Black Metal',                 image_url: `${WOA}/fileadmin/_processed_/5/c/csm_Sventevith-Logo-2_da655748b4.jpg` }, 

  // HEADBANGERS STAGE — Day 2
  { slot_id: 'HBA13', name: 'Novelization',          stage: STAGES.HEADBANGERS, start_time: t(D2,11,25), end_time: t(D2,11,45),  genre: 'Metal Battle',     image_url: `${WOA}/fileadmin/_processed_/1/3/csm_novelization_26_6842acc391.jpg` }, 
  { slot_id: 'HBA14', name: 'Gagor',                stage: STAGES.HEADBANGERS, start_time: t(D2,12,15), end_time: t(D2,12,35),  genre: 'Metal Battle',  image_url: `${WOA}/fileadmin/_processed_/2/d/csm_gagor_26_868f71af24.jpg` }, 
  { slot_id: 'HBA15', name: 'Force',                stage: STAGES.HEADBANGERS, start_time: t(D2,13, 5), end_time: t(D2,13,25),  genre: 'Metal Battle',           image_url: `${WOA}/fileadmin/_processed_/6/c/csm_force_26_9eb5006911.jpg` }, 
  { slot_id: 'HBA16', name: 'Midhaven',             stage: STAGES.HEADBANGERS, start_time: t(D2,13,55), end_time: t(D2,14,15),  genre: 'Metal Battle',           image_url: `${WOA}/fileadmin/_processed_/c/9/csm_midhaven_26_ad2bc280fa.jpg` }, 
  { slot_id: 'HBA17', name: 'Gidora',               stage: STAGES.HEADBANGERS, start_time: t(D2,14,45), end_time: t(D2,15, 5),  genre: 'Metal Battle',     image_url: `${WOA}/fileadmin/_processed_/f/c/csm_gidora_26_ed631fb6b6.jpg` }, 
  { slot_id: 'HBA18', name: 'Days of Ruin',           stage: STAGES.HEADBANGERS, start_time: t(D2,15,35), end_time: t(D2,15,55),  genre: 'Metal Battle',     image_url: `${WOA}/fileadmin/_processed_/d/0/csm_days_of_ruin_26_6357e7d8fe.jpg` }, 
  { slot_id: 'HBA19', name: 'Firespawn',            stage: STAGES.HEADBANGERS, start_time: t(D2,17,15), end_time: t(D2,18, 0),  genre: 'Death Metal',                  image_url: `${WOA}/fileadmin/_processed_/0/3/csm_Firespawn-WOA26_b9d52bcc7e.jpg` }, 
  { slot_id: 'HBA20', name: 'Blood Red Throne',     stage: STAGES.HEADBANGERS, start_time: t(D2,19,15), end_time: t(D2,20,15),  genre: 'Death Metal',                  image_url: `${WOA}/fileadmin/_processed_/0/a/csm_blood_red_throne26_98867522b5.jpg` }, 
  { slot_id: 'HBA21', name: 'Anaal Nathrakh',       stage: STAGES.HEADBANGERS, start_time: t(D2,21,45), end_time: t(D2,22,45),  genre: 'Black Metal',      image_url: `${WOA}/fileadmin/_processed_/c/6/csm_AnaalNathrakh1_1706ff6610.jpg` }, 
  { slot_id: 'HBA22', name: 'Cowgirls From Hell',   stage: STAGES.HEADBANGERS, start_time: t(D2n, 0, 0), end_time: t(D2n, 3, 0), genre: TBD_GENRE,                     image_url: `${WOA}/fileadmin/_processed_/4/0/csm_cowgirls_from_hell_26_30a60185cc.jpg` }, 

  // WASTELAND STAGE — Day 2
  { slot_id: 'WAS8', name: 'Saviourself',         stage: STAGES.WASTELAND, start_time: t(D2,14, 0), end_time: t(D2,14,30),  genre: TBD_GENRE,                 image_url: `${WOA}/fileadmin/_processed_/a/5/csm_saviourself_26_2359155f97.jpg` },     
  { slot_id: 'WAS9', name: 'Black Tish',          stage: STAGES.WASTELAND, start_time: t(D2,15, 0), end_time: t(D2,15,30),  genre: TBD_GENRE,                 image_url: `${WOA}/fileadmin/_processed_/c/6/csm_black_tish_26_9887b0d604.jpg` },      
  { slot_id: 'WAS10', name: 'Brunhilde',           stage: STAGES.WASTELAND, start_time: t(D2,16, 0), end_time: t(D2,16,45),  genre: 'Folk Metal',              image_url: `${WOA}/fileadmin/_processed_/b/4/csm_brunhilde_26_489882e4fb.jpg` },        
  { slot_id: 'WAS11', name: '9mm Headshot',        stage: STAGES.WASTELAND, start_time: t(D2,17,15), end_time: t(D2,18, 0),  genre: TBD_GENRE,                 image_url: `${WOA}/fileadmin/_processed_/5/c/csm_9mm_26_b14cffe6c2.jpg` },              
  { slot_id: 'WAS12', name: 'Wytch Hazel',         stage: STAGES.WASTELAND, start_time: t(D2,18,30), end_time: t(D2,19,15),  genre: 'Heavy Metal', image_url: `${WOA}/fileadmin/_processed_/2/5/csm_Wytch_Hazel-WOA26_3a3c5566d4.jpg` }, 
  { slot_id: 'WAS13', name: 'Temple of the Absurd',stage: STAGES.WASTELAND, start_time: t(D2,19,45), end_time: t(D2,20,45),  genre: TBD_GENRE,                 image_url: `${WOA}/fileadmin/_processed_/f/a/csm_temple_of_the_absurd_26_ad20ecb9ce.jpg` }, 
  { slot_id: 'WAS14', name: 'Evil Jared & Krogi',  stage: STAGES.WASTELAND, start_time: t(D2,21,15), end_time: t(D2,22,15),  genre: TBD_GENRE,                 image_url: `${WOA}/fileadmin/_processed_/9/5/csm_evil_jared_krogi26_9d4bb77d9d.jpg` }, 
  { slot_id: 'WAS15', name: 'Year of the Goat',    stage: STAGES.WASTELAND, start_time: t(D2,23, 0), end_time: t(D2n, 0, 0), genre: 'Doom Metal',             image_url: `${WOA}/fileadmin/_processed_/4/e/csm_year_of_the_goat_26_f271ba4dd9.jpg` }, 

  // WACKINGER STAGE — Day 2
  { slot_id: 'WAK8', name: 'Wüstenberg',   stage: STAGES.WACKINGER, start_time: t(D2,12, 0), end_time: t(D2,12,45), genre: TBD_GENRE,    image_url: `${WOA}/fileadmin/_processed_/1/1/csm_wuestenberg_26_7a5a7ede3d.jpg` },     
  { slot_id: 'WAK9', name: 'Katerfahrt',   stage: STAGES.WACKINGER, start_time: t(D2,13,30), end_time: t(D2,14,15), genre: 'Hard Rock',       image_url: `${WOA}/fileadmin/_processed_/7/0/csm_Katerfahrt-WOA26_4213c9f3a0.jpg` },   
  { slot_id: 'WAK10', name: 'Vogelfrey',    stage: STAGES.WACKINGER, start_time: t(D2,15, 0), end_time: t(D2,16, 0), genre: 'Folk Metal', image_url: `${WOA}/fileadmin/_processed_/a/3/csm_vogelfrey_26_b_0c6f4b5859.jpg` },     
  { slot_id: 'WAK11', name: 'Sagenbringer', stage: STAGES.WACKINGER, start_time: t(D2,16,45), end_time: t(D2,17,45), genre: 'Folk Metal', image_url: `${WOA}/fileadmin/_processed_/7/2/csm_sagenbringer_26_b57d26c84d.jpg` },    
  { slot_id: 'WAK12', name: 'Storm Seeker', stage: STAGES.WACKINGER, start_time: t(D2,18,30), end_time: t(D2,19,30), genre: 'Folk Metal', image_url: `${WOA}/fileadmin/_processed_/c/9/csm_stormseeker26_ffac69751b.jpg` },      
  { slot_id: 'WAK13', name: 'Kupfergold',   stage: STAGES.WACKINGER, start_time: t(D2,20,15), end_time: t(D2,21,15), genre: TBD_GENRE,    image_url: `${WOA}/fileadmin/_processed_/2/c/csm_Kupfergold-WOA26_1d73350ab6.jpg` },   
  { slot_id: 'WAK14', name: 'Manntra',      stage: STAGES.WACKINGER, start_time: t(D2,22,15), end_time: t(D2,23,15), genre: 'Folk Metal', image_url: `${WOA}/fileadmin/_processed_/1/3/csm_manntra_26_a22fae1fff.jpg` },         

  // WELCOME TO THE JUNGLE — Day 2
  // JUN3, JUN4 — dropped (Name = TBD in lineup.md)

  // ═══════════════════════════════════════════════════════
  // DAY 3 — Friday 31 July
  // ═══════════════════════════════════════════════════════

  // HARDER STAGE — Day 3
  { slot_id: 'HAR4', name: 'Vreid',        stage: STAGES.HARDER, start_time: t(D3,13,30), end_time: t(D3,14,15),  genre: TBD_GENRE,        image_url: `${WOA}/fileadmin/_processed_/8/0/csm_vreid_26_f92e6e9af1.jpg` },               
  { slot_id: 'HAR5', name: 'Danko Jones',  stage: STAGES.HARDER, start_time: t(D3,15,45), end_time: t(D3,16,45),  genre: 'Hard Rock',      image_url: `${WOA}/fileadmin/_processed_/d/e/csm_danko_jones_26_3405a63446.jpg` },         
  { slot_id: 'HAR6', name: 'Saxon',        stage: STAGES.HARDER, start_time: t(D3,18,15), end_time: t(D3,19,30),  genre: 'Heavy Metal',    image_url: `${WOA}/fileadmin/_processed_/3/6/csm_saxon_26_0097ea04d2.jpg` },               
  { slot_id: 'HAR7', name: 'Judas Priest', stage: STAGES.HARDER, start_time: t(D3,21,30), end_time: t(D3,23, 0),  genre: 'Heavy Metal',    image_url: `${WOA}/fileadmin/_processed_/0/d/csm_judas_priest26_47424c35d1.jpg` },         
  { slot_id: 'HAR8', name: 'Sepultura',    stage: STAGES.HARDER, start_time: t(D3n, 1, 0), end_time: t(D3n, 2,15), genre: 'Metal',   image_url: `${WOA}/fileadmin/_processed_/6/1/csm_Sepultura-WOA26_f6b8328d6d.jpg` },        

  // FASTER STAGE — Day 3
  { slot_id: 'FAS8', name: 'Gutalax',           stage: STAGES.FASTER, start_time: t(D3,12,30), end_time: t(D3,13,30),  genre: 'Death Metal',           image_url: `${WOA}/fileadmin/_processed_/f/4/csm_Gutalax-WOA26_6c3c4625c6.jpg` },        
  { slot_id: 'FAS9', name: 'Paradise Lost',     stage: STAGES.FASTER, start_time: t(D3,14,30), end_time: t(D3,15,30),  genre: 'Doom Metal',        image_url: `${WOA}/fileadmin/_processed_/8/a/csm_oaradise_lost_26_339356239c.jpg` },     
  { slot_id: 'FAS10', name: 'Black Label Society',stage: STAGES.FASTER, start_time: t(D3,17, 0), end_time: t(D3,18, 0),  genre: 'Heavy Metal',         image_url: `${WOA}/fileadmin/_processed_/d/4/csm_Blacl_Label_Society_26_315019e5cb.jpg` }, 
  { slot_id: 'FAS11', name: 'In Flames',         stage: STAGES.FASTER, start_time: t(D3,19,45), end_time: t(D3,21,15),  genre: 'Death Metal', image_url: `${WOA}/fileadmin/_processed_/8/6/csm_In-Flames-WOA26_9e6947d658.jpg` },     
  { slot_id: 'FAS12', name: 'Running Wild',      stage: STAGES.FASTER, start_time: t(D3,23,15), end_time: t(D3n, 0,45), genre: 'Heavy Metal',         image_url: `${WOA}/fileadmin/_processed_/b/f/csm_Running_Wild-WOA26_5c9b78de18.jpg` },   

  // LOUDER STAGE — Day 3
  { slot_id: 'LOU13', name: 'Mr. Hurley und die Pulveraffen', stage: STAGES.LOUDER, start_time: t(D3,12, 0), end_time: t(D3,13, 0),  genre: 'Folk Metal',                  image_url: `${WOA}/fileadmin/_processed_/b/0/csm_mr_hurley_und_die_pulveraffen_26_39b0d12506.jpg` }, 
  { slot_id: 'LOU14', name: 'Future Palace',                  stage: STAGES.LOUDER, start_time: t(D3,13,45), end_time: t(D3,14,45),  genre: 'Metalcore',                     image_url: `${WOA}/fileadmin/_processed_/c/6/csm_Future_Palace-WOA26_03d8bb4d08.jpg` }, 
  { slot_id: 'LOU15', name: 'Mantar',                         stage: STAGES.LOUDER, start_time: t(D3,15,30), end_time: t(D3,16,30),  genre: 'Doom Metal',                    image_url: `${WOA}/fileadmin/_processed_/0/1/csm_Mantar-WOA26_41ea1e294a.jpg` }, 
  { slot_id: 'LOU16', name: 'Paleface Swiss',                 stage: STAGES.LOUDER, start_time: t(D3,17,15), end_time: t(D3,18,15),  genre: 'Metal',                         image_url: `${WOA}/fileadmin/_processed_/6/2/csm_Paleface_Swiss-WOA26_9755b4556f.jpg` }, 
  { slot_id: 'LOU17', name: 'Hatebreed',                      stage: STAGES.LOUDER, start_time: t(D3,19, 0), end_time: t(D3,20, 0),  genre: 'Metalcore',                     image_url: `${WOA}/fileadmin/_processed_/a/6/csm_hatebreed_26_1a7dea75de.jpg` }, 
  { slot_id: 'LOU18', name: 'Blood Fire Death',               stage: STAGES.LOUDER, start_time: t(D3,20,45), end_time: t(D3,22, 0),  genre: 'Black Metal', image_url: `${WOA}/fileadmin/_processed_/5/d/csm_Blood_Fire_Death-WOA26_c420b03929.jpg` }, 
  { slot_id: 'LOU19', name: 'Emperor',                        stage: STAGES.LOUDER, start_time: t(D3,22,45), end_time: t(D3n, 0, 0), genre: 'Black Metal',                   image_url: `${WOA}/fileadmin/_processed_/d/2/csm_Emperor-WOA26_d4f869c941.jpg` }, 
  { slot_id: 'LOU20', name: 'Subway to Sally',                stage: STAGES.LOUDER, start_time: t(D3n, 0,45), end_time: t(D3n, 2, 0), genre: 'Hard Rock',                 image_url: `${WOA}/fileadmin/_processed_/6/3/csm_subway_to_sally_26_c89a7c04fa.jpg` }, 

  // W.E.T. STAGE — Day 3
  { slot_id: 'WET23', name: MTB,                  stage: STAGES.WET, start_time: t(D3,11, 0), end_time: t(D3,11,45),  genre: 'Metal Battle', image_url: PLACEHOLDER },                                                                  
  { slot_id: 'WET24', name: 'Employed to Serve',  stage: STAGES.WET, start_time: t(D3,13, 0), end_time: t(D3,13,45),  genre: 'Metalcore',                   image_url: `${WOA}/fileadmin/_processed_/a/a/csm_employed_to_serve26_631874c4dd.jpg` }, 
  { slot_id: 'WET25', name: 'Dead by April',      stage: STAGES.WET, start_time: t(D3,15, 0), end_time: t(D3,15,45),  genre: 'Metalcore',                     image_url: `${WOA}/fileadmin/_processed_/9/4/csm_dead_by_april_26_b9b9c21441.jpg` },     
  { slot_id: 'WET26', name: 'Deafheaven',         stage: STAGES.WET, start_time: t(D3,17, 0), end_time: t(D3,17,45),  genre: 'Black Metal',                   image_url: `${WOA}/fileadmin/_processed_/1/0/csm_deafheaven_26_4d801d532f.jpg` },        
  { slot_id: 'WET27', name: 'Animals as Leaders', stage: STAGES.WET, start_time: t(D3,19, 0), end_time: t(D3,19,45),  genre: 'Metal',           image_url: `${WOA}/fileadmin/_processed_/2/b/csm_animals_as_leaders26_0a9b3dfbf5.jpg` }, 
  { slot_id: 'WET28', name: 'Crematory',          stage: STAGES.WET, start_time: t(D3,21,15), end_time: t(D3,22,15),  genre: 'Doom Metal',   image_url: `${WOA}/fileadmin/_processed_/7/c/csm_crematory_26_8ae2e22d82.jpg` },         
  { slot_id: 'WET29', name: 'Skynd',              stage: STAGES.WET, start_time: t(D3,23,45), end_time: t(D3n, 0,45), genre: 'Metal',             image_url: `${WOA}/fileadmin/_processed_/7/3/csm_skynd26_fdaccaa45e.jpg` },              

  // HEADBANGERS STAGE — Day 3
  { slot_id: 'HBA23', name: 'Ten56.',           stage: STAGES.HEADBANGERS, start_time: t(D3,12, 0), end_time: t(D3,12,45),  genre: 'Metalcore',              image_url: `${WOA}/fileadmin/_processed_/c/b/csm_Ten56-WOA26_515bdac59e.jpg` },            
  { slot_id: 'HBA24', name: 'Grand Magus',      stage: STAGES.HEADBANGERS, start_time: t(D3,14, 0), end_time: t(D3,14,45),  genre: 'Heavy Metal',            image_url: `${WOA}/fileadmin/_processed_/2/a/csm_Grand_Magus-WOA26_00bbab917e.jpg` },      
  { slot_id: 'HBA25', name: 'Any Given Day',    stage: STAGES.HEADBANGERS, start_time: t(D3,16, 0), end_time: t(D3,16,45),  genre: 'Metalcore',              image_url: `${WOA}/fileadmin/_processed_/d/f/csm_Any_given_Day-WOA26_45b0bb14e2.jpg` },    
  { slot_id: 'HBA26', name: 'Pig Destroyer',    stage: STAGES.HEADBANGERS, start_time: t(D3,18, 0), end_time: t(D3,18,45),  genre: 'Death Metal',              image_url: `${WOA}/fileadmin/_processed_/7/9/csm_Pig_Destroyer-WOA26_111d076650.jpg` },    
  { slot_id: 'HBA27', name: 'Bear McCreary',    stage: STAGES.HEADBANGERS, start_time: t(D3,20, 0), end_time: t(D3,21, 0),  genre: 'Metal',image_url: `${WOA}/fileadmin/_processed_/a/e/csm_bear_mccreary_26b_802dfd47bf.jpg` },     
  { slot_id: 'HBA28', name: 'The Haunted',      stage: STAGES.HEADBANGERS, start_time: t(D3,22,30), end_time: t(D3,23,30),  genre: 'Death Metal',            image_url: `${WOA}/fileadmin/_processed_/d/3/csm_The_Haunted-WOA26_849d3b2a7e.jpg` },    
  { slot_id: 'HBA29', name: 'Alcest',           stage: STAGES.HEADBANGERS, start_time: t(D3n, 1, 0), end_time: t(D3n, 2, 0), genre: 'Black Metal',      image_url: `${WOA}/fileadmin/_processed_/d/2/csm_alcest_26_ca67b9d832.jpg` },              

  // WASTELAND STAGE — Day 3
  { slot_id: 'WAS16', name: 'Heartless Human Harvest', stage: STAGES.WASTELAND, start_time: t(D3,14, 0), end_time: t(D3,14,30),  genre: 'Death Metal',         image_url: `${WOA}/fileadmin/_processed_/b/9/csm_heartless_human_harvest_26_5c7a455a4e.jpg` }, 
  { slot_id: 'WAS17', name: 'Cursed Abyss',            stage: STAGES.WASTELAND, start_time: t(D3,15, 0), end_time: t(D3,15,30),  genre: 'Black Metal',         image_url: `${WOA}/fileadmin/_processed_/e/d/csm_cursed_abyss_26_924d9b9653.jpg` },             
  { slot_id: 'WAS18', name: 'Chaosbay',                stage: STAGES.WASTELAND, start_time: t(D3,16, 0), end_time: t(D3,16,45),  genre: 'Death Metal', image_url: `${WOA}/fileadmin/_processed_/c/8/csm_chaos_bay_26_6d40a05540.jpg` },                
  { slot_id: 'WAS19', name: 'Luna Kills',              stage: STAGES.WASTELAND, start_time: t(D3,17,15), end_time: t(D3,18, 0),  genre: 'Power Metal',     image_url: `${WOA}/fileadmin/_processed_/3/3/csm_Luna_Kills-WOA26_9c2715ab09.jpg` },            
  { slot_id: 'WAS20', name: 'Insanity Alert',          stage: STAGES.WASTELAND, start_time: t(D3,18,30), end_time: t(D3,19,15),  genre: 'Thrash Metal',    image_url: `${WOA}/fileadmin/_processed_/a/3/csm_Insanity_Alert-WOA26_32944b8820.jpg` },        
  { slot_id: 'WAS21', name: 'Arroganz',                stage: STAGES.WASTELAND, start_time: t(D3,19,45), end_time: t(D3,20,45),  genre: 'Metal',               image_url: `${WOA}/fileadmin/_processed_/6/f/csm_arroganz_26b_b0fc829592.jpg` },                
  { slot_id: 'WAS22', name: 'Divlje Jagode',           stage: STAGES.WASTELAND, start_time: t(D3,21,15), end_time: t(D3,22,15),  genre: 'Hard Rock',           image_url: `${WOA}/fileadmin/_processed_/5/0/csm_divlje_jagode_26_e0a2c64203.jpg` },             
  { slot_id: 'WAS23', name: 'Alfahanne',               stage: STAGES.WASTELAND, start_time: t(D3,23, 0), end_time: t(D3n, 0, 0), genre: 'Black Metal',         image_url: `${WOA}/fileadmin/_processed_/b/6/csm_alfahanne_26_9c1f0784c4.jpg` },                 

  // WACKINGER STAGE — Day 3
  { slot_id: 'WAK15', name: 'tuXedoo',         stage: STAGES.WACKINGER, start_time: t(D3,12, 0), end_time: t(D3,12,45), genre: 'Heavy Metal',         image_url: `${WOA}/fileadmin/_processed_/a/b/csm_tuxedoo_26_2cbaa64988.jpg` },              
  { slot_id: 'WAK16', name: 'Blaas of Glory',  stage: STAGES.WACKINGER, start_time: t(D3,13,15), end_time: t(D3,13,45), genre: 'Folk Metal',  image_url: `${WOA}/fileadmin/_processed_/e/5/csm_blaas_of_glory_26_f53a31927e.jpg` },         
  { slot_id: 'WAK17', name: 'Metaklapa',       stage: STAGES.WACKINGER, start_time: t(D3,14,15), end_time: t(D3,15, 0), genre: 'Folk Metal',                image_url: `${WOA}/fileadmin/_processed_/8/7/csm_metaklapa_2024_ec19d5fd80.jpg` },            
  { slot_id: 'WAK18', name: 'Trold',           stage: STAGES.WACKINGER, start_time: t(D3,15,30), end_time: t(D3,16,15), genre: 'Black Metal',         image_url: `${WOA}/fileadmin/_processed_/7/2/csm_trold_26_e2d88c204e.jpg` },                  
  { slot_id: 'WAK19', name: 'Cruachan',        stage: STAGES.WACKINGER, start_time: t(D3,17, 0), end_time: t(D3,18, 0), genre: 'Folk Metal',          image_url: `${WOA}/fileadmin/_processed_/4/0/csm_cruachan_26_fe9f62c6a3.jpg` },               
  { slot_id: 'WAK20', name: 'Eläkeläiset',     stage: STAGES.WACKINGER, start_time: t(D3,18,45), end_time: t(D3,19,45), genre: 'Folk Metal',              image_url: `${WOA}/fileadmin/_processed_/e/d/csm_Elaekelaeiset-WOA26_0517340ca3.jpg` },        
  { slot_id: 'WAK21', name: 'Dubioza Kolektiv',stage: STAGES.WACKINGER, start_time: t(D3,20,30), end_time: t(D3,21,30), genre: 'Folk Metal',  image_url: `${WOA}/fileadmin/_processed_/e/8/csm_dubioza_kollektiv26_190126a762.jpg` },        
  { slot_id: 'WAK22', name: 'Faun',            stage: STAGES.WACKINGER, start_time: t(D3,22,15), end_time: t(D3,23,15), genre: 'Folk Metal',                image_url: `${WOA}/fileadmin/_processed_/2/4/csm_Faun2-WOA26_dec165b202.jpg` },                 

  // WELCOME TO THE JUNGLE — Day 3
  // JUN5 — dropped (Name = TBD in lineup.md)

  // ═══════════════════════════════════════════════════════
  // DAY 4 — Saturday 1 August
  // (Closing ceremony "Farewell & Announcements" is HAR13, between HAR12 Arch Enemy and HAR14 Sabaton.)
  // ═══════════════════════════════════════════════════════

  // HARDER STAGE — Day 4
  { slot_id: 'HAR9', name: 'Heavysaurus',   stage: STAGES.HARDER, start_time: t(D4,11,30), end_time: t(D4,12,15),  genre: 'Metal',    image_url: `${WOA}/fileadmin/_processed_/3/0/csm_heavysaurus_26_9d1aa2a6db.jpg` },     
  { slot_id: 'HAR10', name: 'Orbit Culture', stage: STAGES.HARDER, start_time: t(D4,13,45), end_time: t(D4,14,45),  genre: 'Death Metal', image_url: `${WOA}/fileadmin/_processed_/d/c/csm_Orbit_Culture-WOA26_e0ccb2b84a.jpg` }, 
  { slot_id: 'HAR11', name: 'Lamb of God',   stage: STAGES.HARDER, start_time: t(D4,16,15), end_time: t(D4,17,15),  genre: 'Metal',        image_url: `${WOA}/fileadmin/_processed_/7/4/csm_lamb_of_god_26b_d0cd004159.jpg` },    
  { slot_id: 'HAR12', name: 'Arch Enemy',    stage: STAGES.HARDER, start_time: t(D4,19, 0), end_time: t(D4,20,30),  genre: 'Death Metal', image_url: `${WOA}/fileadmin/_processed_/c/c/csm_arch_enemy_26c_e1e9c04c76.jpg` },     

  // HAR13 — Closing ceremony (category: 'ceremony' — excluded from /popular and badge conditions).
  {
    slot_id: 'HAR13',
    name:       'Farewell & Announcements',
    stage:      STAGES.HARDER,
    start_time: t(D4, 22, 30),
    end_time:   t(D4, 23,  0),
    genre:      null,
    image_url:  '/ceremony-farewell.png',
    category:   'ceremony',
  },                                                                                                                                                                                                                                       // HAR13

  { slot_id: 'HAR14', name: 'Sabaton', stage: STAGES.HARDER, start_time: t(D4,23, 0), end_time: t(D4n, 0,45),  genre: 'Power Metal', image_url: `${WOA}/fileadmin/_processed_/a/4/csm_sabaton_26_143decf5a4.jpg` }, 

  // FASTER STAGE — Day 4
  { slot_id: 'FAS13', name: 'Kim Dracula', stage: STAGES.FASTER, start_time: t(D4,12,30), end_time: t(D4,13,30),  genre: 'Metal',  image_url: `${WOA}/fileadmin/_processed_/3/4/csm_kim_dracula26_6085add158.jpg` }, 
  { slot_id: 'FAS14', name: 'Nevermore',   stage: STAGES.FASTER, start_time: t(D4,15, 0), end_time: t(D4,16, 0),  genre: 'Metal',  image_url: `${WOA}/fileadmin/_processed_/6/6/csm_nevermore_26b_55b9630985.jpg` }, 
  { slot_id: 'FAS15', name: 'Airbourne',   stage: STAGES.FASTER, start_time: t(D4,17,30), end_time: t(D4,18,45),  genre: 'Party Metal',        image_url: `${WOA}/fileadmin/_processed_/0/3/csm_airbourne-photo-2018_b62415c35e.jpg` },  
  { slot_id: 'FAS16', name: 'Powerwolf',   stage: STAGES.FASTER, start_time: t(D4,20,45), end_time: t(D4,22,30),  genre: 'Power Metal',        image_url: `${WOA}/fileadmin/_processed_/9/f/csm_Powerwolf-WOA26_acf32b8b68.jpg` }, 
  { slot_id: 'FAS17', name: 'Alestorm',    stage: STAGES.FASTER, start_time: t(D4n, 1, 0), end_time: t(D4n, 2, 0), genre: 'Party Metal',        image_url: `${WOA}/fileadmin/_processed_/6/d/csm_alestorm_26_9ddf45fa2e.jpg` },     

  // LOUDER STAGE — Day 4
  // LOU21 — dropped (Name = TBD in lineup.md)
  { slot_id: 'LOU22', name: 'Kittie',             stage: STAGES.LOUDER, start_time: t(D4,13,45), end_time: t(D4,14,45),  genre: 'Heavy Metal',         image_url: `${WOA}/fileadmin/_processed_/d/6/csm_kittie_26_31697daab6.jpg` },              
  { slot_id: 'LOU23', name: 'Thrown',             stage: STAGES.LOUDER, start_time: t(D4,15,30), end_time: t(D4,16,30),  genre: 'Doom Metal',          image_url: `${WOA}/fileadmin/_processed_/4/9/csm_Thrown-WOA26_f70cc40622.jpg` },           
  { slot_id: 'LOU24', name: 'Bleed from Within',  stage: STAGES.LOUDER, start_time: t(D4,17,15), end_time: t(D4,18,15),  genre: 'Metalcore',           image_url: `${WOA}/fileadmin/_processed_/c/6/csm_bleed_from_within_26_c38f26c402.jpg` },  
  { slot_id: 'LOU25', name: 'Kärbholz',           stage: STAGES.LOUDER, start_time: t(D4,19, 0), end_time: t(D4,20, 0),  genre: 'Punk',           image_url: `${WOA}/fileadmin/_processed_/7/4/csm_kaerbholz_26_85a563b793.jpg` },           
  { slot_id: 'LOU26', name: 'Thy Art Is Murder',  stage: STAGES.LOUDER, start_time: t(D4,20,45), end_time: t(D4,21,45),  genre: 'Death Metal',           image_url: `${WOA}/fileadmin/_processed_/8/0/csm_thy_art_is_murder_26_9e88fcd95e.jpg` },   
  { slot_id: 'LOU27', name: 'Triptykon',          stage: STAGES.LOUDER, start_time: t(D4,22,45), end_time: t(D4n, 0, 0), genre: 'Black Metal',  image_url: `${WOA}/fileadmin/_processed_/3/c/csm_Triptykon-WOA26_0599ad9698.jpg` },         

  // W.E.T. STAGE — Day 4
  // WET30 — dropped (Name = TBD in lineup.md)
  { slot_id: 'WET31', name: 'Blood Command',          stage: STAGES.WET, start_time: t(D4,13, 0), end_time: t(D4,13,45),  genre: 'Punk',       image_url: `${WOA}/fileadmin/_processed_/e/8/csm_Blood_Command-WOA26_f82b942e22.jpg` },      
  { slot_id: 'WET32', name: 'Our Promise',            stage: STAGES.WET, start_time: t(D4,15, 0), end_time: t(D4,15,45),  genre: 'Metal',            image_url: `${WOA}/fileadmin/_processed_/a/0/csm_our_promise_26_661c3c384d.jpg` },             
  { slot_id: 'WET33', name: 'Hardline',               stage: STAGES.WET, start_time: t(D4,17, 0), end_time: t(D4,17,45),  genre: 'Hard Rock',  image_url: `${WOA}/fileadmin/_processed_/c/5/csm_hardline_26_73180980cd.jpg` },                
  { slot_id: 'WET34', name: 'Lagwagon',               stage: STAGES.WET, start_time: t(D4,19, 0), end_time: t(D4,19,45),  genre: 'Metalcore', image_url: `${WOA}/fileadmin/_processed_/a/e/csm_lagwagon26_9b4cccaa2b.jpg` },                 
  { slot_id: 'WET35', name: 'Corrosion of Conformity',stage: STAGES.WET, start_time: t(D4,21,15), end_time: t(D4,22,15),  genre: 'Doom Metal',     image_url: `${WOA}/fileadmin/_processed_/0/b/csm_corrosion_of_conformity_26_8ba7dabe09.jpg` }, 
  { slot_id: 'WET36', name: 'Fit For An Autopsy',     stage: STAGES.WET, start_time: t(D4,23,45), end_time: t(D4n, 0,45), genre: 'Death Metal',      image_url: `${WOA}/fileadmin/_processed_/b/7/csm_fit_for_an_autopsy_26_1695f9334e.jpg` },      

  // HEADBANGERS STAGE — Day 4
  { slot_id: 'HBA30', name: 'Focus.',           stage: STAGES.HEADBANGERS, start_time: t(D4,12, 0), end_time: t(D4,12,45),  genre: TBD_GENRE,           image_url: `${WOA}/fileadmin/_processed_/8/9/csm_focus_26_a98ab7e760.jpg` },             
  { slot_id: 'HBA31', name: 'Crimson Glory',    stage: STAGES.HEADBANGERS, start_time: t(D4,14, 0), end_time: t(D4,14,45),  genre: 'Metal', image_url: `${WOA}/fileadmin/_processed_/8/2/csm_crimson_glory_26_59c22b790e.jpg` },     
  { slot_id: 'HBA32', name: 'Angelus Apatrida', stage: STAGES.HEADBANGERS, start_time: t(D4,16, 0), end_time: t(D4,16,45),  genre: 'Thrash Metal',      image_url: `${WOA}/fileadmin/_processed_/d/0/csm_angelus_apatrida_26_0bf97316dd.jpg` },  
  { slot_id: 'HBA33', name: 'Municipal Waste',  stage: STAGES.HEADBANGERS, start_time: t(D4,18, 0), end_time: t(D4,18,45),  genre: 'Thrash Metal',      image_url: `${WOA}/fileadmin/_processed_/4/1/csm_municipal_waste26_b40cb13d64.jpg` },     
  { slot_id: 'HBA34', name: 'Dritte Wahl',      stage: STAGES.HEADBANGERS, start_time: t(D4,20, 0), end_time: t(D4,21, 0),  genre: 'Punk',              image_url: `${WOA}/fileadmin/_processed_/f/8/csm_Dritte_Wahl_26_89eac3e241.jpg` },        
  { slot_id: 'HBA35', name: 'Vended',           stage: STAGES.HEADBANGERS, start_time: t(D4,22,30), end_time: t(D4,23,30),  genre: 'Metal',          image_url: `${WOA}/fileadmin/_processed_/0/7/csm_vended_26_a96222e9bb.jpg` },             
  { slot_id: 'HBA36', name: 'The Limit',        stage: STAGES.HEADBANGERS, start_time: t(D4n, 1, 0), end_time: t(D4n, 2, 0), genre: TBD_GENRE,          image_url: `${WOA}/fileadmin/_processed_/b/6/csm_the_limit_26_954965f6df.jpg` },          

  // WASTELAND STAGE — Day 4
  // WAS24 — dropped (Name = TBD in lineup.md)
  { slot_id: 'WAS25', name: 'Stonem',     stage: STAGES.WASTELAND, start_time: t(D4,15, 0), end_time: t(D4,15,30),  genre: 'Metal',        image_url: `${WOA}/fileadmin/_processed_/4/9/csm_stonem_26_e1ff4b71dd.jpg` }, 
  { slot_id: 'WAS26', name: 'Asrock',     stage: STAGES.WASTELAND, start_time: t(D4,16, 0), end_time: t(D4,16,45),  genre: 'Metal',        image_url: `${WOA}/fileadmin/_processed_/c/a/csm_asrock_26_85c4a23518.jpg` },  
  { slot_id: 'WAS27', name: 'Allt',       stage: STAGES.WASTELAND, start_time: t(D4,17,15), end_time: t(D4,18, 0),  genre: 'Black Metal',  image_url: `${WOA}/fileadmin/_processed_/a/f/csm_Allt-WOA26_20072966da.jpg` },  
  { slot_id: 'WAS28', name: 'The Other',  stage: STAGES.WASTELAND, start_time: t(D4,18,30), end_time: t(D4,19,15),  genre: 'Punk',  image_url: `${WOA}/fileadmin/_processed_/4/8/csm_the_other_26_bb6a90d46d.jpg` },
  { slot_id: 'WAS29', name: 'Castle Rat', stage: STAGES.WASTELAND, start_time: t(D4,19,45), end_time: t(D4,20,45),  genre: 'Heavy Metal',  image_url: `${WOA}/fileadmin/_processed_/f/3/csm_castle_Rat_26_29b54db683.jpg` }, 
  { slot_id: 'WAS30', name: 'Guilt Trip', stage: STAGES.WASTELAND, start_time: t(D4,21,15), end_time: t(D4,22,15),  genre: 'Metal',        image_url: `${WOA}/fileadmin/_processed_/d/b/csm_guilt_trip_26_524191a47e.jpg` }, 
  { slot_id: 'WAS31', name: 'Hackneyed',  stage: STAGES.WASTELAND, start_time: t(D4,23, 0), end_time: t(D4n, 0, 0), genre: 'Death Metal',  image_url: `${WOA}/fileadmin/_processed_/3/f/csm_hacknayed_26_2bf550c457.jpg` },  
  // WAS32 — dropped (Name = TBD in lineup.md)

  // WACKINGER STAGE — Day 4
  { slot_id: 'WAK23', name: 'Wacken Firefighters',    stage: STAGES.WACKINGER, start_time: t(D4,12, 0), end_time: t(D4,12,45), genre: TBD_GENRE,         image_url: `${WOA}/fileadmin/_processed_/0/6/csm_wacken_firefighters_25_5f6d39317e.jpg` }, 
  { slot_id: 'WAK24', name: 'Minotaurus',             stage: STAGES.WACKINGER, start_time: t(D4,13,30), end_time: t(D4,14,15), genre: TBD_GENRE,         image_url: `${WOA}/fileadmin/_processed_/9/0/csm_minotaurus_26_1ab67a12ae.jpg` },          
  { slot_id: 'WAK25', name: 'Dieter "Maschine" Birr', stage: STAGES.WACKINGER, start_time: t(D4,15, 0), end_time: t(D4,16, 0), genre: TBD_GENRE,         image_url: `${WOA}/fileadmin/_processed_/e/5/csm_dieter_maschine_birr_26b_a569706c0c.jpg` }, 
  { slot_id: 'WAK26', name: 'Zeltinger Band',         stage: STAGES.WACKINGER, start_time: t(D4,16,45), end_time: t(D4,17,45), genre: TBD_GENRE,         image_url: `${WOA}/fileadmin/_processed_/1/0/csm_zeltinger_26_74420c1905.jpg` },           
  { slot_id: 'WAK27', name: 'Ad Infinitum',           stage: STAGES.WACKINGER, start_time: t(D4,18,30), end_time: t(D4,19,30), genre: 'Power Metal', image_url: `${WOA}/fileadmin/_processed_/f/a/csm_ad_infinitum_26_cb9028b792.jpg` },         
  { slot_id: 'WAK28', name: 'Finsterforst',           stage: STAGES.WACKINGER, start_time: t(D4,20,15), end_time: t(D4,21,15), genre: 'Folk Metal',      image_url: `${WOA}/fileadmin/_processed_/b/8/csm_finsterforst_26_1eb394d15b.jpg` },         
  { slot_id: 'WAK29', name: 'Einherjer',              stage: STAGES.WACKINGER, start_time: t(D4,22,15), end_time: t(D4,23,15), genre: 'Black Metal',    image_url: `${WOA}/fileadmin/_processed_/c/2/csm_Einherjer-WOA26_9393fba15b.jpg` },          

  // WELCOME TO THE JUNGLE — Day 4
  // JUN6, JUN7, JUN8 — dropped (Name = TBD in lineup.md)
];


export function assertSeedIntegrity(rows: BandSeed[]) {
  const seen = new Set<string>();
  const errors: string[] = [];
  if (rows.length !== EXPECTED_BAND_COUNT) {
    errors.push(`expected ${EXPECTED_BAND_COUNT} rows, got ${rows.length}`);
  }
  for (const [i, row] of rows.entries()) {
    if (!row.slot_id) errors.push(`row ${i}: missing slot_id`);
    else if (!SLOT_ID_RE.test(row.slot_id)) errors.push(`row ${i}: invalid slot_id '${row.slot_id}'`);
    else if (seen.has(row.slot_id)) errors.push(`row ${i}: duplicate slot_id '${row.slot_id}'`);
    else seen.add(row.slot_id);
  }
  if (errors.length) {
    console.error('Seed integrity check failed:');
    for (const e of errors) console.error('  ·', e);
    process.exit(1);
  }
}

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
  assertSeedIntegrity(bands);

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
  console.log('Wacken 2026 lineup seed — DESTRUCTIVE — picks WILL be lost');
  console.log('For small changes use: npm run seed:bands:sync');
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
