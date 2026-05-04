/**
 * Seed script — live preview fixture
 *
 * Run: npm run seed:live-now
 *
 * Requires env vars (reads from .env.local automatically):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * This keeps the real Wacken 2026 lineup data, but shifts a small group of
 * bands to overlap the current device time so the /now screen can be tested.
 *
 * WARNING: deletes all existing bands before inserting, which cascades to
 * user_picks. Use only against dev/staging data.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { bands, type BandSeed } from './bands';

type TestProfile = {
  id: string;
  display_name: string | null;
};

type LiveSlot = {
  name: string;
  startsInMinutes: number;
  durationMinutes: number;
};

const LIVE_SLOTS: LiveSlot[] = [
  { name: 'Grand Magus', startsInMinutes: -20, durationMinutes: 70 },
  { name: 'Airbourne', startsInMinutes: -15, durationMinutes: 75 },
  { name: 'Municipal Waste', startsInMinutes: -8, durationMinutes: 65 },
  { name: 'Blood Command', startsInMinutes: -35, durationMinutes: 55 },
  { name: 'Running Wild', startsInMinutes: 45, durationMinutes: 75 },
  { name: 'Mantar', startsInMinutes: 60, durationMinutes: 60 },
  { name: 'Pig Destroyer', startsInMinutes: 80, durationMinutes: 45 },
  { name: 'Hackneyed', startsInMinutes: -100, durationMinutes: 45 },
];

const PRIMARY_CURRENT_BANDS = ['Grand Magus', 'Airbourne', 'Municipal Waste', 'Blood Command'];
const NEXT_ONLY_BANDS = ['Running Wild', 'Mantar', 'Pig Destroyer'];
const PAST_ONLY_BAND = 'Hackneyed';

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

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function toIso(date: Date) {
  return date.toISOString();
}

function buildLiveBands(now: Date): BandSeed[] {
  const slotsByName = new Map(LIVE_SLOTS.map((slot) => [slot.name, slot]));

  return bands.map((band) => {
    const slot = slotsByName.get(band.name);
    if (!slot) return band;

    const start = addMinutes(now, slot.startsInMinutes);
    const end = addMinutes(start, slot.durationMinutes);
    return {
      ...band,
      start_time: toIso(start),
      end_time: toIso(end),
    };
  });
}

function pickBandNameForUser(index: number) {
  if (index < 4) return PRIMARY_CURRENT_BANDS[0];
  if (index < 8) return PRIMARY_CURRENT_BANDS[1];
  if (index < 11) return PRIMARY_CURRENT_BANDS[2];
  if (index < 13) return PRIMARY_CURRENT_BANDS[3];
  if (index < 16) return NEXT_ONLY_BANDS[index - 13];
  if (index === 16) return PAST_ONLY_BAND;
  return null;
}

async function main() {
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

  const now = new Date();
  const liveBands = buildLiveBands(now);
  const liveBandNames = LIVE_SLOTS.map((slot) => slot.name);

  console.log(`Seeding ${liveBands.length} bands with ${liveBandNames.length} live-preview slots...`);

  const { error: delError } = await supabase.from('bands').delete().not('id', 'is', null);
  if (delError) {
    console.error('Delete failed:', delError.message);
    process.exit(1);
  }

  const { data: insertedBands, error: insError } = await supabase
    .from('bands')
    .insert(liveBands)
    .select('id, name, stage, start_time, end_time');

  if (insError || !insertedBands) {
    console.error('Insert failed:', insError?.message ?? 'missing inserted band data');
    process.exit(1);
  }

  const { data: testUsers, error: userError } = await supabase
    .from('users')
    .select('id, display_name')
    .eq('is_test_user', true)
    .order('display_name', { ascending: true });

  if (userError) {
    console.error('Could not list test users:', userError.message);
    process.exit(1);
  }

  if (!testUsers?.length) {
    console.log('No disposable test users found. Run npm run seed:test-users, then run this again for crew picks.');
  } else {
    const bandsByName = new Map(insertedBands.map((band) => [band.name, band]));
    const nowIso = toIso(now);

    const picks = (testUsers as TestProfile[]).flatMap((user, index) => {
      const bandName = pickBandNameForUser(index);
      const band = bandName ? bandsByName.get(bandName) : null;
      return band ? [{ user_id: user.id, band_id: band.id, created_at: nowIso }] : [];
    });

    const presence = (testUsers as TestProfile[]).map((user, index) => ({
      user_id: user.id,
      is_camping: index === 15 || index === 17,
      updated_at: nowIso,
    }));

    const { error: picksError } = await supabase.from('user_picks').insert(picks);
    if (picksError) {
      console.error('Could not insert live-preview picks:', picksError.message);
      process.exit(1);
    }

    const { error: presenceError } = await supabase.from('user_presence').upsert(presence);
    if (presenceError) {
      console.error('Could not upsert live-preview camping state:', presenceError.message);
      process.exit(1);
    }

    console.log(`Assigned ${picks.length} deterministic picks for ${testUsers.length} test users.`);
  }

  console.log('Live-preview bands:');
  for (const name of liveBandNames) {
    const band = insertedBands.find((item) => item.name === name);
    if (!band) continue;
    console.log(`- ${band.name} @ ${band.stage}: ${band.start_time} → ${band.end_time}`);
  }
}

main();
