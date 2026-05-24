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

export function isFestivalActive(at: Date = now()): boolean {
  return at >= FESTIVAL_DAY_1_START;
}

/** 1-based festival day (Day 1 = Wed 2026-07-29). Values ≤ 0 are before the festival. */
export function getFestivalDay(at: Date): number {
  const dayOffset = Math.floor((at.getTime() - FESTIVAL_DAY_1_START.getTime()) / FESTIVAL_DAY_MS);
  return dayOffset + 1;
}
