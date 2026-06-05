import { useMemo } from 'react';

export type ActiveWindow = {
  start: Date;
  end: Date;
};

export type TimelineGate = {
  isActive: boolean;
  windowStart: Date | null;
  windowEnd: Date | null;
};

/**
 * The four daily active windows for the timeline scrubber.
 * Each window runs from 10:00 to 03:00 CEST the following calendar day.
 * No bands start before 10:00 or end after 03:00 on any festival day.
 */
const ACTIVE_WINDOWS: [Date, Date][] = [
  [new Date('2026-07-29T10:00:00+02:00'), new Date('2026-07-30T03:00:00+02:00')], // D1
  [new Date('2026-07-30T10:00:00+02:00'), new Date('2026-07-31T03:00:00+02:00')], // D2
  [new Date('2026-07-31T10:00:00+02:00'), new Date('2026-08-01T03:00:00+02:00')], // D3
  [new Date('2026-08-01T10:00:00+02:00'), new Date('2026-08-02T03:00:00+02:00')], // D4
];

/** Pure helper — exported for tests. Returns the matching window or null. */
export function getActiveWindow(at: Date): ActiveWindow | null {
  const found = ACTIVE_WINDOWS.find(([start, end]) => at >= start && at <= end);
  if (!found) return null;
  return { start: found[0], end: found[1] };
}

/** React hook. Memoised by `now` reference. */
export function useTimelineGate(now: Date): TimelineGate {
  return useMemo(() => {
    const win = getActiveWindow(now);
    return {
      isActive: win !== null,
      windowStart: win?.start ?? null,
      windowEnd: win?.end ?? null,
    };
  }, [now]);
}
