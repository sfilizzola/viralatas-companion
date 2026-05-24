/**
 * Non-destructive slot_id backfill — sets slot_id on existing band rows without
 * deleting or re-inserting. Preserves user_picks (band UUIDs unchanged).
 *
 * Run after migration 20260524000000_bands_slot_id_add.sql and BEFORE the lock migration.
 *
 *   npm run seed:bands:backfill-slot-id              (dry-run)
 *   npm run seed:bands:backfill-slot-id -- --apply   (write)
 *
 * Do NOT use `seed:bands --force` for this — that wipes all picks.
 */

import { assertSeedIntegrity, bands, type BandSeed } from './bands';
import { createServiceClient, isSelfInvoked } from './seed-shared';

type DbRow = {
  id: string;
  slot_id: string | null;
  name: string;
  stage: string;
  start_time: string;
};

function matchKey(row: { stage: string; start_time: string; name: string }): string {
  const instant = new Date(row.start_time).getTime();
  return `${row.stage}|${instant}|${row.name}`;
}

function buildSeedLookup(seedRows: BandSeed[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of seedRows) {
    const key = matchKey(row);
    if (map.has(key)) {
      console.error(`Seed collision on match key ${key} — fix bands.ts before backfill.`);
      process.exit(1);
    }
    map.set(key, row.slot_id);
  }
  return map;
}

async function main() {
  assertSeedIntegrity(bands);
  const apply = process.argv.includes('--apply');
  const seedLookup = buildSeedLookup(bands);
  const { supabase, supabaseUrl } = createServiceClient();

  const { data, error } = await supabase
    .from('bands')
    .select('id, slot_id, name, stage, start_time');
  if (error) {
    console.error('Failed to load bands:', error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as DbRow[];
  const alreadySet = rows.filter((row) => row.slot_id);
  const needsBackfill = rows.filter((row) => !row.slot_id);

  console.log('━'.repeat(72));
  console.log(`slot_id backfill — ${apply ? 'APPLY' : 'DRY RUN'} (picks preserved)`);
  console.log('━'.repeat(72));
  console.log(`Target:     ${supabaseUrl}`);
  console.log(`DB rows:    ${rows.length}  already have slot_id: ${alreadySet.length}  need backfill: ${needsBackfill.length}`);
  console.log('');

  if (needsBackfill.length === 0) {
    console.log('Nothing to backfill — every row already has slot_id.');
    console.log('Safe to apply migration 20260524000001_bands_slot_id_lock.sql');
    return;
  }

  const plan: { id: string; slot_id: string; name: string; stage: string }[] = [];
  const unmatched: DbRow[] = [];

  for (const row of needsBackfill) {
    const slotId = seedLookup.get(matchKey(row));
    if (!slotId) {
      unmatched.push(row);
      continue;
    }
    plan.push({ id: row.id, slot_id: slotId, name: row.name, stage: row.stage });
  }

  console.log(`MATCH   (${plan.length} rows)`);
  for (const entry of plan) {
    console.log(`  ${entry.slot_id}  "${entry.name}" · ${entry.stage}  (id ${entry.id.slice(0, 8)}…)`);
  }
  console.log('');

  if (unmatched.length > 0) {
    console.error(`UNMATCHED (${unmatched.length} rows) — cannot backfill safely:`);
    for (const row of unmatched) {
      console.error(
        `  · id=${row.id} name="${row.name}" stage="${row.stage}" start=${row.start_time}`,
      );
    }
    process.exit(1);
  }

  if (!apply) {
    console.log('Run with --apply to write slot_id on matched rows (no picks touched).');
    return;
  }

  for (const entry of plan) {
    const { error: updateError } = await supabase
      .from('bands')
      .update({ slot_id: entry.slot_id })
      .eq('id', entry.id);
    if (updateError) {
      console.error(`UPDATE failed for ${entry.slot_id}:`, updateError.message);
      process.exit(1);
    }
  }

  const { count: nullCount, error: verifyError } = await supabase
    .from('bands')
    .select('*', { count: 'exact', head: true })
    .is('slot_id', null);
  if (verifyError) {
    console.error('Verify failed:', verifyError.message);
    process.exit(1);
  }
  if ((nullCount ?? 0) > 0) {
    console.error(`Post-condition failed — ${nullCount} rows still have NULL slot_id.`);
    process.exit(1);
  }

  console.log(`✓ Backfilled ${plan.length} row(s). user_picks unchanged.`);
  console.log('  Next: npx supabase db push  (lock migration)');
}

if (isSelfInvoked(import.meta.url)) {
  main();
}
