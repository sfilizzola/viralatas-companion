import type { Band } from '../types';
import type { Festival } from '../types/festival';
import { bandDay } from './bandTime';
import { isTimedBand, type TimedBand } from './timedBand';

export type MyWackenDayGroup = {
  dayKey: string;
  upcoming: TimedBand[];
  ended: TimedBand[];
  showDivider: boolean;
};

export function splitPicksForMyPicks(
  bands: Band[],
  pickedIds: ReadonlySet<string>,
  festival: Festival | null | undefined,
): { timed: TimedBand[]; untimed: Band[] } {
  const picked = bands.filter((band) => pickedIds.has(band.id));
  return {
    timed: picked.filter((band) => isTimedBand(band, festival)),
    untimed: picked.filter((band) => !isTimedBand(band, festival)),
  };
}

/** Festival day key (YYYY-MM-DD, CEST) for an instant — same rules as `bandDay`. */
export function festivalDayKeyFromNow(now: Date): string {
  return bandDay(now.toISOString());
}

export function groupMyWackenByDay(
  bands: Band[],
  pickedIds: ReadonlySet<string>,
  now: Date,
): MyWackenDayGroup[] {
  const nowMs = now.getTime();
  const byDay = new Map<string, { upcoming: TimedBand[]; ended: TimedBand[] }>();
  const usable = bands.filter(
    (band): band is TimedBand =>
      band.slot_id !== null &&
      band.stage !== null &&
      band.start_time !== null &&
      band.end_time !== null,
  );

  for (const band of usable) {
    if (!pickedIds.has(band.id)) continue;
    const day = bandDay(band.start_time);
    const bucket = byDay.get(day) ?? { upcoming: [], ended: [] };
    if (new Date(band.end_time).getTime() < nowMs) {
      bucket.ended.push(band);
    } else {
      bucket.upcoming.push(band);
    }
    byDay.set(day, bucket);
  }

  const sortByStart = (a: TimedBand, b: TimedBand) =>
    a.start_time.localeCompare(b.start_time);

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, { upcoming, ended }]) => {
      upcoming.sort(sortByStart);
      ended.sort(sortByStart);
      return {
        dayKey,
        upcoming,
        ended,
        showDivider: ended.length > 0 && upcoming.length > 0,
      };
    });
}

/**
 * Mid-festival: collapse every day before `todayKey`; keep today + future days expanded.
 * Post-festival / pre-festival: none collapsed.
 */
export function computeInitialCollapsedDays(
  groups: MyWackenDayGroup[],
  options: { collapsePastDays: boolean; todayKey: string },
): Set<string> {
  if (!options.collapsePastDays) return new Set();
  const collapsed = new Set<string>();
  for (const group of groups) {
    if (group.dayKey < options.todayKey) {
      collapsed.add(group.dayKey);
    }
  }
  return collapsed;
}

export function countUpcomingLeftToday(groups: MyWackenDayGroup[], todayKey: string): number {
  const today = groups.find((g) => g.dayKey === todayKey);
  return today?.upcoming.length ?? 0;
}
