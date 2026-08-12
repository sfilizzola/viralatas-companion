/**
 * Summer Breeze Open Air 2026 lineup seed.
 *
 * Usage (destructive for this festival only):
 *   npm run seed:summer-breeze          # dry-run
 *   npm run seed:summer-breeze -- --force
 *
 * Festival catalog row must already exist (slug summer-breeze-2026).
 * Deletes bands WHERE festival_id = that festival, then inserts this lineup.
 * Wacken / other festivals untouched.
 *
 * DO NOT use `npm run seed:bands -- --festival summer-breeze-2026` —
 * bands.ts is Wacken-only (guarded).
 *
 * Sources:
 *   - https://www.summer-breeze.de/wp-json/summer-breeze-app/v1/gigs/2026
 *   - https://www.summer-breeze.de/wp-content/uploads/2026/07/02/Runningorder-2026-A4.pdf
 *     (Surprise Show + Hindarfjäll times only)
 * Scratch: docs/superpowers/prototypes/summer-breeze-2026/
 * Wiki: docs/ai-wiki/festivals/summer-breeze-2026/
 *
 * v1: music slots only (yoga/podcast/disco/parties excluded).
 * Requires .env.local: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */

import { createServiceClient, isSelfInvoked, resolveFestivalId } from './seed-shared';
import type { SupabaseClient } from '@supabase/supabase-js';

const FESTIVAL_SLUG = 'summer-breeze-2026';

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

export const EXPECTED_BAND_COUNT = 135;
export const SLOT_ID_RE = /^(MAI|TST|TRB|CAM)\d+$/;

const STAGES = {
  MAIN: 'Main Stage',
  T: 'T-Stage',
  TOOL: 'Wera Tool Rebel Stage',
  CAMP: 'Campsite Circus Stage',
} as const;

