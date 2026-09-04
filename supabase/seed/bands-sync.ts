/**
 * Non-destructive lineup sync — diff seed against DB by slot_id.
 *
 * Run:  npm run seed:bands:sync              (dry-run)
 *       npm run seed:bands:sync -- --apply    (write changes)
 *       npm run seed:bands:sync -- --json     (machine-readable plan)
 *       npm run seed:bands:sync -- --festival wacken-2026
 *
 * Scoped to `--festival <slug>` (default wacken-2026). Only that festival's
 * bands are loaded / inserted / deleted; other festivals are untouched.
 *
 * Requires .env.local with VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */

import {
  assertSeedIntegrity,
  bands,
  type BandSeed,
  SLOT_ID_RE,
} from './bands';
import {
  bumpCacheVersion,
  createServiceClient,
  isSelfInvoked,
  parseFestivalSlug,
  resolveFestivalId,
} from './seed-shared';
import { planNameMatches } from '../../src/services/announcementMatch';

type DbRow = {
  id: string;
  slot_id: string | null;
  name: string;
  stage: string | null;
  start_time: string | null;
  end_time: string | null;
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
  assignSlotId?: boolean;
};

type DeleteEntry = {
  slot_id: string;
  dbId: string;
  name: string;
  stage: string | null;
  start_time: string | null;
};

