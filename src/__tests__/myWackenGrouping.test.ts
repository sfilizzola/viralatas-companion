import { describe, it, expect } from 'vitest';
import type { Band } from '../types';
import {
  computeInitialCollapsedDays,
  countUpcomingLeftToday,
  groupMyWackenByDay,
} from '../services/myWackenGrouping';

function makeBand(overrides: Partial<Band> = {}): Band {
  return {
    id: 'b1',
    slot_id: 'FAS1',
    name: 'Test Band',
    stage: 'Faster',
    start_time: '2026-07-29T12:00:00Z',
    end_time: '2026-07-29T13:00:00Z',
    image_url: null,
    genre: null,
    category: 'band',
    ...overrides,
  };
}

const picked = new Set(['upcoming', 'ended', 'up-only', 'end-only']);

describe('groupMyWackenByDay', () => {
  const now = new Date('2026-07-29T14:00:00Z');

  it('returns empty array when no picks', () => {
    expect(groupMyWackenByDay([makeBand()], new Set(), now)).toEqual([]);
  });

  it('mixed day: upcoming before ended with divider', () => {
    const bands = [
      makeBand({
        id: 'ended',
        start_time: '2026-07-29T10:00:00Z',
        end_time: '2026-07-29T11:00:00Z',
      }),
      makeBand({
        id: 'upcoming',
        start_time: '2026-07-29T16:00:00Z',
        end_time: '2026-07-29T17:00:00Z',
      }),
    ];
    const groups = groupMyWackenByDay(bands, picked, now);
    expect(groups).toHaveLength(1);
    expect(groups[0].dayKey).toBe('2026-07-29');
    expect(groups[0].upcoming.map((b) => b.id)).toEqual(['upcoming']);
    expect(groups[0].ended.map((b) => b.id)).toEqual(['ended']);
    expect(groups[0].showDivider).toBe(true);
  });

  it('ended-only day: no divider', () => {
    const bands = [
      makeBand({
        id: 'end-only',
        start_time: '2026-07-28T10:00:00Z',
        end_time: '2026-07-28T11:00:00Z',
      }),
    ];
    const groups = groupMyWackenByDay(bands, picked, now);
    expect(groups[0].upcoming).toHaveLength(0);
    expect(groups[0].ended).toHaveLength(1);
    expect(groups[0].showDivider).toBe(false);
  });

  it('upcoming-only day: no divider', () => {
    const bands = [
      makeBand({
        id: 'up-only',
        start_time: '2026-07-30T12:00:00Z',
        end_time: '2026-07-30T13:00:00Z',
      }),
    ];
    const groups = groupMyWackenByDay(bands, picked, now);
    expect(groups[0].upcoming).toHaveLength(1);
    expect(groups[0].ended).toHaveLength(0);
    expect(groups[0].showDivider).toBe(false);
  });

  it('sorts days by day key and bands by start_time within lists', () => {
    const bands = [
      makeBand({
        id: 'd2-late',
        start_time: '2026-07-30T18:00:00Z',
        end_time: '2026-07-30T19:00:00Z',
      }),
      makeBand({
        id: 'd1',
        start_time: '2026-07-29T18:00:00Z',
        end_time: '2026-07-29T19:00:00Z',
      }),
      makeBand({
        id: 'd2-early',
        start_time: '2026-07-30T12:00:00Z',
        end_time: '2026-07-30T13:00:00Z',
      }),
    ];
    const groups = groupMyWackenByDay(bands, new Set(['d1', 'd2-late', 'd2-early']), now);
    expect(groups.map((g) => g.dayKey)).toEqual(['2026-07-29', '2026-07-30']);
    expect(groups[1].upcoming.map((b) => b.id)).toEqual(['d2-early', 'd2-late']);
  });
});

describe('computeInitialCollapsedDays', () => {
  it('collapses past ended-only days mid-festival but keeps today expanded', () => {
    const groups = groupMyWackenByDay(
      [
        makeBand({
          id: 'past',
          start_time: '2026-07-28T10:00:00Z',
          end_time: '2026-07-28T11:00:00Z',
        }),
        makeBand({
          id: 'today-ended',
          start_time: '2026-07-29T10:00:00Z',
          end_time: '2026-07-29T11:00:00Z',
        }),
      ],
      new Set(['past', 'today-ended']),
      new Date('2026-07-29T14:00:00Z'),
    );
    const collapsed = computeInitialCollapsedDays(groups, {
      festivalActive: true,
      todayKey: '2026-07-29',
    });
    expect(collapsed.has('2026-07-28')).toBe(true);
    expect(collapsed.has('2026-07-29')).toBe(false);
  });

  it('expands all days post-festival', () => {
    const groups = groupMyWackenByDay(
      [makeBand({ id: 'past', end_time: '2026-07-28T11:00:00Z', start_time: '2026-07-28T10:00:00Z' })],
      new Set(['past']),
      new Date('2026-08-05T12:00:00Z'),
    );
    expect(
      computeInitialCollapsedDays(groups, { festivalActive: false, todayKey: '2026-08-05' }).size,
    ).toBe(0);
  });
});

describe('countUpcomingLeftToday', () => {
  it('counts upcoming picks on today key only', () => {
    const groups = groupMyWackenByDay(
      [
        makeBand({ id: 'a', start_time: '2026-07-29T16:00:00Z', end_time: '2026-07-29T17:00:00Z' }),
        makeBand({ id: 'b', start_time: '2026-07-29T18:00:00Z', end_time: '2026-07-29T19:00:00Z' }),
        makeBand({ id: 'c', start_time: '2026-07-30T14:00:00Z', end_time: '2026-07-30T15:00:00Z' }),
      ],
      new Set(['a', 'b', 'c']),
      new Date('2026-07-29T14:00:00Z'),
    );
    expect(countUpcomingLeftToday(groups, '2026-07-29')).toBe(2);
    expect(countUpcomingLeftToday(groups, '2026-07-30')).toBe(1);
  });
});
