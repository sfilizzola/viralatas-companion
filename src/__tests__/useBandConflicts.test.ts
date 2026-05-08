import { describe, it, expect } from 'vitest';
import type { Band } from '../types';
import { computeBandConflicts } from '../hooks/useBandConflicts';

function band(
  id: string,
  stage: string,
  startIso: string,
  endIso: string,
): Band {
  return {
    id,
    name: id,
    stage,
    start_time: startIso,
    end_time: endIso,
    image_url: null,
    genre: null,
  };
}

describe('computeBandConflicts', () => {
  it('returns an empty map when there are no overlaps', () => {
    const a = band('a', 'Faster', '2026-07-29T18:00:00Z', '2026-07-29T19:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T19:30:00Z', '2026-07-29T20:30:00Z');

    const result = computeBandConflicts([a, b]);

    expect(result.size).toBe(0);
  });

  it('detects two bands overlapping on different stages', () => {
    const a = band('a', 'Faster', '2026-07-29T18:00:00Z', '2026-07-29T19:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T18:30:00Z', '2026-07-29T19:30:00Z');

    const result = computeBandConflicts([a, b]);

    expect(result.size).toBe(2);
    expect(result.get('a')).toEqual([b]);
    expect(result.get('b')).toEqual([a]);
  });

  it('does not flag overlap when bands are on the same stage', () => {
    const a = band('a', 'Faster', '2026-07-29T18:00:00Z', '2026-07-29T19:00:00Z');
    const b = band('b', 'Faster', '2026-07-29T18:30:00Z', '2026-07-29T19:30:00Z');

    const result = computeBandConflicts([a, b]);

    expect(result.size).toBe(0);
  });

  it('does not flag back-to-back bands as conflicting', () => {
    const a = band('a', 'Faster', '2026-07-29T18:00:00Z', '2026-07-29T19:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T19:00:00Z', '2026-07-29T20:00:00Z');

    const result = computeBandConflicts([a, b]);

    expect(result.size).toBe(0);
  });

  it('records every conflicting partner for a band', () => {
    const a = band('a', 'Faster', '2026-07-29T18:00:00Z', '2026-07-29T20:00:00Z');
    const b = band('b', 'Harder', '2026-07-29T18:30:00Z', '2026-07-29T19:30:00Z');
    const c = band('c', 'Louder', '2026-07-29T19:00:00Z', '2026-07-29T20:30:00Z');

    const result = computeBandConflicts([a, b, c]);

    expect(result.get('a')).toEqual([b, c]);
    expect(result.get('b')?.map((x) => x.id).sort()).toEqual(['a', 'c']);
    expect(result.get('c')?.map((x) => x.id).sort()).toEqual(['a', 'b']);
  });

  it('returns an empty map for an empty input', () => {
    expect(computeBandConflicts([]).size).toBe(0);
  });
});
