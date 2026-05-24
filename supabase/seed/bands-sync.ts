/**
 * Non-destructive lineup sync — diff seed against DB by slot_id.
 *
 * Run:  npm run seed:bands:sync              (dry-run)
 *       npm run seed:bands:sync -- --apply    (write changes)
 *       npm run seed:bands:sync -- --json     (machine-readable plan)
 *
 * Requires .env.local with VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */

import {
  assertSeedIntegrity,
  bands,
  type BandSeed,
  SLOT_ID_RE,
} from './bands';
import { bumpCacheVersion, createServiceClient, isSelfInvoked } from './seed-shared';

type DbRow = {
  id: string;
  slot_id: string | null;
  name: string;
  stage: string;
  start_time: string;
  end_time: string;
  genre: string | null;
  image_url: string | null;
  category: string | null;
};

const SYNC_FIELDS = [
  'name',
  'stage',
  'start_time',
  'end_time',
  'genre',
  'image_url',
  'category',
] as const;

type SyncField = (typeof SYNC_FIELDS)[number];

type FieldDiff = { before: unknown; after: unknown };

type UpdateEntry = {
  slot_id: string;
  dbId: string;
  diffs: Partial<Record<SyncField, FieldDiff>>;
};

type DeleteEntry = {
  slot_id: string;
  dbId: string;
  name: string;
  stage: string;
  start_time: string;
};

type SyncPlan = {
  inserts: BandSeed[];
  updates: UpdateEntry[];
  deletes: DeleteEntry[];
};

type PickImpact = {
  deletePicks: number;
  deleteMissed: number;
};

function normalizeCategory(value: string | null | undefined): string | null {
  return value ?? 'band';
}

function seedCategory(row: BandSeed): string | null {
  return row.category ?? 'band';
}

function fieldValuesEqual(
  field: SyncField,
  seedVal: unknown,
  dbVal: unknown,
): boolean {
  if (field === 'start_time' || field === 'end_time') {
    if (seedVal == null && dbVal == null) return true;
    if (seedVal == null || dbVal == null) return false;
    return new Date(String(seedVal)).getTime() === new Date(String(dbVal)).getTime();
  }
  return seedVal === dbVal;
}

function fieldDiff(
  seed: BandSeed,
  db: DbRow,
): Partial<Record<SyncField, FieldDiff>> | null {
  const diffs: Partial<Record<SyncField, FieldDiff>> = {};
  for (const field of SYNC_FIELDS) {
    const seedVal =
      field === 'category' ? seedCategory(seed) : seed[field];
    const dbVal =
      field === 'category' ? normalizeCategory(db.category) : db[field];
    if (!fieldValuesEqual(field, seedVal, dbVal)) {
      diffs[field] = { before: dbVal, after: seedVal };
    }
  }
  return Object.keys(diffs).length > 0 ? diffs : null;
}

async function loadDbRows(): Promise<Map<string, DbRow>> {
  const { supabase } = createServiceClient();
  const { data, error } = await supabase
    .from('bands')
    .select(
      'id, slot_id, name, stage, start_time, end_time, genre, image_url, category',
    );
  if (error) {
    console.error('Failed to load bands:', error.message);
    process.exit(1);
  }

  const nullRows = (data ?? []).filter((row) => !row.slot_id);
  if (nullRows.length > 0) {
    console.error(
      'Abort: found bands with NULL slot_id. Run `npm run seed:bands:backfill-slot-id -- --apply` (preserves picks), then retry sync.',
    );
    for (const row of nullRows) {
      console.error(
        `  · id=${row.id} name="${row.name}" stage="${row.stage}" start=${row.start_time}`,
      );
    }
    process.exit(1);
  }

  const map = new Map<string, DbRow>();
  for (const row of data ?? []) {
    map.set(row.slot_id as string, row as DbRow);
  }
  return map;
}

