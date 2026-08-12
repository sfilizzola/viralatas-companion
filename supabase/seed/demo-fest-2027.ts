/**
 * Multi-festival proof seed — demo-fest-2027 + a tiny fake lineup.
 *
 * Usage (local / non-prod only):
 *   npm run seed:demo-fest
 *   # or: npx tsx supabase/seed/demo-fest-2027.ts
 *
 * What it does:
 *   1. Upserts festival slug `demo-fest-2027` (Europe/Paris, Jun 2027).
 *   2. Replaces that festival's bands with 3 fake slots (DEM1–DEM3).
 *
 * Safe relative to Wacken: does NOT delete or touch wacken-2026 bands/picks.
 * Do NOT run destructive seeds against production. Do not apply migration to prod
 * from this script — it only upserts catalog + demo bands via service role.
 *
 * Requires .env.local: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */

import {
  createServiceClient,
  isSelfInvoked,
  resolveFestivalId,
} from './seed-shared';

const DEMO_SLUG = 'demo-fest-2027';

const DEMO_FESTIVAL = {
  slug: DEMO_SLUG,
  name: 'Demo Fest 2027',
  timezone: 'Europe/Paris',
  starts_at: '2027-06-01T00:00:00+02:00',
  ends_at: '2027-06-05T00:00:00+02:00',
  features: {
    metal_place: false,
    map: false,
    duck: false,
    camp: false,
    wrap: true,
    remote_lineup: false,
  },
};

const DEMO_BANDS = [
  {
    slot_id: 'DEM1',
    name: 'Proof Metal Cats',
    stage: 'Main',
    start_time: '2027-06-01T18:00:00+02:00',
    end_time: '2027-06-01T19:00:00+02:00',
    genre: 'Thrash',
    image_url: null as string | null,
    category: 'band' as const,
  },
  {
    slot_id: 'DEM2',
    name: 'IndexedDB Warriors',
    stage: 'Side',
    start_time: '2027-06-02T20:00:00+02:00',
    end_time: '2027-06-02T21:00:00+02:00',
    genre: 'Death Metal',
    image_url: null as string | null,
    category: 'band' as const,
  },
  {
    slot_id: 'DEM3',
    name: 'Realtime Ghosts',
    stage: 'Main',
    start_time: '2027-06-03T22:00:00+02:00',
    end_time: '2027-06-03T23:30:00+02:00',
    genre: 'Doom',
    image_url: null as string | null,
    category: 'band' as const,
  },
];

export async function main() {
  const { supabase, supabaseUrl } = createServiceClient();

  console.log('━'.repeat(72));
  console.log('Demo Fest 2027 seed — multi-festival proof');
  console.log('━'.repeat(72));
  console.log(`Target: ${supabaseUrl}`);
  console.log(`Festival slug: ${DEMO_SLUG}`);
  console.log(`Bands: ${DEMO_BANDS.length}`);
  console.log('');

  const { data: fest, error: festError } = await supabase
    .from('festivals')
    .upsert(DEMO_FESTIVAL, { onConflict: 'slug' })
    .select('id, slug, name')
    .single();

  if (festError || !fest) {
    console.error(`Festival upsert failed: ${festError?.message ?? 'no data'}`);
    process.exit(1);
  }

  const festivalId = fest.id as string;
  console.log(`✓ Festival upserted: ${fest.slug} (${festivalId})`);

  // Sanity: resolveFestivalId should match upsert
  const resolved = await resolveFestivalId(supabase, DEMO_SLUG);
  if (resolved !== festivalId) {
    console.error(`Festival id mismatch: upsert=${festivalId} resolve=${resolved}`);
    process.exit(1);
  }

  const { error: delError } = await supabase
    .from('bands')
    .delete()
    .eq('festival_id', festivalId);
  if (delError) {
    console.error(`Demo band wipe failed: ${delError.message}`);
    process.exit(1);
  }

  const rows = DEMO_BANDS.map((b) => ({ ...b, festival_id: festivalId }));
  const { error: insError } = await supabase.from('bands').insert(rows);
  if (insError) {
    console.error(`Demo band insert failed: ${insError.message}`);
    process.exit(1);
  }

  const { count, error: countError } = await supabase
    .from('bands')
    .select('*', { count: 'exact', head: true })
    .eq('festival_id', festivalId);
  if (countError) {
    console.error(`Count failed: ${countError.message}`);
    process.exit(1);
  }
  if ((count ?? 0) !== DEMO_BANDS.length) {
    console.error(
      `Post-condition failed — expected ${DEMO_BANDS.length} demo bands, found ${count}`,
    );
    process.exit(1);
  }

  console.log(`✓ Inserted ${DEMO_BANDS.length} demo bands (wacken-2026 untouched)`);
  console.log('');
  console.log('Done 🤘');
}

if (isSelfInvoked(import.meta.url)) {
  main();
}
