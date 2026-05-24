import { describe, it, expect } from 'vitest';
import type { Band } from '../types';
import { computeBandConflicts, computeBandOverlaps, type OverlapEntry } from '../hooks/useBandConflicts';

function band(
  id: string,
  stage: string,
  startIso: string,
  endIso: string,
): Band {
  return {
    id,
    slot_id: `TST-${id}`,
    name: id,
    stage,
    start_time: startIso,
    end_time: endIso,
    image_url: null,
    genre: null,
    category: 'band',
  };
}

describe('computeBandOverlaps', () => {
  it('returns an empty map when there are no overlaps', () => {
    const a = band('a', 'Faster', '2026-07-29T18:00:00Z', '2026-07-29T19:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T19:30:00Z', '2026-07-29T20:30:00Z');

    const result = computeBandOverlaps([a, b]);

    expect(result.size).toBe(0);
  });

  it('detects two bands overlapping on different stages', () => {
    const a = band('a', 'Faster', '2026-07-29T18:00:00Z', '2026-07-29T19:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T18:30:00Z', '2026-07-29T19:30:00Z');

    const result = computeBandOverlaps([a, b]);

    expect(result.size).toBe(2);
    expect(result.get('a')).toHaveLength(1);
    expect(result.get('a')?.[0].band.id).toBe('b');
    expect(result.get('b')).toHaveLength(1);
    expect(result.get('b')?.[0].band.id).toBe('a');
  });

  it('does not flag overlap when bands are on the same stage', () => {
    const a = band('a', 'Faster', '2026-07-29T18:00:00Z', '2026-07-29T19:00:00Z');
    const b = band('b', 'Faster', '2026-07-29T18:30:00Z', '2026-07-29T19:30:00Z');

    const result = computeBandOverlaps([a, b]);

    expect(result.size).toBe(0);
  });

  it('does not flag back-to-back bands as conflicting', () => {
    const a = band('a', 'Faster', '2026-07-29T18:00:00Z', '2026-07-29T19:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T19:00:00Z', '2026-07-29T20:00:00Z');

    const result = computeBandOverlaps([a, b]);

    expect(result.size).toBe(0);
  });

  it('records every overlapping partner for a band', () => {
    const a = band('a', 'Faster', '2026-07-29T18:00:00Z', '2026-07-29T20:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T18:30:00Z', '2026-07-29T19:30:00Z');
    const c = band('c', 'Louder', '2026-07-29T19:00:00Z', '2026-07-29T20:30:00Z');

    const result = computeBandOverlaps([a, b, c]);

    expect(result.get('a')).toHaveLength(2);
    expect(result.get('a')?.map((e) => e.band.id).sort()).toEqual(['b', 'c']);
    expect(result.get('b')).toHaveLength(2);
    expect(result.get('b')?.map((e) => e.band.id).sort()).toEqual(['a', 'c']);
    expect(result.get('c')).toHaveLength(2);
    expect(result.get('c')?.map((e) => e.band.id).sort()).toEqual(['a', 'b']);
  });

  it('returns an empty map for an empty input', () => {
    expect(computeBandOverlaps([]).size).toBe(0);
  });

  it('classifies 5-minute overlap as soft', () => {
    const a = band('a', 'Faster', '2026-07-29T20:00:00Z', '2026-07-29T21:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T20:55:00Z', '2026-07-29T21:55:00Z');

    const result = computeBandOverlaps([a, b]);

    expect(result.get('a')?.[0].severity).toBe('soft');
    expect(result.get('b')?.[0].severity).toBe('soft');
  });

  it('classifies exactly 15-minute overlap as soft', () => {
    const a = band('a', 'Faster', '2026-07-29T20:00:00Z', '2026-07-29T21:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T20:45:00Z', '2026-07-29T21:45:00Z');

    const result = computeBandOverlaps([a, b]);

    expect(result.get('a')?.[0].severity).toBe('soft');
    expect(result.get('b')?.[0].severity).toBe('soft');
  });

  it('classifies 15-minute 1-second overlap as hard', () => {
    const a = band('a', 'Faster', '2026-07-29T20:00:00Z', '2026-07-29T21:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T20:44:59Z', '2026-07-29T21:44:59Z');

    const result = computeBandOverlaps([a, b]);

    expect(result.get('a')?.[0].severity).toBe('hard');
    expect(result.get('b')?.[0].severity).toBe('hard');
  });

  it('classifies 30-minute overlap as hard', () => {
    const a = band('a', 'Faster', '2026-07-29T20:00:00Z', '2026-07-29T21:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T20:30:00Z', '2026-07-29T21:30:00Z');

    const result = computeBandOverlaps([a, b]);

    expect(result.get('a')?.[0].severity).toBe('hard');
    expect(result.get('b')?.[0].severity).toBe('hard');
  });

  it('handles band with both hard-conflict and soft-overlap partners', () => {
    const a = band('a', 'Faster', '2026-07-29T18:00:00Z', '2026-07-29T20:00:00Z');
    const hardPartner = band('b', 'Harder', '2026-07-29T18:30:00Z', '2026-07-29T19:30:00Z');
    const softPartner = band('c', 'Louder', '2026-07-29T19:55:00Z', '2026-07-29T20:55:00Z');

    const result = computeBandOverlaps([a, hardPartner, softPartner]);

    const aEntries = result.get('a') as OverlapEntry[];
    expect(aEntries).toHaveLength(2);

    const hardEntry = aEntries.find((e) => e.band.id === 'b');
    const softEntry = aEntries.find((e) => e.band.id === 'c');

    expect(hardEntry?.severity).toBe('hard');
    expect(softEntry?.severity).toBe('soft');
  });
});

describe('computeBandConflicts alias', () => {
  it('works as an alias to computeBandOverlaps', () => {
    const a = band('a', 'Faster', '2026-07-29T18:00:00Z', '2026-07-29T19:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T18:30:00Z', '2026-07-29T19:30:00Z');

    const result = computeBandConflicts([a, b]);

    expect(result.size).toBe(2);
    expect(result.get('a')?.[0].band.id).toBe('b');
  });
});