function buildPlan(seedRows: BandSeed[], dbRows: Map<string, DbRow>): SyncPlan {
  const seedBySlot = new Map(seedRows.map((row) => [row.slot_id, row]));
  const inserts: BandSeed[] = [];
  const updates: UpdateEntry[] = [];
  const deletes: DeleteEntry[] = [];

  for (const row of seedRows) {
    const db = dbRows.get(row.slot_id);
    if (!db) {
      inserts.push(row);
      continue;
    }
    const diffs = fieldDiff(row, db);
    if (diffs) {
      updates.push({ slot_id: row.slot_id, dbId: db.id, diffs });
    }
  }

  for (const [slotId, db] of dbRows) {
    if (!seedBySlot.has(slotId)) {
      deletes.push({
        slot_id: slotId,
        dbId: db.id,
        name: db.name,
        stage: db.stage,
        start_time: db.start_time,
      });
    }
  }

  return { inserts, updates, deletes };
}

async function computePickImpact(deletes: DeleteEntry[]): Promise<PickImpact> {
  if (deletes.length === 0) return { deletePicks: 0, deleteMissed: 0 };
  const { supabase } = createServiceClient();
  let deletePicks = 0;
  let deleteMissed = 0;

  for (const row of deletes) {
    const { count: pickCount, error: pickError } = await supabase
      .from('user_picks')
      .select('*', { count: 'exact', head: true })
      .eq('band_id', row.dbId);
    if (pickError) {
      console.error('Pick count failed:', pickError.message);
      process.exit(1);
    }
    deletePicks += pickCount ?? 0;

    const { count: missedCount, error: missedError } = await supabase
      .from('user_missed_bands')
      .select('*', { count: 'exact', head: true })
      .eq('band_id', row.dbId);
    if (missedError) {
      console.error('Missed-band count failed:', missedError.message);
      process.exit(1);
    }
    deleteMissed += missedCount ?? 0;
  }

  return { deletePicks, deleteMissed };
}

function formatTime(iso: string): string {
  return iso.replace('T', ' ').slice(0, 16);
}

function printPlan(
  plan: SyncPlan,
  impact: PickImpact,
  opts: { apply: boolean; supabaseUrl: string; dbCount: number; seedCount: number },
) {
  const mode = opts.apply ? 'APPLY' : 'DRY RUN';
  console.log('━'.repeat(72));
  console.log(`Lineup sync plan — ${mode}`);
  console.log('━'.repeat(72));
  console.log(`Target:        ${opts.supabaseUrl}`);
  console.log(`DB rows:       ${opts.dbCount}   Seed rows: ${opts.seedCount}`);
  console.log('');

  console.log(`UPDATE  (${plan.updates.length} slots)`);
  if (plan.updates.length === 0) {
    console.log('  (none)');
  } else {
    for (const entry of plan.updates) {
      console.log(`  ${entry.slot_id}`);
      for (const [field, diff] of Object.entries(entry.diffs)) {
        console.log(`         ${field}: ${JSON.stringify(diff.before)} → ${JSON.stringify(diff.after)}`);
      }
    }
  }
  console.log('');

  console.log(`INSERT  (${plan.inserts.length} slots)`);
  if (plan.inserts.length === 0) {
    console.log('  (none)');
  } else {
    for (const row of plan.inserts) {
      console.log(
        `  ${row.slot_id}   '${row.name}' · ${row.stage} · ${formatTime(row.start_time)} → ${formatTime(row.end_time)}`,
      );
    }
  }
  console.log('');

  console.log(`DELETE  (${plan.deletes.length} slots)`);
  if (plan.deletes.length === 0) {
    console.log('  (none)');
  } else {
    for (const row of plan.deletes) {
      console.log(
        `  ${row.slot_id}   '${row.name}' · ${row.stage} · ${formatTime(row.start_time)}`,
      );
    }
  }
  console.log('');

  console.log('Pick impact:');
  console.log('  · UPDATE bucket: 0 picks affected (band ids preserved)');
  console.log(
    `  · DELETE bucket: ${impact.deletePicks} picks affected, ${impact.deleteMissed} missed-band rows affected`,
  );
  console.log('  · INSERT bucket: n/a (new bands have no picks yet)');
  console.log('');

  if (!opts.apply) {
    console.log('Run with --apply to execute.');
  }
}