export const bands: BandSeed[] = [

  // ── 2026-08-11 ──
  { slot_id: 'CAM1', name: 'Ghetto Justice', stage: STAGES.CAMP, start_time: '2026-08-11T17:00:00+02:00', end_time: '2026-08-11T17:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM2', name: 'Die Habenichtse', stage: STAGES.CAMP, start_time: '2026-08-11T18:15:00+02:00', end_time: '2026-08-11T19:00:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM3', name: 'Motorjesus', stage: STAGES.CAMP, start_time: '2026-08-11T19:30:00+02:00', end_time: '2026-08-11T20:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM4', name: 'Hackneyed', stage: STAGES.CAMP, start_time: '2026-08-11T20:45:00+02:00', end_time: '2026-08-11T21:45:00+02:00', genre: 'Metal', image_url: null },

  // ── 2026-08-12 ──
  { slot_id: 'TST1', name: 'Blasmusik Illenschwang', stage: STAGES.T, start_time: '2026-08-12T15:00:00+02:00', end_time: '2026-08-12T16:00:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB1', name: 'Persecutor', stage: STAGES.TOOL, start_time: '2026-08-12T16:05:00+02:00', end_time: '2026-08-12T16:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI1', name: 'Excrementory Grindfuckers', stage: STAGES.MAIN, start_time: '2026-08-12T16:10:00+02:00', end_time: '2026-08-12T17:10:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST2', name: 'Neckbreakker', stage: STAGES.T, start_time: '2026-08-12T16:50:00+02:00', end_time: '2026-08-12T17:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI2', name: 'Betontod', stage: STAGES.MAIN, start_time: '2026-08-12T17:40:00+02:00', end_time: '2026-08-12T18:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB2', name: 'King Nugget Gang', stage: STAGES.TOOL, start_time: '2026-08-12T17:40:00+02:00', end_time: '2026-08-12T18:20:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM5', name: 'Born Hanged', stage: STAGES.CAMP, start_time: '2026-08-12T18:15:00+02:00', end_time: '2026-08-12T18:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST3', name: 'The Narrator', stage: STAGES.T, start_time: '2026-08-12T18:25:00+02:00', end_time: '2026-08-12T19:10:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI3', name: 'Airbourne', stage: STAGES.MAIN, start_time: '2026-08-12T19:10:00+02:00', end_time: '2026-08-12T20:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM6', name: 'Dethroned', stage: STAGES.CAMP, start_time: '2026-08-12T19:10:00+02:00', end_time: '2026-08-12T19:50:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB3', name: 'Inhuman Nature', stage: STAGES.TOOL, start_time: '2026-08-12T19:15:00+02:00', end_time: '2026-08-12T19:55:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST4', name: 'Green Lung', stage: STAGES.T, start_time: '2026-08-12T20:00:00+02:00', end_time: '2026-08-12T20:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM7', name: 'Backstabbed', stage: STAGES.CAMP, start_time: '2026-08-12T20:20:00+02:00', end_time: '2026-08-12T21:00:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB4', name: 'Urne', stage: STAGES.TOOL, start_time: '2026-08-12T20:50:00+02:00', end_time: '2026-08-12T21:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI4', name: 'In Flames', stage: STAGES.MAIN, start_time: '2026-08-12T21:15:00+02:00', end_time: '2026-08-12T22:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM8', name: 'Ochmoneks', stage: STAGES.CAMP, start_time: '2026-08-12T21:30:00+02:00', end_time: '2026-08-12T22:10:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST5', name: 'Paradise Lost', stage: STAGES.T, start_time: '2026-08-12T21:35:00+02:00', end_time: '2026-08-12T22:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB5', name: 'Castle Rat', stage: STAGES.TOOL, start_time: '2026-08-12T22:40:00+02:00', end_time: '2026-08-12T23:20:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM9', name: 'Waves Like Walls', stage: STAGES.CAMP, start_time: '2026-08-12T22:40:00+02:00', end_time: '2026-08-12T23:20:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI5', name: 'Hatebreed', stage: STAGES.MAIN, start_time: '2026-08-12T23:25:00+02:00', end_time: '2026-08-13T00:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST6', name: 'Eivør', stage: STAGES.T, start_time: '2026-08-12T23:25:00+02:00', end_time: '2026-08-13T00:25:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM10', name: 'Thormesis', stage: STAGES.CAMP, start_time: '2026-08-12T23:50:00+02:00', end_time: '2026-08-13T00:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB6', name: 'Cân Bardd', stage: STAGES.TOOL, start_time: '2026-08-13T00:30:00+02:00', end_time: '2026-08-13T01:10:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI6', name: 'Alcest', stage: STAGES.MAIN, start_time: '2026-08-13T01:00:00+02:00', end_time: '2026-08-13T02:00:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST7', name: 'Miracle Of Sound', stage: STAGES.T, start_time: '2026-08-13T01:15:00+02:00', end_time: '2026-08-13T02:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB7', name: '802', stage: STAGES.TOOL, start_time: '2026-08-13T02:20:00+02:00', end_time: '2026-08-13T03:00:00+02:00', genre: 'Metal', image_url: null },

  // ── 2026-08-13 ──
  { slot_id: 'TST8', name: 'Fulci', stage: STAGES.T, start_time: '2026-08-13T11:30:00+02:00', end_time: '2026-08-13T12:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI7', name: 'Our Promise', stage: STAGES.MAIN, start_time: '2026-08-13T12:00:00+02:00', end_time: '2026-08-13T12:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB8', name: 'Fireborn', stage: STAGES.TOOL, start_time: '2026-08-13T12:20:00+02:00', end_time: '2026-08-13T12:50:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI8', name: 'From Fall To Spring', stage: STAGES.MAIN, start_time: '2026-08-13T12:55:00+02:00', end_time: '2026-08-13T13:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST9', name: 'Massive Wagons', stage: STAGES.T, start_time: '2026-08-13T12:55:00+02:00', end_time: '2026-08-13T13:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB9', name: 'Broken By The Scream', stage: STAGES.TOOL, start_time: '2026-08-13T13:45:00+02:00', end_time: '2026-08-13T14:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI9', name: 'Alien Ant Farm', stage: STAGES.MAIN, start_time: '2026-08-13T13:50:00+02:00', end_time: '2026-08-13T14:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST10', name: 'Grand Magus', stage: STAGES.T, start_time: '2026-08-13T14:20:00+02:00', end_time: '2026-08-13T15:05:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI10', name: 'Northlane', stage: STAGES.MAIN, start_time: '2026-08-13T15:00:00+02:00', end_time: '2026-08-13T15:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB10', name: 'Stam1na', stage: STAGES.TOOL, start_time: '2026-08-13T15:10:00+02:00', end_time: '2026-08-13T15:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM11', name: 'Kllsignl', stage: STAGES.CAMP, start_time: '2026-08-13T15:30:00+02:00', end_time: '2026-08-13T16:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST11', name: 'Deserted Fear', stage: STAGES.T, start_time: '2026-08-13T15:45:00+02:00', end_time: '2026-08-13T16:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI11', name: 'Kim Dracula', stage: STAGES.MAIN, start_time: '2026-08-13T16:10:00+02:00', end_time: '2026-08-13T17:10:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB11', name: 'Rectal Smegma', stage: STAGES.TOOL, start_time: '2026-08-13T16:35:00+02:00', end_time: '2026-08-13T17:05:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM12', name: 'Serpents', stage: STAGES.CAMP, start_time: '2026-08-13T16:45:00+02:00', end_time: '2026-08-13T17:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST12', name: 'Trollfest', stage: STAGES.T, start_time: '2026-08-13T17:10:00+02:00', end_time: '2026-08-13T17:55:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI12', name: 'Imminence', stage: STAGES.MAIN, start_time: '2026-08-13T17:40:00+02:00', end_time: '2026-08-13T18:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB12', name: 'Filth', stage: STAGES.TOOL, start_time: '2026-08-13T18:00:00+02:00', end_time: '2026-08-13T18:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM13', name: 'I Am Your God', stage: STAGES.CAMP, start_time: '2026-08-13T18:00:00+02:00', end_time: '2026-08-13T18:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST13', name: 'Surprise Show', stage: STAGES.T, start_time: '2026-08-13T18:35:00+02:00', end_time: '2026-08-13T19:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI13', name: 'Saxon', stage: STAGES.MAIN, start_time: '2026-08-13T19:10:00+02:00', end_time: '2026-08-13T20:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM14', name: 'Aesthetic Perfection', stage: STAGES.CAMP, start_time: '2026-08-13T19:15:00+02:00', end_time: '2026-08-13T20:00:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB13', name: 'Mittel Alta', stage: STAGES.TOOL, start_time: '2026-08-13T19:40:00+02:00', end_time: '2026-08-13T20:25:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST14', name: 'Fit For An Autopsy', stage: STAGES.T, start_time: '2026-08-13T20:30:00+02:00', end_time: '2026-08-13T21:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM15', name: 'Warfield', stage: STAGES.CAMP, start_time: '2026-08-13T20:30:00+02:00', end_time: '2026-08-13T21:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI14', name: 'Eisbrecher', stage: STAGES.MAIN, start_time: '2026-08-13T21:15:00+02:00', end_time: '2026-08-13T22:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB14', name: 'Cryptopsy', stage: STAGES.TOOL, start_time: '2026-08-13T21:35:00+02:00', end_time: '2026-08-13T22:20:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM16', name: 'Katerfahrt', stage: STAGES.CAMP, start_time: '2026-08-13T21:45:00+02:00', end_time: '2026-08-13T22:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST15', name: 'Mushroomhead', stage: STAGES.T, start_time: '2026-08-13T22:25:00+02:00', end_time: '2026-08-13T23:25:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI15', name: 'Amorphis', stage: STAGES.MAIN, start_time: '2026-08-13T23:25:00+02:00', end_time: '2026-08-14T00:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB15', name: 'Groza', stage: STAGES.TOOL, start_time: '2026-08-13T23:30:00+02:00', end_time: '2026-08-14T00:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST16', name: 'Blackbraid', stage: STAGES.T, start_time: '2026-08-14T00:20:00+02:00', end_time: '2026-08-14T01:20:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI16', name: 'dARTAGNAN', stage: STAGES.MAIN, start_time: '2026-08-14T01:00:00+02:00', end_time: '2026-08-14T02:00:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB16', name: 'Hindarfjäll', stage: STAGES.TOOL, start_time: '2026-08-14T01:25:00+02:00', end_time: '2026-08-14T02:10:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST17', name: 'Saor', stage: STAGES.T, start_time: '2026-08-14T02:15:00+02:00', end_time: '2026-08-14T03:00:00+02:00', genre: 'Metal', image_url: null },

  // ── 2026-08-14 ──
  { slot_id: 'TST18', name: 'Setyøursails', stage: STAGES.T, start_time: '2026-08-14T11:30:00+02:00', end_time: '2026-08-14T12:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI17', name: 'Nanowar of Steel', stage: STAGES.MAIN, start_time: '2026-08-14T12:00:00+02:00', end_time: '2026-08-14T12:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB17', name: 'Zerre', stage: STAGES.TOOL, start_time: '2026-08-14T12:20:00+02:00', end_time: '2026-08-14T12:50:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI18', name: 'Das Lumpenpack', stage: STAGES.MAIN, start_time: '2026-08-14T12:55:00+02:00', end_time: '2026-08-14T13:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST19', name: 'Brainstorm', stage: STAGES.T, start_time: '2026-08-14T12:55:00+02:00', end_time: '2026-08-14T13:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB18', name: 'Pridian', stage: STAGES.TOOL, start_time: '2026-08-14T13:45:00+02:00', end_time: '2026-08-14T14:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI19', name: 'Future Palace', stage: STAGES.MAIN, start_time: '2026-08-14T13:50:00+02:00', end_time: '2026-08-14T14:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST20', name: 'Misery Index', stage: STAGES.T, start_time: '2026-08-14T14:20:00+02:00', end_time: '2026-08-14T15:05:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI20', name: 'Brothers Of Metal', stage: STAGES.MAIN, start_time: '2026-08-14T15:00:00+02:00', end_time: '2026-08-14T15:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB19', name: 'Luna Kills', stage: STAGES.TOOL, start_time: '2026-08-14T15:10:00+02:00', end_time: '2026-08-14T15:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM17', name: 'Sun Eater', stage: STAGES.CAMP, start_time: '2026-08-14T15:30:00+02:00', end_time: '2026-08-14T16:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST21', name: 'Speed', stage: STAGES.T, start_time: '2026-08-14T15:45:00+02:00', end_time: '2026-08-14T16:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI21', name: 'The Butcher Sisters', stage: STAGES.MAIN, start_time: '2026-08-14T16:10:00+02:00', end_time: '2026-08-14T17:10:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB20', name: 'Brymir', stage: STAGES.TOOL, start_time: '2026-08-14T16:35:00+02:00', end_time: '2026-08-14T17:05:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM18', name: 'Avalanche Effect', stage: STAGES.CAMP, start_time: '2026-08-14T16:45:00+02:00', end_time: '2026-08-14T17:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST22', name: 'Unprocessed', stage: STAGES.T, start_time: '2026-08-14T17:10:00+02:00', end_time: '2026-08-14T17:55:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI22', name: 'The Ghost Inside', stage: STAGES.MAIN, start_time: '2026-08-14T17:40:00+02:00', end_time: '2026-08-14T18:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB21', name: 'Erdling', stage: STAGES.TOOL, start_time: '2026-08-14T18:00:00+02:00', end_time: '2026-08-14T18:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM19', name: 'Heaven.Exe', stage: STAGES.CAMP, start_time: '2026-08-14T18:00:00+02:00', end_time: '2026-08-14T18:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST23', name: 'Deicide', stage: STAGES.T, start_time: '2026-08-14T18:35:00+02:00', end_time: '2026-08-14T19:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI23', name: 'Lamb Of God', stage: STAGES.MAIN, start_time: '2026-08-14T19:10:00+02:00', end_time: '2026-08-14T20:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM20', name: 'Minus Youth', stage: STAGES.CAMP, start_time: '2026-08-14T19:15:00+02:00', end_time: '2026-08-14T20:00:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB22', name: 'Blood Command', stage: STAGES.TOOL, start_time: '2026-08-14T19:40:00+02:00', end_time: '2026-08-14T20:25:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST24', name: 'Terror', stage: STAGES.T, start_time: '2026-08-14T20:30:00+02:00', end_time: '2026-08-14T21:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM21', name: 'Perchta', stage: STAGES.CAMP, start_time: '2026-08-14T20:30:00+02:00', end_time: '2026-08-14T21:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI24', name: 'Arch Enemy', stage: STAGES.MAIN, start_time: '2026-08-14T21:15:00+02:00', end_time: '2026-08-14T22:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB23', name: 'Illdisposed', stage: STAGES.TOOL, start_time: '2026-08-14T21:35:00+02:00', end_time: '2026-08-14T22:20:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM22', name: 'Vulvarine', stage: STAGES.CAMP, start_time: '2026-08-14T21:45:00+02:00', end_time: '2026-08-14T22:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST25', name: 'Der Weg Einer Freiheit', stage: STAGES.T, start_time: '2026-08-14T22:25:00+02:00', end_time: '2026-08-14T23:25:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI25', name: 'Versengold', stage: STAGES.MAIN, start_time: '2026-08-14T23:25:00+02:00', end_time: '2026-08-15T00:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB24', name: 'Ten56.', stage: STAGES.TOOL, start_time: '2026-08-14T23:30:00+02:00', end_time: '2026-08-15T00:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST26', name: 'Deafheaven', stage: STAGES.T, start_time: '2026-08-15T00:20:00+02:00', end_time: '2026-08-15T01:20:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI26', name: 'Skindred', stage: STAGES.MAIN, start_time: '2026-08-15T01:00:00+02:00', end_time: '2026-08-15T02:00:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB25', name: 'Bizarrekult', stage: STAGES.TOOL, start_time: '2026-08-15T01:25:00+02:00', end_time: '2026-08-15T02:10:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST27', name: 'Wolves In The Throne Room', stage: STAGES.T, start_time: '2026-08-15T02:15:00+02:00', end_time: '2026-08-15T03:00:00+02:00', genre: 'Metal', image_url: null },

  // ── 2026-08-15 ──
  { slot_id: 'TST28', name: 'Soulbound', stage: STAGES.T, start_time: '2026-08-15T11:30:00+02:00', end_time: '2026-08-15T12:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI27', name: 'Heavysaurus', stage: STAGES.MAIN, start_time: '2026-08-15T12:00:00+02:00', end_time: '2026-08-15T12:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB26', name: 'Inner Space', stage: STAGES.TOOL, start_time: '2026-08-15T12:20:00+02:00', end_time: '2026-08-15T12:50:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM23', name: 'Rodscha Aus Kambodscha Und Tom Palme', stage: STAGES.CAMP, start_time: '2026-08-15T12:45:00+02:00', end_time: '2026-08-15T13:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI28', name: 'Parasite Inc.', stage: STAGES.MAIN, start_time: '2026-08-15T12:55:00+02:00', end_time: '2026-08-15T13:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST29', name: 'Sanguisugabogg', stage: STAGES.T, start_time: '2026-08-15T12:55:00+02:00', end_time: '2026-08-15T13:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB27', name: 'Skeleton Pit', stage: STAGES.TOOL, start_time: '2026-08-15T13:45:00+02:00', end_time: '2026-08-15T14:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI29', name: 'The Sons Of Huens', stage: STAGES.MAIN, start_time: '2026-08-15T13:50:00+02:00', end_time: '2026-08-15T14:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM24', name: 'Randale', stage: STAGES.CAMP, start_time: '2026-08-15T14:00:00+02:00', end_time: '2026-08-15T15:00:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST30', name: 'Bloodred Hourglass', stage: STAGES.T, start_time: '2026-08-15T14:20:00+02:00', end_time: '2026-08-15T15:05:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI30', name: 'Kadavar', stage: STAGES.MAIN, start_time: '2026-08-15T15:00:00+02:00', end_time: '2026-08-15T15:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB28', name: 'Wucan', stage: STAGES.TOOL, start_time: '2026-08-15T15:10:00+02:00', end_time: '2026-08-15T15:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM25', name: 'Plume', stage: STAGES.CAMP, start_time: '2026-08-15T15:30:00+02:00', end_time: '2026-08-15T16:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST31', name: 'Municipal Waste', stage: STAGES.T, start_time: '2026-08-15T15:45:00+02:00', end_time: '2026-08-15T16:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI31', name: 'Orbit Culture', stage: STAGES.MAIN, start_time: '2026-08-15T16:10:00+02:00', end_time: '2026-08-15T17:10:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB29', name: 'Haggefugg', stage: STAGES.TOOL, start_time: '2026-08-15T16:35:00+02:00', end_time: '2026-08-15T17:05:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM26', name: 'Blacktoothed', stage: STAGES.CAMP, start_time: '2026-08-15T16:45:00+02:00', end_time: '2026-08-15T17:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST32', name: 'Thundermother', stage: STAGES.T, start_time: '2026-08-15T17:10:00+02:00', end_time: '2026-08-15T17:55:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI32', name: 'Testament', stage: STAGES.MAIN, start_time: '2026-08-15T17:40:00+02:00', end_time: '2026-08-15T18:40:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB30', name: 'Cabal', stage: STAGES.TOOL, start_time: '2026-08-15T18:00:00+02:00', end_time: '2026-08-15T18:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM27', name: 'Hopsydian', stage: STAGES.CAMP, start_time: '2026-08-15T18:00:00+02:00', end_time: '2026-08-15T18:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST33', name: 'Decapitated', stage: STAGES.T, start_time: '2026-08-15T18:35:00+02:00', end_time: '2026-08-15T19:35:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI33', name: 'Alestorm', stage: STAGES.MAIN, start_time: '2026-08-15T19:10:00+02:00', end_time: '2026-08-15T20:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM28', name: 'Lost in Hollywood', stage: STAGES.CAMP, start_time: '2026-08-15T19:15:00+02:00', end_time: '2026-08-15T20:00:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB31', name: 'Manntra', stage: STAGES.TOOL, start_time: '2026-08-15T19:40:00+02:00', end_time: '2026-08-15T20:25:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST34', name: 'Soulfly', stage: STAGES.T, start_time: '2026-08-15T20:30:00+02:00', end_time: '2026-08-15T21:30:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM29', name: 'Phantom Corporation', stage: STAGES.CAMP, start_time: '2026-08-15T20:30:00+02:00', end_time: '2026-08-15T21:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI34', name: 'Helloween', stage: STAGES.MAIN, start_time: '2026-08-15T21:15:00+02:00', end_time: '2026-08-15T23:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB32', name: '200 Stab Wounds', stage: STAGES.TOOL, start_time: '2026-08-15T21:35:00+02:00', end_time: '2026-08-15T22:20:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'CAM30', name: 'Hæresis', stage: STAGES.CAMP, start_time: '2026-08-15T21:45:00+02:00', end_time: '2026-08-15T22:45:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST35', name: 'Paleface Swiss', stage: STAGES.T, start_time: '2026-08-15T22:25:00+02:00', end_time: '2026-08-15T23:25:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB33', name: 'Slomosa', stage: STAGES.TOOL, start_time: '2026-08-15T23:30:00+02:00', end_time: '2026-08-16T00:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'MAI35', name: 'Thy Art Is Murder', stage: STAGES.MAIN, start_time: '2026-08-15T23:55:00+02:00', end_time: '2026-08-16T01:15:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TST36', name: 'Soen', stage: STAGES.T, start_time: '2026-08-16T00:20:00+02:00', end_time: '2026-08-16T01:20:00+02:00', genre: 'Metal', image_url: null },
  { slot_id: 'TRB34', name: 'Møl', stage: STAGES.TOOL, start_time: '2026-08-16T01:25:00+02:00', end_time: '2026-08-16T02:10:00+02:00', genre: 'Metal', image_url: null },
];

