/**
 * Remote lineup sync — apply plan to production bands (service role).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LineupPlan,
  LineupPlanSummary,
  PlanMove,
} from './lineup-remote-plan';
import { summarizePlan } from './lineup-remote-plan';

export type ApplyOptions = {
  confirmDeletes: boolean;
};

export type ApplySkipped = {
  blockedMoves: number;
  blockedDeletes: number;
};

export type ApplyResult = {
  applied: LineupPlanSummary;
  skipped: ApplySkipped;
  cacheVersion: string;
  log: string[];
};

export async function bumpCacheVersionForClient(
  supabase: SupabaseClient,
): Promise<{ ok: boolean; value: string }> {
  const value = new Date().toISOString();
  const { data, error } = await supabase
    .from('app_config')
    .update({ value })
    .eq('key', 'cache_version')
    .select('key');
  if (error || !data?.length) {
    return { ok: false, value };
  }
  return { ok: true, value };
}

async function repointSnapshottedUsers(
  supabase: SupabaseClient,
  table: 'user_picks' | 'user_missed_bands',
  userIds: string[],
  fromBandId: string,
  toBandId: string,
): Promise<string[]> {
  if (userIds.length === 0 || fromBandId === toBandId) return [];

  const { data: toRows, error: toError } = await supabase
    .from(table)
    .select('user_id')
    .eq('band_id', toBandId);
  if (toError) throw new Error(`${table} read failed: ${toError.message}`);

  const toUsers = new Set((toRows ?? []).map((row) => row.user_id as string));
  const collisions = userIds.filter((userId) => toUsers.has(userId));

  if (collisions.length > 0) {
    const { error: delError } = await supabase
      .from(table)
      .delete()
      .eq('band_id', fromBandId)
      .in('user_id', collisions);
    if (delError) throw new Error(`${table} dedup delete failed: ${delError.message}`);
  }

  const { error: updateError } = await supabase
    .from(table)
    .update({ band_id: toBandId })
    .eq('band_id', fromBandId)
    .in('user_id', userIds);
  if (updateError) throw new Error(`${table} re-point failed: ${updateError.message}`);

  return collisions;
}

async function applyMovePhase(
  supabase: SupabaseClient,
  move: PlanMove,
  log: string[],
): Promise<void> {
  const pickCollisions = await repointSnapshottedUsers(
    supabase,
    'user_picks',
    move.pickUserIds,
    move.fromBandId,
    move.toBandId,
  );
  const missedCollisions = await repointSnapshottedUsers(
    supabase,
    'user_missed_bands',
    move.missedUserIds,
    move.fromBandId,
    move.toBandId,
  );

  if (pickCollisions.length > 0) {
    log.push(`  Deduped ${pickCollisions.length} user_picks collision(s)`);
  }
  if (missedCollisions.length > 0) {
    log.push(`  Deduped ${missedCollisions.length} user_missed_bands collision(s)`);
  }

  const { error: testError } = await supabase
    .from('live_band_test_config')
    .update({ band_id: move.toBandId })
    .eq('band_id', move.fromBandId);
  if (testError) {
    throw new Error(`live_band_test_config re-point failed: ${testError.message}`);
  }

  const { error: updateError } = await supabase
    .from('bands')
    .update(move.destinationAfter)
    .eq('id', move.toBandId);
  if (updateError) {
    throw new Error(`Destination update failed for ${move.toSlotId}: ${updateError.message}`);
  }

  log.push(`✓ MOVE ${move.fromSlotId} → ${move.toSlotId} "${move.bandName}"`);
}

async function deleteMoveSources(
  supabase: SupabaseClient,
  moves: PlanMove[],
  log: string[],
): Promise<void> {
  for (const move of moves) {
    const { error } = await supabase.from('bands').delete().eq('id', move.fromBandId);
    if (error) {
      throw new Error(`Source delete failed for ${move.fromSlotId}: ${error.message}`);
    }
    log.push(`  Deleted source row ${move.fromSlotId}`);
  }
}

export async function applyLineupPlan(
  supabase: SupabaseClient,
  plan: LineupPlan,
  options: ApplyOptions,
): Promise<ApplyResult> {
  const log: string[] = [];
  const skipped: ApplySkipped = {
    blockedMoves: plan.moves.filter((move) => move.blocked).length,
    blockedDeletes: 0,
  };

  const applicableMoves = plan.moves.filter((move) => !move.blocked);
  const applicableDeletes = plan.deletes.filter(
    (del) => !del.blocked || options.confirmDeletes,
  );
  skipped.blockedDeletes = plan.deletes.filter(
    (del) => del.blocked && !options.confirmDeletes,
  ).length;

  let writes = 0;

  if (applicableMoves.length > 0) {
    log.push('── MOVES ──');
    for (const move of applicableMoves) {
      await applyMovePhase(supabase, move, log);
      writes++;
    }
    await deleteMoveSources(supabase, applicableMoves, log);
  }

  if (plan.updates.length > 0) {
    log.push('── UPDATES ──');
    for (const update of plan.updates) {
      const { error } = await supabase
        .from('bands')
        .update(update.after)
        .eq('id', update.bandId);
      if (error) {
        throw new Error(`UPDATE failed for ${update.slotId}: ${error.message}`);
      }
      log.push(`✓ UPDATE ${update.slotId} (${update.fields.join(', ')})`);
      writes++;
    }
  }

  if (plan.inserts.length > 0) {
    log.push('── INSERTS ──');
    for (const insert of plan.inserts) {
      const { error } = await supabase.from('bands').insert(insert.row);
      if (error) {
        throw new Error(`INSERT failed for ${insert.slotId}: ${error.message}`);
      }
      log.push(`✓ INSERT ${insert.slotId} "${insert.row.name}"`);
      writes++;
    }
  }

  if (applicableDeletes.length > 0) {
    log.push('── DELETES ──');
    for (const del of applicableDeletes) {
      const { error } = await supabase.from('bands').delete().eq('id', del.bandId);
      if (error) {
        throw new Error(`DELETE failed for ${del.slotId}: ${error.message}`);
      }
      log.push(`✓ DELETE ${del.slotId} "${del.name}"`);
      writes++;
    }
  }

  let cacheVersion = '';
  if (writes > 0) {
    const bump = await bumpCacheVersionForClient(supabase);
    cacheVersion = bump.value;
    if (bump.ok) {
      log.push(`✓ cache_version = ${cacheVersion}`);
    }
  }

  return {
    applied: {
      updates: plan.updates.length,
      moves: applicableMoves.length,
      inserts: plan.inserts.length,
      deletes: applicableDeletes.length,
      blockedMoves: 0,
      blockedDeletes: 0,
    },
    skipped,
    cacheVersion,
    log,
  };
}

export function emptyApplySummary(): LineupPlanSummary {
  return {
    updates: 0,
    moves: 0,
    inserts: 0,
    deletes: 0,
    blockedMoves: 0,
    blockedDeletes: 0,
  };
}

export function appliedFromPlan(plan: LineupPlan, options: ApplyOptions): LineupPlanSummary {
  const full = summarizePlan(plan);
  return {
    updates: full.updates,
    moves: full.moves,
    inserts: full.inserts,
    deletes: options.confirmDeletes
      ? full.deletes + full.blockedDeletes
      : full.deletes,
    blockedMoves: 0,
    blockedDeletes: 0,
  };
}
