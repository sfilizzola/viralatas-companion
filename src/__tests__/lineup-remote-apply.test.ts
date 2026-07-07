import { describe, expect, it } from 'vitest';
import { applyLineupPlan } from '../lib/lineup-remote-apply';
import type { LineupPlan } from '../lib/lineup-remote-plan';

type Row = Record<string, unknown>;

function createMockSupabase() {
  const calls: string[] = [];
  const tables: Record<string, Row[]> = {
    user_picks: [],
    user_missed_bands: [],
    live_band_test_config: [],
    bands: [
      {
        id: 'from-id',
        slot_id: 'FAS5',
        name: 'Skyline',
        stage: 'Faster',
        start_time: '2026-07-29T14:00:00.000Z',
        end_time: '2026-07-29T15:00:00.000Z',
        genre: 'Metal',
        image_url: 'https://x/1.jpg',
        category: 'band',
      },
      {
        id: 'to-id',
        slot_id: 'LOU3',
        name: 'Thundermother',
        stage: 'Louder',
        start_time: '2026-07-29T16:00:00.000Z',
        end_time: '2026-07-29T17:00:00.000Z',
        genre: 'Metal',
        image_url: 'https://x/2.jpg',
        category: 'band',
      },
    ],
    app_config: [{ key: 'cache_version', value: 'old' }],
  };

  function from(table: string) {
    const state: {
      filters: Array<(row: Row) => boolean>;
      updatePayload?: Row;
      deleteMode?: boolean;
      insertPayload?: Row | Row[];
      selectHead?: boolean;
    } = { filters: [] };

    const builder = {
      select(_cols?: string, opts?: { count?: string; head?: boolean }) {
        if (opts?.head) {
          state.selectHead = true;
        }
        calls.push(`select:${table}`);
        return builder;
      },
      update(payload: Row) {
        state.updatePayload = payload;
        calls.push(`update:${table}`);
        return builder;
      },
      delete() {
        state.deleteMode = true;
        calls.push(`delete:${table}`);
        return builder;
      },
      insert(payload: Row | Row[]) {
        state.insertPayload = payload;
        calls.push(`insert:${table}`);
        return builder;
      },
      eq(col: string, val: unknown) {
        state.filters.push((row) => row[col] === val);
        return builder;
      },
      in(col: string, vals: unknown[]) {
        const set = new Set(vals);
        state.filters.push((row) => set.has(row[col]));
        return builder;
      },
      async then(resolve: (value: { data: Row[] | null; error: null; count?: number }) => void) {
        let rows = [...(tables[table] ?? [])];
        for (const filter of state.filters) {
          rows = rows.filter(filter);
        }

        if (state.deleteMode) {
          tables[table] = (tables[table] ?? []).filter((row) => !rows.includes(row));
          resolve({ data: null, error: null });
          return;
        }

        if (state.updatePayload) {
          for (const row of rows) {
            Object.assign(row, state.updatePayload);
          }
          resolve({ data: rows, error: null });
          return;
        }

        if (state.insertPayload) {
          const payload = Array.isArray(state.insertPayload)
            ? state.insertPayload
            : [state.insertPayload];
          tables[table].push(...payload);
          resolve({ data: payload, error: null });
          return;
        }

        if (state.selectHead) {
          resolve({ data: null, error: null, count: rows.length });
          return;
        }

        resolve({ data: rows, error: null });
      },
    };

    return builder;
  }

  return {
    supabase: { from },
    calls,
    tables,
  };
}

describe('applyLineupPlan', () => {
  it('applies move then deletes source after repointing snapshotted users', async () => {
    const { supabase, tables } = createMockSupabase();
    tables.user_picks = [
      { user_id: 'u1', band_id: 'from-id' },
      { user_id: 'u2', band_id: 'to-id' },
    ];

    const plan: LineupPlan = {
      updates: [],
      inserts: [],
      deletes: [],
      skipped: [],
      moves: [
        {
          fromSlotId: 'FAS5',
          toSlotId: 'LOU3',
          fromBandId: 'from-id',
          toBandId: 'to-id',
          bandName: 'Skyline',
          pickUserIds: ['u1'],
          missedUserIds: [],
          fromPickCount: 1,
          toPickCount: 1,
          toMissedCount: 0,
          blocked: false,
          destinationAfter: { name: 'Skyline', stage: 'Louder' },
        },
      ],
    };

    const result = await applyLineupPlan(supabase as never, plan, { confirmDeletes: false });
    expect(result.applied.moves).toBe(1);
    expect(tables.bands.some((row) => row.id === 'from-id')).toBe(false);
    expect(tables.user_picks.find((row) => row.user_id === 'u1')?.band_id).toBe('to-id');
    expect(result.cacheVersion).toBeTruthy();
  });

  it('skips blocked move and blocked delete in partial apply', async () => {
    const { supabase, tables } = createMockSupabase();

    const plan: LineupPlan = {
      updates: [
        {
          slotId: 'LOU3',
          bandId: 'to-id',
          before: { name: 'Thundermother' },
          after: { name: 'Thundermother Updated' },
          fields: ['name'],
        },
      ],
      moves: [
        {
          fromSlotId: 'FAS5',
          toSlotId: 'LOU3',
          fromBandId: 'from-id',
          toBandId: 'to-id',
          bandName: 'Skyline',
          pickUserIds: [],
          missedUserIds: [],
          fromPickCount: 0,
          toPickCount: 2,
          toMissedCount: 0,
          blocked: true,
          blockedReason: 'blocked',
          destinationAfter: { name: 'Skyline' },
        },
      ],
      inserts: [],
      deletes: [
        {
          slotId: 'WET9',
          bandId: 'gone-id',
          name: 'Gone',
          pickCount: 3,
          missedCount: 0,
          blocked: true,
        },
      ],
      skipped: [],
    };

    const result = await applyLineupPlan(supabase as never, plan, { confirmDeletes: false });
    expect(result.applied.updates).toBe(1);
    expect(result.applied.moves).toBe(0);
    expect(result.applied.deletes).toBe(0);
    expect(result.skipped.blockedMoves).toBe(1);
    expect(result.skipped.blockedDeletes).toBe(1);
    expect(tables.bands.find((row) => row.id === 'to-id')?.name).toBe('Thundermother Updated');
  });
});
