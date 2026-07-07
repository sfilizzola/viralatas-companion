import { describe, expect, it } from 'vitest';
import type { OfficialSlot } from '../lib/lineup-official-source';
import {
  buildLineupPlan,
  formatLineupPlanReport,
  hashLineupPlan,
  isConfirmedForMove,
  isPlanEmpty,
  officialImageForDb,
  officialUnixToIso,
  slotIdToStageName,
  summarizePlan,
  type DbBandRow,
  type LineupPlanContext,
} from '../lib/lineup-remote-plan';

function emptyCtx(overrides: Partial<LineupPlanContext> = {}): LineupPlanContext {
  return {
    pickCounts: new Map(),
    missedCounts: new Map(),
    pickUserIdsByBand: new Map(),
    missedUserIdsByBand: new Map(),
    ...overrides,
  };
}

function dbRow(partial: Partial<DbBandRow> & Pick<DbBandRow, 'id' | 'slot_id' | 'name'>): DbBandRow {
  return {
    stage: slotIdToStageName(partial.slot_id),
    start_time: '2026-07-29T14:00:00.000Z',
    end_time: '2026-07-29T15:00:00.000Z',
    genre: 'Metal',
    image_url: 'https://x/1.jpg',
    category: 'band',
    ...partial,
  };
}

function official(
  slotId: string,
  name: string,
  start = 1785340800,
  end = 1785344400,
): OfficialSlot {
  return {
    slotId,
    name,
    status: name === 'TBD' ? 'TBD' : name === 'TDB MTB' ? 'TDB MTB' : 'CONFIRMED',
    imageUrl: 'https://x/1.jpg',
    mbRegion: '',
    start,
    end,
  };
}