function hasForceFlag(argv = process.argv): boolean {
  return argv.includes('--force');
}

async function countBands(supabase: SupabaseClient, festivalId: string) {
  const { count, error } = await supabase
    .from('bands')
    .select('*', { count: 'exact', head: true })
    .eq('festival_id', festivalId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function main() {
  if (bands.length !== EXPECTED_BAND_COUNT) {
    console.error(`Band array length ${bands.length} != EXPECTED_BAND_COUNT ${EXPECTED_BAND_COUNT}`);
    process.exit(1);
  }
  for (const b of bands) {
    if (!SLOT_ID_RE.test(b.slot_id)) {
      console.error(`Invalid slot_id: ${b.slot_id}`);
      process.exit(1);
    }
  }

  const { supabase, supabaseUrl } = createServiceClient();
  const festivalId = await resolveFestivalId(supabase, FESTIVAL_SLUG);

  console.log('━'.repeat(72));
  console.log('Summer Breeze 2026 lineup seed — DESTRUCTIVE for this festival only');
  console.log('━'.repeat(72));
  console.log(`Target:   ${supabaseUrl}`);
  console.log(`Festival: ${FESTIVAL_SLUG} (${festivalId})`);
  console.log(`Bands:    ${bands.length}`);
  const existing = await countBands(supabase, festivalId);
  console.log(`Existing: ${existing}`);
  console.log('');
  console.log('Will:');
  console.log(`  • DELETE bands WHERE festival_id = ${FESTIVAL_SLUG}`);
  console.log("  • CASCADE that festival's user_picks + user_missed_bands");
  console.log('  • Other festivals untouched');
  console.log(`  • INSERT ${bands.length} rows`);
  console.log('');

  if (!hasForceFlag()) {
    console.log('Dry-run only. Re-run with --force to apply.');
    console.log('Done 🤘');
    return;
  }

  console.log('Deleting…');
  const { error: delErr } = await supabase.from("bands").delete().eq("festival_id", festivalId);
  if (delErr) { console.error(delErr.message); process.exit(1); }
  const afterDel = await countBands(supabase, festivalId);
  if (afterDel !== 0) { console.error(`Expected 0 after delete, got ${afterDel}`); process.exit(1); }

  const payload = bands.map((b) => ({ ...b, festival_id: festivalId }));
  console.log('Inserting…');
  const { error: insErr } = await supabase.from("bands").insert(payload);
  if (insErr) { console.error(insErr.message); process.exit(1); }
  const afterIns = await countBands(supabase, festivalId);
  if (afterIns !== bands.length) {
    console.error(`Expected ${bands.length} after insert, got ${afterIns}`);
    process.exit(1);
  }
  console.log(`✓ Seeded ${afterIns} bands for ${FESTIVAL_SLUG}`);
  console.log('Done 🤘');
}

if (isSelfInvoked(import.meta.url)) {
  main();
}
