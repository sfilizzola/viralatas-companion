import type { Band } from '../types';

export function bandDay(band: Band): string {
  const d = new Date(band.start_time);
  const cest = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  const hour = cest.getUTCHours();
  if (hour < 4) cest.setUTCDate(cest.getUTCDate() - 1);
  return cest.toISOString().slice(0, 10);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const cest = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  const h = String(cest.getUTCHours()).padStart(2, '0');
  const m = String(cest.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
