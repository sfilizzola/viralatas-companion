/**
 * Remote lineup sync — plan builder for official wacken.com JSON vs production bands.
 * See docs/superpowers/specs/2026-07-07-godlike-remote-lineup-sync-design.md
 */

import type { OfficialSlot } from './lineup-official-source.ts';
import {
  OVERRIDE_SLOT_IDS,
  imagesEquivalent,
  isDroppedTbdOfficialSlot,
  namesEquivalent,
} from './lineup-official-source.ts';

const PLACEHOLDER_IMAGE =
  'https://www.wacken.com/_assets/3fb8fb6daec87d7565c05103aa89d6b0/2026/Images/news_list_dummy%401x.png';

const SLOT_PREFIX_TO_STAGE: Record<string, string> = {
  FAS: 'Faster',
  HAR: 'Harder',
  LOU: 'Louder',
  WET: 'W.E.T.',
  HBA: 'Headbangers',
  WAS: 'Wasteland',
  WAK: 'Wackinger',
  JUN: 'Welcome to the Jungle',
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

export type DbBandRow = {
  id: string;
  slot_id: string;
  name: string;
  stage: string;
  start_time: string;
  end_time: string;
  genre: string | null;
  image_url: string | null;
  category: string | null;
};

export type PlanUpdate = {
  slotId: string;
  bandId: string;
  before: Partial<DbBandRow>;
  after: Partial<DbBandRow>;
  fields: string[];
};

export type PlanMove = {
  fromSlotId: string;
  toSlotId: string;
  fromBandId: string;
  toBandId: string;
  bandName: string;
  pickUserIds: string[];
  missedUserIds: string[];
  fromPickCount: number;
  toPickCount: number;
  toMissedCount: number;
  blocked: boolean;
  blockedReason?: string;
  destinationAfter: Partial<DbBandRow>;
};

export type PlanInsert = {
  slotId: string;
  row: Omit<DbBandRow, 'id'>;
};

export type PlanDelete = {
  slotId: string;
  bandId: string;
  name: string;
  pickCount: number;
  missedCount: number;
  blocked: boolean;
};

export type LineupPlan = {
  updates: PlanUpdate[];
  moves: PlanMove[];
  inserts: PlanInsert[];
  deletes: PlanDelete[];
  skipped: { slotId: string; reason: string }[];
};

export type LineupPlanSummary = {
  updates: number;
  moves: number;
  inserts: number;
  deletes: number;
  blockedMoves: number;
  blockedDeletes: number;
};

export type LineupPlanContext = {
  pickCounts: Map<string, number>;
  missedCounts: Map<string, number>;
  pickUserIdsByBand: Map<string, string[]>;
  missedUserIdsByBand: Map<string, string[]>;
};

export function slotIdToStageName(slotId: string): string {
  const prefix = slotId.replace(/\d+$/, '');
  const stage = SLOT_PREFIX_TO_STAGE[prefix];
  if (!stage) {
    throw new Error(`Unknown slot prefix: ${slotId}`);
  }
  return stage;
}

export function officialUnixToIso(sec: number): string {
  return new Date(sec * 1000).toISOString();
}

export function officialImageForDb(status: string, imageUrl: string): string {
  if (status === 'CONFIRMED' && imageUrl) {
    return imageUrl.startsWith('http') ? imageUrl : `https://www.wacken.com${imageUrl}`;
  }
  return 'PLACEHOLDER';
}

export function isConfirmedForMove(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (trimmed === 'TBD' || trimmed === 'TDB MTB' || trimmed === 'CEREMONY') return false;
  return true;
}

export function shouldPatchImage(dbRow: DbBandRow, official: OfficialSlot): boolean {
  if (official.status !== 'CONFIRMED' || !official.imageUrl) return false;
  const target = officialImageForDb('CONFIRMED', official.imageUrl);
  const dbImg = dbRow.image_url ?? '';
  if (imagesEquivalent(dbImg, target)) return false;
  const identityChanging = !namesEquivalent(dbRow.name, official.name);
  return (
    dbImg === 'PLACEHOLDER' ||
    dbImg.includes('news_list_dummy') ||
    identityChanging
  );
}

function normalizeCategory(value: string | null | undefined): string {
  return value ?? 'band';
}

function fieldValuesEqual(
  field: SyncField,
  a: unknown,
  b: unknown,
): boolean {
  if (field === 'start_time' || field === 'end_time') {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return new Date(String(a)).getTime() === new Date(String(b)).getTime();
  }
  if (field === 'image_url') {
    return imagesEquivalent(String(a ?? ''), String(b ?? ''));
  }
  if (field === 'name') {
    return namesEquivalent(String(a ?? ''), String(b ?? ''));
  }
  if (field === 'category') {
    return normalizeCategory(String(a ?? '')) === normalizeCategory(String(b ?? ''));
  }
  return a === b;
}

export function officialRowToDbFields(
  official: OfficialSlot,
  existingDb?: DbBandRow,
): Omit<DbBandRow, 'id'> {
  const baseImage = officialImageForDb(official.status, official.imageUrl);
  let image_url = baseImage;
  if (existingDb && baseImage !== 'PLACEHOLDER') {
    image_url = shouldPatchImage(existingDb, official)
      ? baseImage
      : (existingDb.image_url ?? baseImage);
  } else if (baseImage === 'PLACEHOLDER' && existingDb?.image_url) {
    image_url = existingDb.image_url;
  }

  return {
    slot_id: official.slotId,
    name: official.name,
    stage: slotIdToStageName(official.slotId),
    start_time: officialUnixToIso(official.start),
    end_time: officialUnixToIso(official.end),
    genre: existingDb?.genre ?? null,
    image_url: image_url === 'PLACEHOLDER' ? PLACEHOLDER_IMAGE : image_url,
    category: normalizeCategory(existingDb?.category),
  };
}

function diffDbFields(
  db: DbBandRow,
  target: Omit<DbBandRow, 'id'>,
): { before: Partial<DbBandRow>; after: Partial<DbBandRow>; fields: string[] } | null {
  const before: Partial<DbBandRow> = {};
  const after: Partial<DbBandRow> = {};
  const fields: string[] = [];

  for (const field of SYNC_FIELDS) {
    const dbVal = field === 'category' ? normalizeCategory(db.category) : db[field];
    const targetVal =
      field === 'category' ? normalizeCategory(target.category) : target[field];
    if (!fieldValuesEqual(field, dbVal, targetVal)) {
      before[field] = db[field] as never;
      after[field] = target[field] as never;
      fields.push(field);
    }
  }

  return fields.length > 0 ? { before, after, fields } : null;
}

function isPolicySkippedSlot(slotId: string): boolean {
  return OVERRIDE_SLOT_IDS.has(slotId);
}

function pickCount(ctx: LineupPlanContext, bandId: string): number {
  return ctx.pickCounts.get(bandId) ?? 0;
}

function missedCount(ctx: LineupPlanContext, bandId: string): number {
  return ctx.missedCounts.get(bandId) ?? 0;
}

function pickUserIds(ctx: LineupPlanContext, bandId: string): string[] {
  return [...(ctx.pickUserIdsByBand.get(bandId) ?? [])];
}

function missedUserIds(ctx: LineupPlanContext, bandId: string): string[] {
  return [...(ctx.missedUserIdsByBand.get(bandId) ?? [])];
}

function isDisplacedBandAccounted(
  displacedBandId: string,
  moves: Array<{ fromBandId: string }>,
  selfFromBandId: string,
): boolean {
  return moves.some(
    (move) => move.fromBandId === displacedBandId && move.fromBandId !== selfFromBandId,
  );
}

export function buildLineupPlan(
  dbBands: DbBandRow[],
  officialSlots: Map<string, OfficialSlot>,
  ctx: LineupPlanContext,
): LineupPlan {
  const plan: LineupPlan = {
    updates: [],
    moves: [],
    inserts: [],
    deletes: [],
    skipped: [],
  };

  const dbBySlot = new Map(dbBands.map((row) => [row.slot_id, row]));
  const moveSources = new Set<string>();
  const moveTargets = new Set<string>();
  const draftMoves: PlanMove[] = [];

  for (const db of dbBands) {
    if (isPolicySkippedSlot(db.slot_id)) continue;
    if (!isConfirmedForMove(db.name)) continue;

    let targetOfficialSlot: string | null = null;
    for (const [slotId, official] of officialSlots) {
      if (slotId === db.slot_id) continue;
      if (isPolicySkippedSlot(slotId)) continue;
      if (namesEquivalent(db.name, official.name)) {
        targetOfficialSlot = slotId;
        break;
      }
    }
    if (!targetOfficialSlot) continue;

    const officialAtSource = officialSlots.get(db.slot_id);
    if (!officialAtSource) continue;
    if (namesEquivalent(db.name, officialAtSource.name)) continue;

    const destDb = dbBySlot.get(targetOfficialSlot);
    if (!destDb) continue;

    const destOfficial = officialSlots.get(targetOfficialSlot)!;
    draftMoves.push({
      fromSlotId: db.slot_id,
      toSlotId: targetOfficialSlot,
      fromBandId: db.id,
      toBandId: destDb.id,
      bandName: db.name,
      pickUserIds: pickUserIds(ctx, db.id),
      missedUserIds: missedUserIds(ctx, db.id),
      fromPickCount: pickCount(ctx, db.id),
      toPickCount: pickCount(ctx, destDb.id),
      toMissedCount: missedCount(ctx, destDb.id),
      blocked: false,
      destinationAfter: officialRowToDbFields(destOfficial, destDb),
    });
    moveSources.add(db.slot_id);
    moveTargets.add(targetOfficialSlot);
  }

  draftMoves.sort((a, b) => a.fromSlotId.localeCompare(b.fromSlotId));

  for (const move of draftMoves) {
    const displacedImpact = move.toPickCount + move.toMissedCount;
    if (displacedImpact > 0) {
      const accounted = isDisplacedBandAccounted(move.toBandId, draftMoves, move.fromBandId);
      if (!accounted) {
        move.blocked = true;
        move.blockedReason = `Destination ${move.toSlotId} has ${move.toPickCount} pick(s) and ${move.toMissedCount} missed for a band not covered elsewhere in this plan`;
      }
    }
  }

  plan.moves = draftMoves;

  for (const [slotId, official] of officialSlots) {
    if (isPolicySkippedSlot(slotId)) {
      if (dbBySlot.has(slotId)) {
        plan.skipped.push({ slotId, reason: 'policy override' });
      }
      continue;
    }
    if (moveSources.has(slotId) || moveTargets.has(slotId)) continue;

    const db = dbBySlot.get(slotId);
    if (!db) continue;

    const target = officialRowToDbFields(official, db);
    const diff = diffDbFields(db, target);
    if (diff) {
      plan.updates.push({
        slotId,
        bandId: db.id,
        before: diff.before,
        after: diff.after,
        fields: diff.fields,
      });
    }
  }

  for (const [slotId, official] of officialSlots) {
    if (isPolicySkippedSlot(slotId)) continue;
    if (dbBySlot.has(slotId)) continue;
    if (isDroppedTbdOfficialSlot(official)) {
      plan.skipped.push({ slotId, reason: 'TBD slot not seeded (bands.ts policy)' });
      continue;
    }
    plan.inserts.push({
      slotId,
      row: officialRowToDbFields(official),
    });
  }

  for (const db of dbBands) {
    if (isPolicySkippedSlot(db.slot_id)) continue;
    if (officialSlots.has(db.slot_id)) continue;
    const picks = pickCount(ctx, db.id);
    const missed = missedCount(ctx, db.id);
    plan.deletes.push({
      slotId: db.slot_id,
      bandId: db.id,
      name: db.name,
      pickCount: picks,
      missedCount: missed,
      blocked: picks + missed > 0,
    });
  }

  return plan;
}

export function summarizePlan(plan: LineupPlan): LineupPlanSummary {
  return {
    updates: plan.updates.length,
    moves: plan.moves.filter((move) => !move.blocked).length,
    inserts: plan.inserts.length,
    deletes: plan.deletes.filter((del) => !del.blocked).length,
    blockedMoves: plan.moves.filter((move) => move.blocked).length,
    blockedDeletes: plan.deletes.filter((del) => del.blocked).length,
  };
}

export function formatLineupPlanReport(plan: LineupPlan): string {
  const summary = summarizePlan(plan);
  const lines: string[] = [
    `Plan: ${summary.updates} update(s), ${summary.moves} move(s), ${summary.inserts} insert(s), ${summary.deletes} delete(s)`,
  ];

  if (summary.blockedMoves > 0 || summary.blockedDeletes > 0) {
    lines.push(
      `Blocked: ${summary.blockedMoves} move(s), ${summary.blockedDeletes} delete(s)`,
    );
  }

  if (plan.updates.length > 0) {
    lines.push('', '── UPDATES ──');
    for (const row of plan.updates) {
      lines.push(`UPDATE ${row.slotId} (${row.fields.join(', ')})`);
    }
  }

  if (plan.moves.length > 0) {
    lines.push('', '── MOVES ──');
    for (const row of plan.moves) {
      const prefix = row.blocked ? 'MOVE BLOCKED' : 'MOVE';
      lines.push(
        `${prefix} ${row.fromSlotId} → ${row.toSlotId} "${row.bandName}" (picks ${row.fromPickCount}→${row.toPickCount})`,
      );
      if (row.blocked && row.blockedReason) {
        lines.push(`  ${row.blockedReason}`);
      }
    }
  }

  if (plan.inserts.length > 0) {
    lines.push('', '── INSERTS ──');
    for (const row of plan.inserts) {
      lines.push(`INSERT ${row.slotId} "${row.row.name}"`);
    }
  }

  if (plan.deletes.length > 0) {
    lines.push('', '── DELETES ──');
    for (const row of plan.deletes) {
      const prefix = row.blocked ? 'DELETE BLOCKED' : 'DELETE';
      const impact = row.pickCount + row.missedCount;
      lines.push(
        `${prefix} ${row.slotId} "${row.name}" (${impact} pick/missed impact)`,
      );
    }
  }

  if (
    plan.updates.length === 0 &&
    plan.moves.length === 0 &&
    plan.inserts.length === 0 &&
    plan.deletes.length === 0
  ) {
    lines.push('', '✓ Production matches the official running order.');
  }

  return lines.join('\n');
}

export function canonicalizePlan(plan: LineupPlan): string {
  const sortBySlot = <T extends { slotId?: string; fromSlotId?: string }>(rows: T[]) =>
    [...rows].sort((a, b) => {
      const aKey = a.slotId ?? a.fromSlotId ?? '';
      const bKey = b.slotId ?? b.fromSlotId ?? '';
      return aKey.localeCompare(bKey);
    });

  return JSON.stringify({
    updates: sortBySlot(plan.updates),
    moves: sortBySlot(plan.moves),
    inserts: sortBySlot(plan.inserts),
    deletes: sortBySlot(plan.deletes),
  });
}

export async function hashLineupPlan(plan: LineupPlan): Promise<string> {
  const data = new TextEncoder().encode(canonicalizePlan(plan));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function isPlanEmpty(plan: LineupPlan): boolean {
  return (
    plan.updates.length === 0 &&
    plan.moves.length === 0 &&
    plan.inserts.length === 0 &&
    plan.deletes.length === 0
  );
}

export function isPlanApplicable(plan: LineupPlan): boolean {
  const summary = summarizePlan(plan);
  return (
    summary.updates > 0 ||
    summary.moves > 0 ||
    summary.inserts > 0 ||
    summary.deletes > 0
  );
}
