import type { Band } from '../types';
import type { BandFilterValue } from '../components/bandFilterValue';
import { bandDay } from './bandTime';

export function filterBands(
  bands: Band[],
  filters: BandFilterValue,
  now: Date,
  userPickIds?: Set<string>,
): Band[] {
  const q = filters.query.trim().toLowerCase();
  const result = bands.filter((b) => {
    if (filters.day && b.start_time && bandDay(b.start_time) !== filters.day) return false;
    if (filters.stage.length > 0 && b.stage && !filters.stage.includes(b.stage)) return false;
    if (filters.genre && b.genre !== filters.genre) return false;
    if (filters.upcoming && b.end_time && new Date(b.end_time) <= now) return false;
    if (q && !b.name.toLowerCase().includes(q)) return false;
    if (userPickIds && !userPickIds.has(b.id)) return false;
    return true;
  });

  switch (filters.sortOrder) {
    case 'time-asc':
      result.sort((a, b) =>
        a.start_time && b.start_time
          ? a.start_time.localeCompare(b.start_time) || a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name),
      );
      break;
    case 'time-desc':
      result.sort((a, b) =>
        a.start_time && b.start_time
          ? b.start_time.localeCompare(a.start_time) || a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name),
      );
      break;
    case 'alpha':
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return result;
}
