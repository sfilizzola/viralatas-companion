import type { Band } from '../types';

export const WEEKDAY_I18N_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type WeekdayI18nKey = (typeof WEEKDAY_I18N_KEYS)[number];

/** Weekday i18n key for a band's festival day (CEST, same rules as bandDay). */
export function bandWeekdayKey(band: Band): WeekdayI18nKey {
  const dayStr = bandDay(band);
  const date = new Date(`${dayStr}T12:00:00Z`);
  return WEEKDAY_I18N_KEYS[date.getUTCDay()];
}

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