type SyncPlan = {
  inserts: BandSeed[];
  updates: UpdateEntry[];
  deletes: DeleteEntry[];
  leftovers: Array<{ dbId: string; name: string }>;
  skippedClusters: ReturnType<typeof planNameMatches>['skippedClusters'];
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

async function loadDbRows(festivalId: string): Promise<DbRow[]> {
  const { supabase } = createServiceClient();
  const { data, error } = await supabase
    .from('bands')
    .select(
      'id, slot_id, name, stage, start_time, end_time, genre, image_url, category',
    )
    .eq('festival_id', festivalId);
  if (error) {
    console.error('Failed to load bands:', error.message);
    process.exit(1);
  }

  return (data ?? []) as DbRow[];
}

function buildPlan(seedRows: BandSeed[], dbRows: Map<string, DbRow>): SyncPlan {
  const seedBySlot = new Map(seedRows.map((row) => [row.slot_id, row]));
  const updates: UpdateEntry[] = [];
  const deletes: DeleteEntry[] = [];

  for (const row of seedRows) {
    const db = dbRows.get(row.slot_id);
    if (!db) continue;
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

  return {
    inserts: [],
    updates,
    deletes,
    leftovers: [],
    skippedClusters: [],
  };
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

function formatTime(iso: string | null): string {
  return iso ? iso.replace('T', ' ').slice(0, 16) : '—';
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
      if (entry.assignSlotId) {
        console.log(`         slot_id: null → ${JSON.stringify(entry.slot_id)}`);
      }
      for (const [field, diff] of Object.entries(entry.diffs)) {
        console.log(`         ${field}: ${JSON.stringify(diff.before)} → ${JSON.stringify(diff.after)}`);
      }
    }
  }
  console.log('');

  console.log(`LEFTOVER  (${plan.leftovers.length} announced bands)`);
  if (plan.leftovers.length === 0) {
    console.log('  (none)');
  } else {
    for (const row of plan.leftovers) {
      console.log(`  id=${row.dbId}   '${row.name}' (kept, not deleted)`);
    }
  }
  console.log('');

  console.log(`SKIPPED  (${plan.skippedClusters.length} ambiguous name clusters)`);
  if (plan.skippedClusters.length === 0) {
    console.log('  (none)');
  } else {
    for (const cluster of plan.skippedClusters) {
      console.log(
        `  '${cluster.nameKey}'   announced=[${cluster.announcedDbIds.join(', ')}] official=[${cluster.officialSlotIds.join(', ')}]`,
      );
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

async function countBandsForFestival(festivalId: string): Promise<number> {
  const { supabase } = createServiceClient();
  const { count, error } = await supabase
    .from('bands')
    .select('*', { count: 'exact', head: true })
    .eq('festival_id', festivalId);
  if (error) {
    console.error('Count failed:', error.message);
    process.exit(1);
  }
  return count ?? 0;
}

async function applyPlan(
  plan: SyncPlan,
  festivalId: string,
  festivalSlug: string,
): Promise<void> {
  const { supabase } = createServiceClient();
  const beforeCount = await countBandsForFestival(festivalId);

  for (const entry of plan.updates) {
    const patch: Record<string, unknown> = {};
    if (entry.assignSlotId) {
      patch.slot_id = entry.slot_id;
    }
    for (const [field, diff] of Object.entries(entry.diffs)) {
      patch[field] = diff.after;
    }
    const { error } = await supabase
      .from('bands')
      .update(patch)
      .eq('id', entry.dbId)
      .eq('festival_id', festivalId);
    if (error) {
      console.error(`UPDATE failed for ${entry.slot_id}:`, error.message);
      process.exit(1);
    }
  }

  if (plan.updates.length > 0) {
    const dbRows = await loadDbRows(festivalId);
    const dbBySlot = new Map(
      dbRows
        .filter((row): row is DbRow & { slot_id: string } => Boolean(row.slot_id))
        .map((row) => [row.slot_id, row]),
    );
    for (const entry of plan.updates) {
      const seed = bands.find((row) => row.slot_id === entry.slot_id);
      const db = dbBySlot.get(entry.slot_id);
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
    const rows = plan.inserts.map((row) => ({
      ...row,
      festival_id: festivalId,
    }));
    const { error } = await supabase.from('bands').insert(rows);
    if (error) {
      console.error('INSERT failed:', error.message);
      process.exit(1);
    }
    const afterInsert = await countBandsForFestival(festivalId);
    if (afterInsert !== beforeCount + plan.inserts.length) {
      console.error(
        `Insert post-condition failed — expected ${beforeCount + plan.inserts.length} rows, found ${afterInsert}.`,
      );
      process.exit(1);
    }
  }

  if (plan.deletes.length > 0) {
    const ids = plan.deletes.map((row) => row.dbId);
    const { error } = await supabase
      .from('bands')
      .delete()
      .in('id', ids)
      .eq('festival_id', festivalId);
    if (error) {
      console.error('DELETE failed:', error.message);
      process.exit(1);
    }
    const expected =
      beforeCount + plan.inserts.length - plan.deletes.length;
    const afterDelete = await countBandsForFestival(festivalId);
    if (afterDelete !== expected) {
      console.error(
        `Delete post-condition failed — expected ${expected} rows, found ${afterDelete}.`,
      );
      process.exit(1);
    }
  }

  const bump = await bumpCacheVersion(supabase, festivalSlug);
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
  const festivalSlug = parseFestivalSlug();

  const { supabase, supabaseUrl } = createServiceClient();
  let festivalId: string;
  try {
    festivalId = await resolveFestivalId(supabase, festivalSlug);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const dbRows = await loadDbRows(festivalId);
  const dbBySlot = new Map(
    dbRows
      .filter((row): row is DbRow & { slot_id: string } => Boolean(row.slot_id))
      .map((row) => [row.slot_id, row]),
  );
  const slotMatchedSeed = bands.filter((row) => dbBySlot.has(row.slot_id));
  const unmatchedSeed = bands.filter((row) => !dbBySlot.has(row.slot_id));
  const announced = dbRows.filter((row) => !row.slot_id);
  const namePlan = planNameMatches({
    announced,
    official: unmatchedSeed,
  });
  const unmatchedSeedBySlot = new Map(
    unmatchedSeed.map((row) => [row.slot_id, row]),
  );
  const announcedById = new Map(announced.map((row) => [row.id, row]));
  const slotPlan = buildPlan(slotMatchedSeed, dbBySlot);
  const nameUpdates: UpdateEntry[] = namePlan.updates.map((entry) => {
    const seed = unmatchedSeedBySlot.get(entry.slot_id);
    const db = announcedById.get(entry.dbId);
    if (!seed || !db) {
      throw new Error(`Name-match plan references missing row for ${entry.slot_id}`);
    }
    return {
      slot_id: entry.slot_id,
      dbId: entry.dbId,
      diffs: fieldDiff(seed, db) ?? {},
      assignSlotId: true,
    };
  });
  const plan: SyncPlan = {
    inserts: namePlan.inserts.map((entry) => {
      const seed = unmatchedSeedBySlot.get(entry.slot_id);
      if (!seed) {
        throw new Error(`Name-match plan references missing seed ${entry.slot_id}`);
      }
      return seed;
    }),
    updates: [...slotPlan.updates, ...nameUpdates],
    deletes: slotPlan.deletes,
    leftovers: namePlan.leftovers.map((entry) => ({
      dbId: entry.dbId,
      name: announcedById.get(entry.dbId)?.name ?? '(unknown)',
    })),
    skippedClusters: namePlan.skippedClusters,
  };
  const impact = await computePickImpact(plan.deletes);

  if (json) {
    console.log(
      JSON.stringify(
        {
          apply,
          festival: festivalSlug,
          festivalId,
          dbCount: dbRows.length,
          seedCount: bands.length,
          plan,
          impact,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Festival: ${festivalSlug} (${festivalId})`);
    printPlan(plan, impact, {
      apply,
      supabaseUrl,
      dbCount: dbRows.length,
      seedCount: bands.length,
    });
  }

  const isEmpty =
    plan.inserts.length === 0 &&
    plan.updates.length === 0 &&
    plan.deletes.length === 0;

  if (apply && !isEmpty) {
    await applyPlan(plan, festivalId, festivalSlug);
  } else if (apply && isEmpty) {
    console.log('No changes to apply.');
  }

  if (plan.skippedClusters.length > 0) {
    process.exit(1);
  }
}

export { SLOT_ID_RE };

if (isSelfInvoked(import.meta.url)) {
  main();
}
