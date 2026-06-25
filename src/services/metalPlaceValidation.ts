import type { MetalPlaceWindow } from '../types';
import { getFestivalDay } from './time';

export type MetalPlaceValidationError =
  | { key: 'metalPlaceMaxWindows' }
  | { key: 'metalPlaceInvalidTimeRange'; windowId: string }
  | { key: 'metalPlaceEndAfter2359'; windowId: string }
  | { key: 'metalPlaceOverlap'; windowIds: [string, string] };

const MAX_WINDOWS = 8;
const END_OF_DAY_MINUTES = 23 * 60 + 59;

function parseTimeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function berlinWallClockMinutes(nowDate: Date): number {
  const wallClock = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Berlin',
  }).format(nowDate);
  const [hourStr, minuteStr] = wallClock.split(':');
  return Number.parseInt(hourStr, 10) * 60 + Number.parseInt(minuteStr, 10);
}

export function sortMetalPlaceWindows(windows: MetalPlaceWindow[]): MetalPlaceWindow[] {
  return [...windows].sort((a, b) => {
    if (a.festival_day !== b.festival_day) {
      return a.festival_day - b.festival_day;
    }
    return parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
  });
}

export function isWindowActiveAt(window: MetalPlaceWindow, nowDate: Date): boolean {
  if (getFestivalDay(nowDate) !== window.festival_day) {
    return false;
  }

  const nowTotalMinutes = berlinWallClockMinutes(nowDate);
  const startTotalMinutes = parseTimeToMinutes(window.start_time);
  const endTotalMinutes = parseTimeToMinutes(window.end_time);

  return nowTotalMinutes >= startTotalMinutes && nowTotalMinutes < endTotalMinutes;
}

export function findActiveMetalPlaceWindow(
  windows: MetalPlaceWindow[],
  nowDate: Date,
): MetalPlaceWindow | null {
  for (const window of sortMetalPlaceWindows(windows)) {
    if (isWindowActiveAt(window, nowDate)) {
      return window;
    }
  }
  return null;
}

function windowsOverlap(a: MetalPlaceWindow, b: MetalPlaceWindow): boolean {
  if (a.festival_day !== b.festival_day) {
    return false;
  }

  const aStart = parseTimeToMinutes(a.start_time);
  const aEnd = parseTimeToMinutes(a.end_time);
  const bStart = parseTimeToMinutes(b.start_time);
  const bEnd = parseTimeToMinutes(b.end_time);

  return aStart < bEnd && bStart < aEnd;
}

export function validateMetalPlaceWindows(windows: MetalPlaceWindow[]): MetalPlaceValidationError[] {
  const errors: MetalPlaceValidationError[] = [];

  if (windows.length > MAX_WINDOWS) {
    errors.push({ key: 'metalPlaceMaxWindows' });
  }

  for (const window of windows) {
    const startMinutes = parseTimeToMinutes(window.start_time);
    const endMinutes = parseTimeToMinutes(window.end_time);

    if (startMinutes >= endMinutes) {
      errors.push({ key: 'metalPlaceInvalidTimeRange', windowId: window.id });
    }

    if (endMinutes > END_OF_DAY_MINUTES) {
      errors.push({ key: 'metalPlaceEndAfter2359', windowId: window.id });
    }
  }

  for (let i = 0; i < windows.length; i += 1) {
    for (let j = i + 1; j < windows.length; j += 1) {
      if (windowsOverlap(windows[i], windows[j])) {
        errors.push({
          key: 'metalPlaceOverlap',
          windowIds: [windows[i].id, windows[j].id],
        });
      }
    }
  }

  return errors;
}
