import { describe, it, expect } from 'vitest';
import { filterBands } from '../services/bandFilter';
import { EMPTY_FILTERS } from '../components/bandFilterValue';
import type { Band } from '../types';
import type { BandFilterValue } from '../components/bandFilterValue';

function makeBand(id: string, overrides: Partial<Band> = {}): Band {
  return {
    id,
    slot_id: overrides.slot_id ?? `TST-${id}`,
    name: 'Test Band',
    stage: 'Faster',
    start_time: '2026-07-29T12:00:00Z',
    end_time: '2026-07-29T13:00:00Z',
    image_url: null,
    genre: 'Heavy Metal',
    category: 'band',
    ...overrides,
  };
}

// NOW = 12:00 UTC on July 29 (most test bands start at or after this)
const NOW = new Date('2026-07-29T12:00:00Z');

const BANDS: Band[] = [
  // Day 1 (2026-07-29), stage Faster, Heavy Metal
  makeBand('b1', { name: 'Iron Maiden', stage: 'Faster', genre: 'Heavy Metal', start_time: '2026-07-29T12:00:00Z', end_time: '2026-07-29T14:00:00Z' }),
  // Day 2 (2026-07-30), stage Harder, Thrash Metal
  makeBand('b2', { name: 'Metallica', stage: 'Harder', genre: 'Thrash Metal', start_time: '2026-07-30T12:00:00Z', end_time: '2026-07-30T14:00:00Z' }),
  // Day 1 (2026-07-29), stage Louder, Thrash Metal
  makeBand('b3', { name: 'Slayer', stage: 'Louder', genre: 'Thrash Metal', start_time: '2026-07-29T16:00:00Z', end_time: '2026-07-29T18:00:00Z' }),
  // Day 3 (2026-07-31), stage Faster, Black Metal
  makeBand('b4', { name: 'Mayhem', stage: 'Faster', genre: 'Black Metal', start_time: '2026-07-31T12:00:00Z', end_time: '2026-07-31T14:00:00Z' }),
  // Day 1 (2026-07-29), stage Wasteland, Classic Rock — already ended before NOW
  makeBand('b5', { name: 'Iron Butterfly', stage: 'Wasteland', genre: 'Classic Rock', start_time: '2026-07-29T09:00:00Z', end_time: '2026-07-29T11:00:00Z' }),
];

