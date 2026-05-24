import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Announcement } from '../types';
import { applyPinSort, relativeTime } from '../services/announcementsDisplay';

describe('applyPinSort', () => {
  const mk = (id: string, pinned = false): Announcement => ({
    id,
    author_id: 'u1',
    content: id,
    created_at: `2026-07-29T${id.padStart(2, '0')}:00:00Z`,
    deleted_at: null,
    is_pinned: pinned,
  });

  it('returns empty/single list unchanged', () => {
    expect(applyPinSort([])).toEqual([]);
    expect(applyPinSort([mk('01')])).toEqual([mk('01')]);
  });

  it('moves pinned item to second position', () => {
    const items = [mk('03'), mk('02'), mk('01', true), mk('00')];
    const sorted = applyPinSort(items);
    expect(sorted[0].id).toBe('03');
    expect(sorted[1].id).toBe('01');
    expect(sorted[1].is_pinned).toBe(true);
  });

  it('leaves list unchanged when nothing is pinned', () => {
    const items = [mk('02'), mk('01'), mk('00')];
    expect(applyPinSort(items)).toEqual(items);
  });
});

describe('relativeTime', () => {
  const t = vi.fn((key: string, values?: Record<string, string | number>) => {
    if (key === 'minutesAgo') return `${values?.n}m ago`;
    if (key === 'hoursAgo') return `${values?.n}h ago`;
    return key;
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-29T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns justNow for recent timestamps', () => {
    expect(relativeTime('2026-07-29T11:59:30Z', t)).toBe('justNow');
  });

  it('returns minutesAgo for sub-hour diffs', () => {
    expect(relativeTime('2026-07-29T11:30:00Z', t)).toBe('30m ago');
  });

  it('returns hoursAgo for sub-day diffs', () => {
    expect(relativeTime('2026-07-29T08:00:00Z', t)).toBe('4h ago');
  });

  it('returns dd/mm for older dates', () => {
    expect(relativeTime('2026-07-20T08:00:00Z', t)).toBe('20/07');
  });
});
