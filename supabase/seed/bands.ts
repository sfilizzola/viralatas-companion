/**
 * Seed script — Wacken 2026 lineup
 *
 * Run:  npx tsx supabase/seed/bands.ts
 *
 * Requires env vars (reads from .env.local automatically):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← service role bypasses RLS; required for writes
 *
 * Image URLs sourced from: https://www.wacken.com/fileadmin/Json/bandlist-concert.json
 *
 * WARNING: deletes all existing bands (cascades to user_picks) before inserting.
 * Only run this against a dev/staging project, never a live festival session.
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

const D1 = '2026-07-29'; // Festival Day 1 — Wednesday
const D1n = '2026-07-30'; // After-midnight slots of Day 1
const D2 = '2026-07-30'; // Festival Day 2 — Thursday
const D2n = '2026-07-31'; // After-midnight slots of Day 2
const D3 = '2026-07-31'; // Festival Day 3 — Friday
const D3n = '2026-08-01'; // After-midnight slots of Day 3
const D4 = '2026-08-01'; // Festival Day 4 — Saturday
const D4n = '2026-08-02'; // After-midnight slots of Day 4

const WOA = 'https://www.wacken.com'; // base for all thumbnail URLs

export type BandSeed = {
  name: string;
  stage: string;
  start_time: string;
  end_time: string;
  genre: string;
  image_url: string | null;
};

// ---------------------------------------------------------------------------
// Band data
// Image URLs from https://www.wacken.com/fileadmin/Json/bandlist-concert.json
// Stage times are placeholder — update when official running order drops
// ---------------------------------------------------------------------------

export const bands: BandSeed[] = [
  // ═══════════════════════════════════════════════════════
  // DAY 1 — Thursday 30 July
  // ═══════════════════════════════════════════════════════

  // W:STAGE
  { name: 'Grand Magus',    stage: 'W.E.T.', start_time: t(D1,15,30), end_time: t(D1,16,30), genre: 'Heavy Metal',           image_url: `${WOA}/fileadmin/_processed_/2/a/csm_Grand_Magus-WOA26_00bbab917e.jpg` },
  { name: 'Running Wild',   stage: 'W.E.T.', start_time: t(D1,18, 0), end_time: t(D1,19,15), genre: 'Speed Metal',           image_url: `${WOA}/fileadmin/_processed_/b/f/csm_Running_Wild-WOA26_5c9b78de18.jpg` },
  { name: 'Emperor',        stage: 'W.E.T.', start_time: t(D1,21, 0), end_time: t(D1,22,30), genre: 'Black Metal',           image_url: `${WOA}/fileadmin/_processed_/d/2/csm_Emperor-WOA26_d4f869c941.jpg` },
  { name: 'In Flames',      stage: 'W.E.T.', start_time: t(D1n, 0, 0), end_time: t(D1n,1,30), genre: 'Melodic Death Metal', image_url: `${WOA}/fileadmin/_processed_/8/6/csm_In-Flames-WOA26_9e6947d658.jpg` },

  // HARDER STAGE
  { name: 'Blood Fire Death', stage: 'Harder', start_time: t(D1,12,30), end_time: t(D1,13,30), genre: 'Black Metal (Bathory tribute)', image_url: `${WOA}/fileadmin/_processed_/5/d/csm_Blood_Fire_Death-WOA26_c420b03929.jpg` },
  { name: 'Mantar',           stage: 'Harder', start_time: t(D1,14, 0), end_time: t(D1,15, 0), genre: 'Doom Metal',                   image_url: `${WOA}/fileadmin/_processed_/0/1/csm_Mantar-WOA26_41ea1e294a.jpg` },
  { name: 'Airbourne',        stage: 'Harder', start_time: t(D1,15,30), end_time: t(D1,16,30), genre: 'Hard Rock',                    image_url: `${WOA}/fileadmin/_processed_/d/e/csm_Airborn-WOA26_24e9c1f588.jpg` },
  { name: 'Life of Agony',    stage: 'Harder', start_time: t(D1,17, 0), end_time: t(D1,18, 0), genre: 'Alternative Metal',            image_url: `${WOA}/fileadmin/_processed_/9/4/csm_life_of_agony26_68ef27b061.jpg` },
  { name: 'Turbonegro',       stage: 'Harder', start_time: t(D1,19, 0), end_time: t(D1,20, 0), genre: 'Punk Rock',                    image_url: `${WOA}/fileadmin/_processed_/1/b/csm_turbonegro26_2118d824cd.jpg` },
  { name: 'Lamb of God',      stage: 'Harder', start_time: t(D1,21, 0), end_time: t(D1,22,30), genre: 'Groove Metal',                 image_url: `${WOA}/fileadmin/_processed_/7/4/csm_lamb_of_god_26b_d0cd004159.jpg` },

  // LOUDER STAGE
  { name: 'Hackneyed',              stage: 'Louder', start_time: t(D1,12, 0), end_time: t(D1,12,45), genre: 'Death Metal',    image_url: `${WOA}/fileadmin/_processed_/3/f/csm_hacknayed_26_2bf550c457.jpg` },
  { name: 'Pig Destroyer',          stage: 'Louder', start_time: t(D1,13,30), end_time: t(D1,14,15), genre: 'Grindcore',       image_url: `${WOA}/fileadmin/_processed_/7/9/csm_Pig_Destroyer-WOA26_111d076650.jpg` },
  { name: 'Municipal Waste',        stage: 'Louder', start_time: t(D1,15, 0), end_time: t(D1,16, 0), genre: 'Thrash Metal',    image_url: `${WOA}/fileadmin/_processed_/4/1/csm_municipal_waste26_b40cb13d64.jpg` },
  { name: 'Corrosion of Conformity',stage: 'Louder', start_time: t(D1,17, 0), end_time: t(D1,18, 0), genre: 'Sludge Metal',    image_url: `${WOA}/fileadmin/_processed_/0/b/csm_corrosion_of_conformity_26_8ba7dabe09.jpg` },
  { name: 'Hatebreed',              stage: 'Louder', start_time: t(D1,19,30), end_time: t(D1,20,30), genre: 'Metalcore',        image_url: `${WOA}/fileadmin/_processed_/a/6/csm_hatebreed_26_1a7dea75de.jpg` },
  { name: 'Thy Art Is Murder',      stage: 'Louder', start_time: t(D1,21,30), end_time: t(D1,22,30), genre: 'Deathcore',        image_url: `${WOA}/fileadmin/_processed_/8/0/csm_thy_art_is_murder_26_9e88fcd95e.jpg` },

  // FASTER STAGE
  { name: 'Allt',          stage: 'Faster', start_time: t(D1,12, 0), end_time: t(D1,12,45), genre: 'Black Metal',     image_url: `${WOA}/fileadmin/_processed_/a/f/csm_Allt-WOA26_20072966da.jpg` },
  { name: 'Gutalax',       stage: 'Faster', start_time: t(D1,13, 0), end_time: t(D1,13,45), genre: 'Goregrind',       image_url: `${WOA}/fileadmin/_processed_/f/4/csm_Gutalax-WOA26_6c3c4625c6.jpg` },
  { name: 'Thrown',        stage: 'Faster', start_time: t(D1,14, 0), end_time: t(D1,14,45), genre: 'Post-Metal',      image_url: `${WOA}/fileadmin/_processed_/4/9/csm_Thrown-WOA26_f70cc40622.jpg` },
  { name: 'Blood Command', stage: 'Faster', start_time: t(D1,15, 0), end_time: t(D1,15,45), genre: 'Punk Metal',      image_url: `${WOA}/fileadmin/_processed_/e/8/csm_Blood_Command-WOA26_f82b942e22.jpg` },
  { name: 'Castle Rat',    stage: 'Faster', start_time: t(D1,16, 0), end_time: t(D1,16,45), genre: 'Heavy Metal',     image_url: `${WOA}/fileadmin/_processed_/f/3/csm_castle_Rat_26_29b54db683.jpg` },
  { name: 'Chaosbay',      stage: 'Faster', start_time: t(D1,17, 0), end_time: t(D1,17,45), genre: 'Melodic Death Metal', image_url: `${WOA}/fileadmin/_processed_/c/8/csm_chaos_bay_26_6d40a05540.jpg` },
  { name: 'Any Given Day', stage: 'Faster', start_time: t(D1,18,30), end_time: t(D1,19,30), genre: 'Metalcore',       image_url: `${WOA}/fileadmin/_processed_/d/f/csm_Any_given_Day-WOA26_45b0bb14e2.jpg` },
  { name: 'Bleed from Within', stage: 'Faster', start_time: t(D1,20, 0), end_time: t(D1,21, 0), genre: 'Metalcore',  image_url: `${WOA}/fileadmin/_processed_/c/6/csm_bleed_from_within_26_c38f26c402.jpg` },
  { name: 'Ten56.',        stage: 'Faster', start_time: t(D1,21,30), end_time: t(D1,22,15), genre: 'Metalcore',       image_url: `${WOA}/fileadmin/_processed_/c/b/csm_Ten56-WOA26_515bdac59e.jpg` },

  // ═══════════════════════════════════════════════════════
  // DAY 2 — Friday 31 July
  // ═══════════════════════════════════════════════════════

  // W:STAGE
  { name: 'Rose Tattoo',  stage: 'W.E.T.', start_time: t(D2,14,30), end_time: t(D2,15,30), genre: 'Hard Rock',             image_url: `${WOA}/fileadmin/_processed_/5/5/csm_rose_tattoo26_a5747c907d.jpg` },
  { name: 'Saxon',        stage: 'W.E.T.', start_time: t(D2,17, 0), end_time: t(D2,18,15), genre: 'Heavy Metal',           image_url: `${WOA}/fileadmin/_processed_/3/6/csm_saxon_26_0097ea04d2.jpg` },
  { name: 'Arch Enemy',   stage: 'W.E.T.', start_time: t(D2,20,30), end_time: t(D2,22, 0), genre: 'Melodic Death Metal',   image_url: `${WOA}/fileadmin/_processed_/c/c/csm_arch_enemy_26c_e1e9c04c76.jpg` },
  { name: 'Powerwolf',    stage: 'W.E.T.', start_time: t(D2,23, 0), end_time: t(D2n, 0,30), genre: 'Power Metal',          image_url: `${WOA}/fileadmin/_processed_/9/f/csm_Powerwolf-WOA26_acf32b8b68.jpg` },

  // HARDER STAGE
  { name: 'Danko Jones',     stage: 'Harder', start_time: t(D2,12,30), end_time: t(D2,13,30), genre: 'Hard Rock',          image_url: `${WOA}/fileadmin/_processed_/d/e/csm_danko_jones_26_3405a63446.jpg` },
  { name: 'Kittie',          stage: 'Harder', start_time: t(D2,14, 0), end_time: t(D2,15, 0), genre: 'Heavy Metal',        image_url: `${WOA}/fileadmin/_processed_/d/6/csm_kittie_26_31697daab6.jpg` },
  { name: 'Sepultura',       stage: 'Harder', start_time: t(D2,15,30), end_time: t(D2,16,45), genre: 'Groove Metal',       image_url: `${WOA}/fileadmin/_processed_/6/1/csm_Sepultura-WOA26_f6b8328d6d.jpg` },
  { name: 'Black Label Society', stage: 'Harder', start_time: t(D2,17,15), end_time: t(D2,18,30), genre: 'Heavy Metal',    image_url: `${WOA}/fileadmin/_processed_/d/4/csm_Blacl_Label_Society_26_315019e5cb.jpg` },
  { name: 'The Haunted',     stage: 'Harder', start_time: t(D2,19,30), end_time: t(D2,20,30), genre: 'Melodic Death Metal', image_url: `${WOA}/fileadmin/_processed_/d/3/csm_The_Haunted-WOA26_849d3b2a7e.jpg` },
  { name: 'Paradise Lost',   stage: 'Harder', start_time: t(D2,21,30), end_time: t(D2,22,45), genre: 'Gothic Metal',       image_url: `${WOA}/fileadmin/_processed_/8/a/csm_oaradise_lost_26_339356239c.jpg` },

  // LOUDER STAGE
  { name: 'Alfahanne',         stage: 'Louder', start_time: t(D2,12, 0), end_time: t(D2,12,45), genre: 'Black Metal',          image_url: `${WOA}/fileadmin/_processed_/b/6/csm_alfahanne_26_9c1f0784c4.jpg` },
  { name: 'Vanir',             stage: 'Louder', start_time: t(D2,13,30), end_time: t(D2,14,15), genre: 'Viking Metal',          image_url: `${WOA}/fileadmin/_processed_/0/f/csm_vanir_26_4989af5ab2.jpg` },
  { name: 'Fit For An Autopsy',stage: 'Louder', start_time: t(D2,15, 0), end_time: t(D2,16, 0), genre: 'Death Metal',           image_url: `${WOA}/fileadmin/_processed_/b/7/csm_fit_for_an_autopsy_26_1695f9334e.jpg` },
  { name: 'Employed to Serve', stage: 'Louder', start_time: t(D2,17, 0), end_time: t(D2,18, 0), genre: 'Metalcore',             image_url: `${WOA}/fileadmin/_processed_/a/a/csm_employed_to_serve26_631874c4dd.jpg` },
  { name: 'Nevermore',         stage: 'Louder', start_time: t(D2,19,30), end_time: t(D2,21, 0), genre: 'Progressive Metal',     image_url: `${WOA}/fileadmin/_processed_/6/6/csm_nevermore_26b_55b9630985.jpg` },
  { name: 'Einherjer',         stage: 'Louder', start_time: t(D2,22, 0), end_time: t(D2,23, 0), genre: 'Viking Metal',          image_url: `${WOA}/fileadmin/_processed_/c/2/csm_Einherjer-WOA26_9393fba15b.jpg` },

  // FASTER STAGE
  { name: 'Storm Seeker',   stage: 'Faster', start_time: t(D2,12, 0), end_time: t(D2,12,45), genre: 'Folk Metal',              image_url: `${WOA}/fileadmin/_processed_/c/9/csm_stormseeker26_ffac69751b.jpg` },
  { name: 'Vogelfrey',      stage: 'Faster', start_time: t(D2,13, 0), end_time: t(D2,13,45), genre: 'Folk Metal',              image_url: `${WOA}/fileadmin/_processed_/a/3/csm_vogelfrey_26_b_0c6f4b5859.jpg` },
  { name: 'Brunhilde',      stage: 'Faster', start_time: t(D2,14, 0), end_time: t(D2,14,45), genre: 'Folk Metal',              image_url: `${WOA}/fileadmin/_processed_/b/4/csm_brunhilde_26_489882e4fb.jpg` },
  { name: 'Alestorm',       stage: 'Faster', start_time: t(D2,15, 0), end_time: t(D2,16, 0), genre: 'Pirate Metal',            image_url: `${WOA}/fileadmin/_processed_/6/d/csm_alestorm_26_9ddf45fa2e.jpg` },
  { name: 'Kadavar',        stage: 'Faster', start_time: t(D2,16,30), end_time: t(D2,17,30), genre: 'Stoner Rock',             image_url: `${WOA}/fileadmin/_processed_/f/9/csm_kadavar_26b_5241b42bda.jpg` },
  { name: 'Insanity Alert', stage: 'Faster', start_time: t(D2,18, 0), end_time: t(D2,18,45), genre: 'Crossover Thrash',        image_url: `${WOA}/fileadmin/_processed_/a/3/csm_Insanity_Alert-WOA26_32944b8820.jpg` },
  { name: 'Vended',         stage: 'Faster', start_time: t(D2,19, 0), end_time: t(D2,19,45), genre: 'Nu Metal',                image_url: `${WOA}/fileadmin/_processed_/0/7/csm_vended_26_a96222e9bb.jpg` },
  { name: 'Paleface Swiss', stage: 'Faster', start_time: t(D2,20, 0), end_time: t(D2,20,45), genre: 'Metal',                   image_url: `${WOA}/fileadmin/_processed_/6/2/csm_Paleface_Swiss-WOA26_9755b4556f.jpg` },
  { name: 'Orbit Culture',  stage: 'Faster', start_time: t(D2,21,30), end_time: t(D2,22,30), genre: 'Melodic Death Metal',     image_url: `${WOA}/fileadmin/_processed_/d/c/csm_Orbit_Culture-WOA26_e0ccb2b84a.jpg` },

  // ═══════════════════════════════════════════════════════
  // DAY 3 — Saturday 1 August
  // ═══════════════════════════════════════════════════════

  // W:STAGE
  { name: 'Uli Jon Roth',    stage: 'W.E.T.', start_time: t(D3,14, 0), end_time: t(D3,15, 0), genre: 'Rock',             image_url: `${WOA}/fileadmin/_processed_/3/b/csm_uli_jon_roth26_db0812a7ce.jpg` },
  { name: 'Yngwie Malmsteen',stage: 'W.E.T.', start_time: t(D3,17, 0), end_time: t(D3,18, 0), genre: 'Neoclassical Metal',image_url: `${WOA}/fileadmin/_processed_/9/0/csm_yngwie_malmsteen_26_451945c4f5.jpg` },
  { name: 'Judas Priest',    stage: 'W.E.T.', start_time: t(D3,20,30), end_time: t(D3,22, 0), genre: 'Heavy Metal',      image_url: `${WOA}/fileadmin/_processed_/0/d/csm_judas_priest26_47424c35d1.jpg` },
  { name: 'Def Leppard',     stage: 'W.E.T.', start_time: t(D3,23,30), end_time: t(D3n, 1, 0), genre: 'Hard Rock',       image_url: `${WOA}/fileadmin/_processed_/3/4/csm_Def_Leppard-WOA26_27e5f4ed42.jpg` },

  // HARDER STAGE
  { name: 'Thundermother',   stage: 'Harder', start_time: t(D3,12,30), end_time: t(D3,13,30), genre: 'Rock',                   image_url: `${WOA}/fileadmin/_processed_/9/a/csm_Thundermother-Band-2023_d61771d790.jpg` },
  { name: 'Faun',            stage: 'Harder', start_time: t(D3,14, 0), end_time: t(D3,15, 0), genre: 'Folk',                   image_url: `${WOA}/fileadmin/_processed_/2/4/csm_Faun2-WOA26_dec165b202.jpg` },
  { name: 'Crimson Glory',   stage: 'Harder', start_time: t(D3,15,30), end_time: t(D3,16,30), genre: 'Progressive Metal',      image_url: `${WOA}/fileadmin/_processed_/8/2/csm_crimson_glory_26_59c22b790e.jpg` },
  { name: 'Europe',          stage: 'Harder', start_time: t(D3,17,30), end_time: t(D3,18,45), genre: 'Hard Rock',              image_url: `${WOA}/fileadmin/_processed_/5/3/csm_Europe-WOA26_9d76063492.jpg` },
  { name: 'Savatage',        stage: 'Harder', start_time: t(D3,20, 0), end_time: t(D3,21,30), genre: 'Heavy Metal',            image_url: `${WOA}/fileadmin/_processed_/9/9/csm_Savatage-WOA26_6be2e38515.jpg` },
  { name: 'Electric Callboy',stage: 'Harder', start_time: t(D3,22,30), end_time: t(D3n, 0, 0), genre: 'Metalcore / Electronic', image_url: null },

  // LOUDER STAGE
  { name: 'Heavysaurus',  stage: 'Louder', start_time: t(D3,12, 0), end_time: t(D3,12,45), genre: 'Children\'s Metal',    image_url: `${WOA}/fileadmin/_processed_/3/0/csm_heavysaurus_26_9d1aa2a6db.jpg` },
  { name: 'Ad Infinitum', stage: 'Louder', start_time: t(D3,13,30), end_time: t(D3,14,30), genre: 'Symphonic Metal',       image_url: `${WOA}/fileadmin/_processed_/f/a/csm_ad_infinitum_26_cb9028b792.jpg` },
  { name: 'Therapy?',     stage: 'Louder', start_time: t(D3,15, 0), end_time: t(D3,16, 0), genre: 'Alternative Rock',      image_url: `${WOA}/fileadmin/_processed_/8/5/csm_therapy26_acbd2ac94b.jpg` },
  { name: 'Nothing More', stage: 'Louder', start_time: t(D3,17, 0), end_time: t(D3,18, 0), genre: 'Alternative Metal',     image_url: `${WOA}/fileadmin/_processed_/7/6/csm_nothing_more26_c4254934c7.jpg` },
  { name: 'Of Mice & Men',stage: 'Louder', start_time: t(D3,19,30), end_time: t(D3,20,30), genre: 'Metalcore',             image_url: `${WOA}/fileadmin/_processed_/5/2/csm_of_mice_and_men_26_26aab5f25c.jpg` },
  { name: 'Kim Dracula',  stage: 'Louder', start_time: t(D3,21, 0), end_time: t(D3,22, 0), genre: 'Alternative Metal',     image_url: `${WOA}/fileadmin/_processed_/3/4/csm_kim_dracula26_6085add158.jpg` },
  { name: 'H-Blockx',     stage: 'Louder', start_time: t(D3,23, 0), end_time: t(D3n, 0, 0), genre: 'Rap Metal',            image_url: `${WOA}/fileadmin/_processed_/c/7/csm_H_Blockx-WOA26_c10c9dda61.jpg` },

  // FASTER STAGE
  { name: 'Sabaton',         stage: 'Faster', start_time: t(D3,12, 0), end_time: t(D3,12,45), genre: 'Power Metal',          image_url: `${WOA}/fileadmin/_processed_/a/4/csm_sabaton_26_143decf5a4.jpg` },
  { name: 'Hämatom',         stage: 'Faster', start_time: t(D3,13, 0), end_time: t(D3,13,45), genre: 'Industrial Metal',     image_url: `${WOA}/fileadmin/_processed_/5/e/csm_haematom_26_a104ede3d5.jpg` },
  { name: 'Dritte Wahl',     stage: 'Faster', start_time: t(D3,14, 0), end_time: t(D3,14,45), genre: 'Punk',                 image_url: `${WOA}/fileadmin/_processed_/f/8/csm_Dritte_Wahl_26_89eac3e241.jpg` },
  { name: 'President',       stage: 'Faster', start_time: t(D3,15, 0), end_time: t(D3,15,45), genre: 'Metal',                image_url: `${WOA}/fileadmin/_processed_/9/e/csm_president26_527cb5b2ae.jpg` },
  { name: 'Lagwagon',        stage: 'Faster', start_time: t(D3,16, 0), end_time: t(D3,16,45), genre: 'Melodic Hardcore',     image_url: `${WOA}/fileadmin/_processed_/a/e/csm_lagwagon26_9b4cccaa2b.jpg` },
  { name: 'P.O.D.',          stage: 'Faster', start_time: t(D3,17, 0), end_time: t(D3,17,45), genre: 'Nu Metal',             image_url: `${WOA}/fileadmin/_processed_/f/0/csm_POD_26_52d8ce1512.jpg` },
  { name: 'Angelus Apatrida',stage: 'Faster', start_time: t(D3,18, 0), end_time: t(D3,18,45), genre: 'Thrash Metal',         image_url: `${WOA}/fileadmin/_processed_/d/0/csm_angelus_apatrida_26_0bf97316dd.jpg` },
  { name: 'Our Promise',     stage: 'Faster', start_time: t(D3,19, 0), end_time: t(D3,19,45), genre: 'Metal',                image_url: `${WOA}/fileadmin/_processed_/a/0/csm_our_promise_26_661c3c384d.jpg` },
  { name: 'Guilt Trip',      stage: 'Faster', start_time: t(D3,20, 0), end_time: t(D3,20,45), genre: 'Metal',                image_url: `${WOA}/fileadmin/_processed_/d/b/csm_guilt_trip_26_524191a47e.jpg` },
  { name: 'Unzucht',         stage: 'Faster', start_time: t(D3,21, 0), end_time: t(D3,21,45), genre: 'Industrial / Gothic',  image_url: `${WOA}/fileadmin/_processed_/b/2/csm_unzucht_26_5662cb7925.jpg` },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  loadEnvFile();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log(`Seeding ${bands.length} bands into Wacken 2026 schedule…`);

  // Remove existing data — CASCADE takes care of user_picks FK
  const { error: delError } = await supabase.from('bands').delete().not('id', 'is', null);
  if (delError) {
    console.error('Delete failed:', delError.message);
    process.exit(1);
  }

  const { error: insError } = await supabase.from('bands').insert(bands);
  if (insError) {
    console.error('Insert failed:', insError.message);
    process.exit(1);
  }

  console.log('Done 🤘');
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  seed();
}
