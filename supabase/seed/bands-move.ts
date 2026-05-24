/**
 * Transfer user picks when a band relocates to a different slot.
 *
 * Run:  npm run seed:bands:move -- --from FAS1 --to LOU3
 *       npm run seed:bands:move -- --from FAS1 --to LOU3 --apply
 *
 * Does NOT update band metadata — run seed:bands:sync after editing bands.ts.
 */

import { SLOT_ID_RE } from './bands';
import { bumpCacheVersion, createServiceClient, isSelfInvoked } from './seed-shared';

type BandRow = {
  id: string;
  slot_id: string;
  name: string;
  stage: string;
  start_time: string;
  end_time: string;
};

function parseArgs(): { from: string; to: string; apply: boolean } {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const fromIdx = argv.indexOf('--from');
  const toIdx = argv.indexOf('--to');
  const from = fromIdx >= 0 ? argv[fromIdx + 1] : undefined;
  const to = toIdx >= 0 ? argv[toIdx + 1] : undefined;

  if (!from || !to) {
    console.error('Usage: npm run seed:bands:move -- --from <slot_id> --to <slot_id> [--apply]');
    process.exit(1);
  }
  if (from === to) {
    console.error('Abort: --from and --to must differ.');
    process.exit(1);
  }
  if (!SLOT_ID_RE.test(from) || !SLOT_ID_RE.test(to)) {
    console.error('Abort: slot IDs must match /^(HAR|FAS|LOU|WET|HBA|WAS|WAK|JUN)\\d+$/');
    process.exit(1);
  }
  return { from, to, apply };
}

async function loadBandBySlot(slotId: string): Promise<BandRow | null> {
  const { supabase } = createServiceClient();
  const { data, error } = await supabase
    .from('bands')
    .select('id, slot_id, name, stage, start_time, end_time')
    .eq('slot_id', slotId)
    .maybeSingle();
  if (error) {
    console.error(`Failed to load slot ${slotId}:`, error.message);
    process.exit(1);
  }
  return data as BandRow | null;
}

async function countPicks(bandId: string): Promise<number> {
  const { supabase } = createServiceClient();
  const { count, error } = await supabase
    .from('user_picks')
    .select('*', { count: 'exact', head: true })
    .eq('band_id', bandId);
  if (error) {
    console.error('Pick count failed:', error.message);
    process.exit(1);
  }
  return count ?? 0;
}

async function countMissed(bandId: string): Promise<number> {
  const { supabase } = createServiceClient();
  const { count, error } = await supabase
    .from('user_missed_bands')
    .select('*', { count: 'exact', head: true })
    .eq('band_id', bandId);
  if (error) {
    console.error('Missed-band count failed:', error.message);
    process.exit(1);
  }
  return count ?? 0;
}

function describeSlot(row: BandRow): string {
  return `${row.slot_id}  "${row.name}" · ${row.stage} · ${row.start_time.slice(0, 16).replace('T', ' ')}`;
}

async function dedupeAndRepoint(
  table: 'user_picks' | 'user_missed_bands',
  fromId: string,
  toId: string,
): Promise<string[]> {
  const { supabase } = createServiceClient();

  const { data: fromRows, error: fromError } = await supabase
    .from(table)
    .select('user_id')
    .eq('band_id', fromId);
  if (fromError) {
    console.error(`${table} read failed:`, fromError.message);
    process.exit(1);
  }

  const { data: toRows, error: toError } = await supabase
    .from(table)
    .select('user_id')
    .eq('band_id', toId);
  if (toError) {
    console.error(`${table} read failed:`, toError.message);
    process.exit(1);
  }

  const toUsers = new Set((toRows ?? []).map((row) => row.user_id as string));
  const collisions = (fromRows ?? [])
    .map((row) => row.user_id as string)
    .filter((userId) => toUsers.has(userId));

  if (collisions.length > 0) {
    const { error: delError } = await supabase
      .from(table)
      .delete()
      .eq('band_id', fromId)
      .in('user_id', collisions);
    if (delError) {
      console.error(`${table} dedup delete failed:`, delError.message);
      process.exit(1);
    }
  }

  const { error: updateError } = await supabase
    .from(table)
    .update({ band_id: toId })
    .eq('band_id', fromId);
  if (updateError) {
    console.error(`${table} re-point failed:`, updateError.message);
    process.exit(1);
  }

  return collisions;
}

export async function main() {
  const { from, to, apply } = parseArgs();
  const fromRow = await loadBandBySlot(from);
  const toRow = await loadBandBySlot(to);

  if (!fromRow) {
    console.error(`Abort: source slot ${from} not found in DB.`);
    process.exit(1);
  }
  if (!toRow) {
    console.error(`Abort: destination slot ${to} not found in DB.`);
    process.exit(1);
  }

  const fromPicks = await countPicks(fromRow.id);
  const toPicks = await countPicks(toRow.id);
  const fromMissed = await countMissed(fromRow.id);

  console.log('━'.repeat(72));
  console.log(`Band move — ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log('━'.repeat(72));
  console.log(`FROM  ${describeSlot(fromRow)}  (${fromPicks} picks, ${fromMissed} missed)`);
  console.log(`TO    ${describeSlot(toRow)}  (${toPicks} picks)`);
  console.log('');

  if (!apply) {
    console.log('Run with --apply to execute.');
    return;
  }

  const pickCollisions = await dedupeAndRepoint(
    'user_picks',
    fromRow.id,
    toRow.id,
  );
  const missedCollisions = await dedupeAndRepoint(
    'user_missed_bands',
    fromRow.id,
    toRow.id,
  );

  if (pickCollisions.length > 0) {
    console.log(
      `  Deduped ${pickCollisions.length} user_picks collision(s): ${pickCollisions.join(', ')}`,
    );
  }
  if (missedCollisions.length > 0) {
    console.log(
      `  Deduped ${missedCollisions.length} user_missed_bands collision(s): ${missedCollisions.join(', ')}`,
    );
  }

  const { supabase } = createServiceClient();
  const { error: testError } = await supabase
    .from('live_band_test_config')
    .update({ band_id: toRow.id })
    .eq('band_id', fromRow.id);
  if (testError) {
    console.error('live_band_test_config re-point failed:', testError.message);
    process.exit(1);
  }

  const { error: delError } = await supabase
    .from('bands')
    .delete()
    .eq('id', fromRow.id);
  if (delError) {
    console.error('Source slot delete failed:', delError.message);
    process.exit(1);
  }

  const bump = await bumpCacheVersion(supabase);
  if (bump.ok) {
    console.log(`  ✓ cache_version = ${bump.value}`);
  }

  console.log(`✓ Moved picks from ${from} → ${to}; deleted source slot row.`);
}

if (isSelfInvoked(import.meta.url)) {
  main();
}
