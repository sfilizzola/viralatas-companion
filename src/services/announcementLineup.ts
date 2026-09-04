import type { Band } from '../types';

export function sortAnnouncementBands(
  bands: Band[],
  pickCounts: Record<string, number>,
): Band[] {
  return [...bands].sort((a, b) => {
    const delta = (pickCounts[b.id] ?? 0) - (pickCounts[a.id] ?? 0);
    if (delta !== 0) return delta;
    return a.name.localeCompare(b.name);
  });
}

export function splitAnnouncementHero(
  sorted: Band[],
  pickCounts: Record<string, number>,
): { hero: Band | null; rest: Band[] } {
  const first = sorted[0];
  if (!first || (pickCounts[first.id] ?? 0) < 1) {
    return { hero: null, rest: sorted };
  }
  return { hero: first, rest: sorted.slice(1) };
}