describe('lineup-remote-plan helpers', () => {
  it('maps FAS prefix to Faster stage', () => {
    expect(slotIdToStageName('FAS12')).toBe('Faster');
    expect(slotIdToStageName('LOU3')).toBe('Louder');
  });

  it('converts unix seconds to ISO timestamptz', () => {
    expect(officialUnixToIso(1785340800)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('maps CONFIRMED image URL to DB value', () => {
    const url = 'https://www.wacken.com/fileadmin/x.jpg';
    expect(officialImageForDb('CONFIRMED', url)).toBe(url);
    expect(officialImageForDb('TBD', '')).toBe('PLACEHOLDER');
  });

  it('allows MOVE only for CONFIRMED db names', () => {
    expect(isConfirmedForMove('Arch Enemy')).toBe(true);
    expect(isConfirmedForMove('TBD')).toBe(false);
    expect(isConfirmedForMove('TDB MTB')).toBe(false);
  });
});

describe('buildLineupPlan', () => {
  it('emits UPDATE when official times differ on same slot', () => {
    const dbBands = [
      dbRow({
        id: 'uuid-1',
        slot_id: 'FAS1',
        name: 'Lovebites',
        start_time: '2026-07-29T14:00:00.000Z',
        end_time: '2026-07-29T15:00:00.000Z',
      }),
    ];
    const officialMap = new Map([
      ['FAS1', official('FAS1', 'Lovebites', 1785340800, 1785348000)],
    ]);

    const plan = buildLineupPlan(dbBands, officialMap, emptyCtx());
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0].slotId).toBe('FAS1');
    expect(plan.moves).toHaveLength(0);
  });

  it('returns empty plan when in sync', async () => {
    const dbBands = [
      dbRow({
        id: 'uuid-1',
        slot_id: 'FAS1',
        name: 'Lovebites',
        start_time: officialUnixToIso(1785340800),
        end_time: officialUnixToIso(1785344400),
      }),
    ];
    const officialMap = new Map([
      ['FAS1', official('FAS1', 'Lovebites')],
    ]);
    const plan = buildLineupPlan(dbBands, officialMap, emptyCtx());
    expect(isPlanEmpty(plan)).toBe(true);
    expect(await hashLineupPlan(plan)).toBe(await hashLineupPlan(plan));
  });

  it('detects CONFIRMED band relocation as MOVE', () => {
    const dbBands = [
      dbRow({ id: 'from-id', slot_id: 'FAS5', name: 'Skyline' }),
      dbRow({ id: 'to-id', slot_id: 'LOU3', name: 'Thundermother' }),
    ];
    const officialMap = new Map([
      ['FAS5', official('FAS5', 'Other Band')],
      ['LOU3', official('LOU3', 'Skyline')],
    ]);
    const ctx = emptyCtx({
      pickCounts: new Map([
        ['from-id', 3],
        ['to-id', 1],
      ]),
      pickUserIdsByBand: new Map([
        ['from-id', ['u1', 'u2', 'u3']],
        ['to-id', ['u4']],
      ]),
    });

    const plan = buildLineupPlan(dbBands, officialMap, ctx);
    expect(plan.moves).toHaveLength(1);
    expect(plan.moves[0]).toMatchObject({
      fromSlotId: 'FAS5',
      toSlotId: 'LOU3',
      bandName: 'Skyline',
      pickUserIds: ['u1', 'u2', 'u3'],
      blocked: true,
    });
  });

  it('does not emit MOVE for TBD names', () => {
    const dbBands = [dbRow({ id: 'a', slot_id: 'FAS1', name: 'TBD' })];
    const officialMap = new Map([
      ['FAS1', official('FAS1', 'TBD')],
      ['FAS2', official('FAS2', 'TBD')],
    ]);
    const plan = buildLineupPlan(dbBands, officialMap, emptyCtx());
    expect(plan.moves).toHaveLength(0);
  });

  it('emits two moves for slot swap when both bands are accounted', () => {
    const dbBands = [
      dbRow({ id: 'sky-id', slot_id: 'FAS5', name: 'Skyline' }),
      dbRow({ id: 'th-id', slot_id: 'LOU3', name: 'Thundermother' }),
    ];
    const officialMap = new Map([
      ['FAS5', official('FAS5', 'Thundermother')],
      ['LOU3', official('LOU3', 'Skyline')],
    ]);
    const ctx = emptyCtx({
      pickCounts: new Map([
        ['sky-id', 2],
        ['th-id', 1],
      ]),
      pickUserIdsByBand: new Map([
        ['sky-id', ['u1', 'u2']],
        ['th-id', ['u3']],
      ]),
    });

    const plan = buildLineupPlan(dbBands, officialMap, ctx);
    expect(plan.moves).toHaveLength(2);
    expect(plan.moves.every((move) => !move.blocked)).toBe(true);
    expect(plan.moves.map((move) => move.fromSlotId)).toEqual(['FAS5', 'LOU3']);
  });

  it('INSERTs new official slots', () => {
    const dbBands = [dbRow({ id: 'a', slot_id: 'FAS1', name: 'Lovebites' })];
    const officialMap = new Map([
      ['FAS1', official('FAS1', 'Lovebites')],
      ['WET9', official('WET9', 'New Band')],
    ]);
    const plan = buildLineupPlan(dbBands, officialMap, emptyCtx());
    expect(plan.inserts).toHaveLength(1);
    expect(plan.inserts[0].slotId).toBe('WET9');
  });

  it('skips INSERT for Name=TBD slots (bands.ts policy)', () => {
    const dbBands = [dbRow({ id: 'a', slot_id: 'FAS1', name: 'Lovebites' })];
    const officialMap = new Map([
      ['FAS1', official('FAS1', 'Lovebites')],
      ['LOU21', official('LOU21', 'TBD')],
    ]);
    const plan = buildLineupPlan(dbBands, officialMap, emptyCtx());
    expect(plan.inserts).toHaveLength(0);
    expect(plan.skipped).toContainEqual({
      slotId: 'LOU21',
      reason: 'TBD slot not seeded (bands.ts policy)',
    });
  });

  it('does not UPDATE when only official name casing differs', () => {
    const dbBands = [
      dbRow({
        id: 'a',
        slot_id: 'WET24',
        name: 'Employed to Serve',
        start_time: officialUnixToIso(1785340800),
        end_time: officialUnixToIso(1785344400),
      }),
    ];
    const officialMap = new Map([
      ['WET24', official('WET24', 'Employed To Serve')],
    ]);
    const plan = buildLineupPlan(dbBands, officialMap, emptyCtx());
    expect(plan.updates).toHaveLength(0);
    expect(isPlanEmpty(plan)).toBe(true);
  });

  it('DELETEs db rows missing from official feed', () => {
    const dbBands = [
      dbRow({ id: 'a', slot_id: 'FAS1', name: 'Lovebites' }),
      dbRow({ id: 'b', slot_id: 'WET50', name: 'Gone Band' }),
    ];
    const officialMap = new Map([['FAS1', official('FAS1', 'Lovebites')]]);
    const plan = buildLineupPlan(dbBands, officialMap, emptyCtx());
    expect(plan.deletes).toHaveLength(1);
    expect(plan.deletes[0].slotId).toBe('WET50');
    expect(plan.deletes[0].blocked).toBe(false);
  });

  it('blocks DELETE when picks exist', () => {
    const dbBands = [dbRow({ id: 'b', slot_id: 'WET50', name: 'Gone Band' })];
    const officialMap = new Map<string, OfficialSlot>();
    const plan = buildLineupPlan(
      dbBands,
      officialMap,
      emptyCtx({
        pickCounts: new Map([['b', 5]]),
      }),
    );
    expect(plan.deletes[0].blocked).toBe(true);
  });

  it('skips HAR13 and JUN slots', () => {
    const dbBands = [
      dbRow({ id: 'har', slot_id: 'HAR13', name: 'Ceremony' }),
      dbRow({ id: 'jun', slot_id: 'JUN1', name: 'Jungle Band' }),
    ];
    const officialMap = new Map([
      ['HAR13', { ...official('HAR13', 'Different'), status: 'CEREMONY' as const }],
      ['JUN1', official('JUN1', 'Other')],
    ]);
    const plan = buildLineupPlan(dbBands, officialMap, emptyCtx());
    expect(plan.updates).toHaveLength(0);
    expect(plan.deletes).toHaveLength(0);
    expect(plan.moves).toHaveLength(0);
  });
});

describe('formatLineupPlanReport + summarizePlan', () => {
  it('includes move section and applicable-only summary chips', () => {
    const plan = buildLineupPlan(
      [
        dbRow({ id: 'from-id', slot_id: 'FAS5', name: 'Skyline' }),
        dbRow({ id: 'to-id', slot_id: 'LOU3', name: 'Thundermother' }),
      ],
      new Map([
        ['FAS5', official('FAS5', 'Other Band')],
        ['LOU3', official('LOU3', 'Skyline')],
      ]),
      emptyCtx({
        pickCounts: new Map([['to-id', 2]]),
        missedCounts: new Map([['to-id', 1]]),
      }),
    );
    const report = formatLineupPlanReport(plan);
    expect(report).toContain('MOVE BLOCKED');
    expect(report).toContain('FAS5');
    const summary = summarizePlan(plan);
    expect(summary.moves).toBe(0);
    expect(summary.blockedMoves).toBe(1);
  });

  it('hashLineupPlan is stable for same plan', async () => {
    const dbBands = [dbRow({ id: 'uuid-1', slot_id: 'FAS1', name: 'Lovebites' })];
    const officialMap = new Map([
      ['FAS1', official('FAS1', 'Lovebites', 1785340800, 1785348000)],
    ]);
    const plan = buildLineupPlan(dbBands, officialMap, emptyCtx());
    expect(await hashLineupPlan(plan)).toBe(await hashLineupPlan(plan));
  });
});
