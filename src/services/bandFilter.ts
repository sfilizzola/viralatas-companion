import type { Band } from '../types';
import type { BandFilterValue } from '../components/bandFilterValue';
import { bandDay } from './bandTime';

export function filterBands(bands: Band[], filters: BandFilterValue, now: Date): Band[] {
  const q = filters.query.trim().toLowerCase();
  return bands.filter((b) => {
    if (filters.day && bandDay(b) !== filters.day) return false;
    if (filters.stage.length > 0 && !filters.stage.includes(b.stage)) return false;
    if (filters.genre && b.genre !== filters.genre) return false;
    if (filters.upcoming && new Date(b.end_time) <= now) return false;
    if (q && !b.name.toLowerCase().includes(q)) return false;
    return true;
  });
}