describe('filterBands', () => {
  it('returns all bands when EMPTY_FILTERS is passed', () => {
    expect(filterBands(BANDS, EMPTY_FILTERS, NOW)).toHaveLength(BANDS.length);
  });

  it('filters by day — only bands whose CEST date matches', () => {
    const result = filterBands(BANDS, { ...EMPTY_FILTERS, day: '2026-07-29' }, NOW);
    const ids = result.map((b) => b.id);
    expect(ids).toContain('b1');
    expect(ids).toContain('b3');
    expect(ids).toContain('b5');
    expect(ids).not.toContain('b2');
    expect(ids).not.toContain('b4');
  });

  it('filters by stage (single value)', () => {
    const result = filterBands(BANDS, { ...EMPTY_FILTERS, stage: ['Faster'] }, NOW);
    const ids = result.map((b) => b.id);
    expect(ids).toContain('b1');
    expect(ids).toContain('b4');
    expect(ids).not.toContain('b2');
    expect(ids).not.toContain('b3');
  });

  it('filters by stage (multi-select: any matching stage passes)', () => {
    const result = filterBands(BANDS, { ...EMPTY_FILTERS, stage: ['Faster', 'Louder'] }, NOW);
    const ids = result.map((b) => b.id);
    expect(ids).toContain('b1'); // Faster
    expect(ids).toContain('b3'); // Louder
    expect(ids).toContain('b4'); // Faster
    expect(ids).not.toContain('b2'); // Harder — not in list
    expect(ids).not.toContain('b5'); // Wasteland — not in list
  });

  it('filters by genre — exact match', () => {
    const result = filterBands(BANDS, { ...EMPTY_FILTERS, genre: 'Thrash Metal' }, NOW);
    const ids = result.map((b) => b.id);
    expect(ids).toContain('b2');
    expect(ids).toContain('b3');
    expect(ids).not.toContain('b1');
    expect(ids).not.toContain('b4');
  });

  it('filters by query string — case-insensitive partial match on name', () => {
    // 'iron' matches 'Iron Maiden' and 'Iron Butterfly'
    const result = filterBands(BANDS, { ...EMPTY_FILTERS, query: 'iron' }, NOW);
    const ids = result.map((b) => b.id);
    expect(ids).toContain('b1');
    expect(ids).toContain('b5');
    expect(ids).not.toContain('b2');
    expect(ids).not.toContain('b3');
    expect(ids).not.toContain('b4');
  });

  it('filters by query string — uppercase query still matches', () => {
    const result = filterBands(BANDS, { ...EMPTY_FILTERS, query: 'SLAYER' }, NOW);
    expect(result.map((b) => b.id)).toEqual(['b3']);
  });

  it('ignores leading/trailing whitespace in query string', () => {
    const result = filterBands(BANDS, { ...EMPTY_FILTERS, query: '  slayer  ' }, NOW);
    expect(result.map((b) => b.id)).toEqual(['b3']);
  });

  it('filters by upcoming — excludes bands whose end_time <= now', () => {
    // b5 ends at 11:00 UTC; NOW is 12:00 UTC → excluded
    const result = filterBands(BANDS, { ...EMPTY_FILTERS, upcoming: true }, NOW);
    const ids = result.map((b) => b.id);
    expect(ids).not.toContain('b5');
    expect(ids).toContain('b1'); // ends at 14:00 UTC → still upcoming
  });

  it('upcoming filter excludes a band whose end_time is exactly equal to now', () => {
    const exactlyNow = makeBand('bX', {
      start_time: '2026-07-29T10:00:00Z',
      end_time: '2026-07-29T12:00:00Z', // === NOW
    });
    const result = filterBands([exactlyNow], { ...EMPTY_FILTERS, upcoming: true }, NOW);
    expect(result).toHaveLength(0);
  });

  it('combines day + stage filters', () => {
    // Only Day 1 + Faster → b1
    const result = filterBands(BANDS, { ...EMPTY_FILTERS, day: '2026-07-29', stage: ['Faster'] }, NOW);
    expect(result.map((b) => b.id)).toEqual(['b1']);
  });

  it('combines genre + query filters', () => {
    // Thrash Metal AND name contains 'meta' → Metallica (b2)
    const result = filterBands(BANDS, { ...EMPTY_FILTERS, genre: 'Thrash Metal', query: 'meta' }, NOW);
    expect(result.map((b) => b.id)).toEqual(['b2']);
  });

  it('returns empty array when no bands match any filter', () => {
    const result = filterBands(BANDS, { ...EMPTY_FILTERS, genre: 'Polka' }, NOW);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input regardless of filters', () => {
    const filters: BandFilterValue = { ...EMPTY_FILTERS, day: '2026-07-29', stage: ['Faster'] };
    expect(filterBands([], filters, NOW)).toHaveLength(0);
  });

  it('filters by userPickIds — keeps only bands in the set', () => {
    const userPickIds = new Set(['b1', 'b3']);
    const result = filterBands(BANDS, EMPTY_FILTERS, NOW, userPickIds);
    const ids = result.map((b) => b.id);
    expect(ids).toContain('b1');
    expect(ids).toContain('b3');
    expect(ids).not.toContain('b2');
    expect(ids).not.toContain('b4');
    expect(ids).not.toContain('b5');
  });

  it('composes userPickIds with day filter', () => {
    const userPickIds = new Set(['b1', 'b2']);
    const result = filterBands(BANDS, { ...EMPTY_FILTERS, day: '2026-07-29' }, NOW, userPickIds);
    const ids = result.map((b) => b.id);
    expect(ids).toEqual(['b1']);
  });

  it('returns empty array when user has no picks that match', () => {
    const userPickIds = new Set<string>();
    const result = filterBands(BANDS, EMPTY_FILTERS, NOW, userPickIds);
    expect(result).toHaveLength(0);
  });
});
