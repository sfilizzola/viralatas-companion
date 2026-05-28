import type { Band } from '../types';

export const TIME_OVERRIDE_STORAGE_KEY = 'viralatas-time-override';
export const TIME_OVERRIDE_CHANGED_EVENT = 'viralatas:time-override-changed';

export function getTimeOverride(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TIME_OVERRIDE_STORAGE_KEY);
}

export function now(): Date {
  const override = getTimeOverride();
  if (override) {
    const d = new Date(override);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function setTimeOverride(iso: string): void {
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid time override: ${iso}`);
  }
  localStorage.setItem(TIME_OVERRIDE_STORAGE_KEY, d.toISOString());
  window.dispatchEvent(new Event(TIME_OVERRIDE_CHANGED_EVENT));
}

export function clearTimeOverride(): void {
  localStorage.removeItem(TIME_OVERRIDE_STORAGE_KEY);
  window.dispatchEvent(new Event(TIME_OVERRIDE_CHANGED_EVENT));
}

export function isTimeOverrideActive(): boolean {
  return getTimeOverride() !== null;
}

/** Wacken 2026 runs in CEST (UTC+2); Berlin is always CEST during the festival window. */
export const WACKEN_CEST_OFFSET = '+02:00';

/** Midnight CEST on festival Day 1 (Wed 2026-07-29). Canonical instant for day boundaries. */
export const FESTIVAL_DAY_1_START_ISO = `2026-07-29T00:00:00${WACKEN_CEST_OFFSET}`;

export const FESTIVAL_DAY_1_START = new Date(FESTIVAL_DAY_1_START_ISO);

export const FESTIVAL_DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar date at midnight CEST (YYYY-MM-DD). */
export function wackenLocalMidnight(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00${WACKEN_CEST_OFFSET}`);
}

/** `datetime-local` value (YYYY-MM-DDTHH:mm) interpreted as Wacken CEST, not browser TZ. */
export function parseWackenDatetimeLocal(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    throw new Error(`Invalid Wacken datetime-local: ${value}`);
  }
  const instant = new Date(`${value}:00${WACKEN_CEST_OFFSET}`);
  if (isNaN(instant.getTime())) {
    throw new Error(`Invalid Wacken datetime-local: ${value}`);
  }
  return instant.toISOString();
}

/** Format an ISO instant for a `datetime-local` input in Europe/Berlin (festival field time). */
export function formatWackenDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function isFestivalActive(at: Date = now()): boolean {
  return at >= FESTIVAL_DAY_1_START;
}

/** 1-based festival day (Day 1 = Wed 2026-07-29). Values ≤ 0 are before the festival. */
export function getFestivalDay(at: Date): number {
  const dayOffset = Math.floor((at.getTime() - FESTIVAL_DAY_1_START.getTime()) / FESTIVAL_DAY_MS);
  return dayOffset + 1;
}

type FestivalEndBand = Pick<Band, 'end_time' | 'category'>;

/** True when `at` is past the latest non-ceremony band end_time. */
export function isFestivalEnded(
  at: Date = now(),
  bands?: FestivalEndBand[],
): boolean {
  if (!bands || bands.length === 0) return false;

  const nonCeremony = bands.filter((band) => band.category !== 'ceremony');
  if (nonCeremony.length === 0) return false;

  const maxEndMs = nonCeremony.reduce((max, band) => {
    const endMs = new Date(band.end_time).getTime();
    return endMs > max ? endMs : max;
  }, Number.NEGATIVE_INFINITY);

  return at.getTime() > maxEndMs;
}
