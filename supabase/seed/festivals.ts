/**
 * Upsert a festival catalog row by slug (ops / local seed helper).
 *
 * Usage:
 *   npm run seed:festival -- \
 *     --slug demo-fest-2027 --name "Demo Fest 2027" --tz Europe/Paris \
 *     --starts 2027-06-01T00:00:00+02:00 --ends 2027-06-05T00:00:00+02:00 \
 *     --features '{}'
 *
 * Requires .env.local with VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Catalog INSERT/DELETE stay service-role / laptop. Authenticated clients may
 * SELECT; godlike may UPDATE `features` + `cache_version` only (Phase 49).
 */

import { createServiceClient, isSelfInvoked } from './seed-shared';

function argValue(flag: string, argv = process.argv): string | undefined {
  const i = argv.indexOf(flag);
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  return undefined;
}

function requireArg(flag: string): string {
  const v = argValue(flag);
  if (!v) {
    console.error(`Missing required ${flag}`);
    process.exit(1);
  }
  return v;
}

export async function main() {
  const slug = requireArg('--slug');
  const name = requireArg('--name');
  const timezone = argValue('--tz') ?? 'Europe/Berlin';
  const starts_at = requireArg('--starts');
  const ends_at = requireArg('--ends');
  const featuresRaw = argValue('--features') ?? '{}';

  let features: Record<string, unknown>;
  try {
    features = JSON.parse(featuresRaw) as Record<string, unknown>;
    if (features === null || typeof features !== 'object' || Array.isArray(features)) {
      throw new Error('features must be a JSON object');
    }
  } catch (err) {
    console.error(
      `Invalid --features JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }

  const { supabase, supabaseUrl } = createServiceClient();

  console.log('━'.repeat(72));
  console.log('Festival upsert');
  console.log('━'.repeat(72));
  console.log(`Target: ${supabaseUrl}`);
  console.log(`Slug:   ${slug}`);
  console.log(`Name:   ${name}`);
  console.log(`TZ:     ${timezone}`);
  console.log(`Starts: ${starts_at}`);
  console.log(`Ends:   ${ends_at}`);
  console.log(`Features: ${JSON.stringify(features)}`);
  console.log('');

  const { data, error } = await supabase
    .from('festivals')
    .upsert(
      {
        slug,
        name,
        timezone,
        starts_at,
        ends_at,
        features,
      },
      { onConflict: 'slug' },
    )
    .select('id, slug, name, timezone, starts_at, ends_at, features, cache_version')
    .single();

  if (error) {
    console.error(`Upsert failed: ${error.message}`);
    process.exit(1);
  }

  console.log('✓ Upserted festival:');
  console.log(JSON.stringify(data, null, 2));
  console.log('Done 🤘');
}

if (isSelfInvoked(import.meta.url)) {
  main();
}