async function countBands(): Promise<number> {
  const { supabase } = createServiceClient();
  const { count, error } = await supabase
    .from('bands')
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Count failed:', error.message);
    process.exit(1);
  }
  return count ?? 0;
}

async function applyPlan(plan: SyncPlan): Promise<void> {
  const { supabase } = createServiceClient();
  const beforeCount = await countBands();

  for (const entry of plan.updates) {
    const patch: Record<string, unknown> = {};
    for (const [field, diff] of Object.entries(entry.diffs)) {
      patch[field] = diff.after;
    }
    const { error } = await supabase
      .from('bands')
      .update(patch)
      .eq('id', entry.dbId);
    if (error) {
      console.error(`UPDATE failed for ${entry.slot_id}:`, error.message);
      process.exit(1);
    }
  }

  if (plan.updates.length > 0) {
    const dbRows = await loadDbRows();
    for (const entry of plan.updates) {
      const seed = bands.find((row) => row.slot_id === entry.slot_id);
      const db = dbRows.get(entry.slot_id);
      if (!seed || !db) continue;
      const remaining = fieldDiff(seed, db);
      if (remaining) {
        console.error(
          `Post-condition failed: ${entry.slot_id} still differs after UPDATE.`,
        );
        process.exit(1);
      }
    }
  }

  if (plan.inserts.length > 0) {
    const { error } = await supabase.from('bands').insert(plan.inserts);
    if (error) {
      console.error('INSERT failed:', error.message);
      process.exit(1);
    }
    const afterInsert = await countBands();
    if (afterInsert !== beforeCount + plan.inserts.length) {
      console.error(
        `Insert post-condition failed — expected ${beforeCount + plan.inserts.length} rows, found ${afterInsert}.`,
      );
      process.exit(1);
    }
  }

  if (plan.deletes.length > 0) {
    const ids = plan.deletes.map((row) => row.dbId);
    const { error } = await supabase.from('bands').delete().in('id', ids);
    if (error) {
      console.error('DELETE failed:', error.message);
      process.exit(1);
    }
    const expected =
      beforeCount + plan.inserts.length - plan.deletes.length;
    const afterDelete = await countBands();
    if (afterDelete !== expected) {
      console.error(
        `Delete post-condition failed — expected ${expected} rows, found ${afterDelete}.`,
      );
      process.exit(1);
    }
  }

  const bump = await bumpCacheVersion(supabase);
  if (bump.ok) {
    console.log(`  ✓ cache_version = ${bump.value}`);
  }

  const total =
    plan.updates.length + plan.inserts.length + plan.deletes.length;
  console.log(`✓ Applied ${total} change(s) (${plan.updates.length} update, ${plan.inserts.length} insert, ${plan.deletes.length} delete)`);
}

export async function main() {
  assertSeedIntegrity(bands);
  const apply = process.argv.includes('--apply');
  const json = process.argv.includes('--json');

  const dbRows = await loadDbRows();
  const plan = buildPlan(bands, dbRows);
  const impact = await computePickImpact(plan.deletes);

  const { supabaseUrl } = createServiceClient();

  if (json) {
    console.log(
      JSON.stringify(
        {
          apply,
          dbCount: dbRows.size,
          seedCount: bands.length,
          plan,
          impact,
        },
        null,
        2,
      ),
    );
  } else {
    printPlan(plan, impact, {
      apply,
      supabaseUrl,
      dbCount: dbRows.size,
      seedCount: bands.length,
    });
  }

  const isEmpty =
    plan.inserts.length === 0 &&
    plan.updates.length === 0 &&
    plan.deletes.length === 0;

  if (apply && !isEmpty) {
    await applyPlan(plan);
  } else if (apply && isEmpty) {
    console.log('No changes to apply.');
  }
}

export { SLOT_ID_RE };

if (isSelfInvoked(import.meta.url)) {
  main();
}
