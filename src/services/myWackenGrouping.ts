import type { Band } from '../types';
import { bandDay } from './bandTime';

export type MyWackenDayGroup = {
  dayKey: string;
  upcoming: Band[];
  ended: Band[];
  showDivider: boolean;
};

/** Festival day key (YYYY-MM-DD, CEST) for an instant — same rules as `bandDay`. */
export function festivalDayKeyFromNow(now: Date): string {
  return bandDay({
    id: '__now__',
    slot_id: '__now__',
    name: '',
    stage: '',
    start_time: now.toISOString(),
    end_time: now.toISOString(),
    image_url: null,
    genre: null,
    category: null,
  });
}

export function groupMyWackenByDay(
  bands: Band[],
  pickedIds: ReadonlySet<string>,
  now: Date,
): MyWackenDayGroup[] {
  const nowMs = now.getTime();
  const byDay = new Map<string, { upcoming: Band[]; ended: Band[] }>();

  for (const band of bands) {
    if (!pickedIds.has(band.id)) continue;
    const day = bandDay(band);
    const bucket = byDay.get(day) ?? { upcoming: [], ended: [] };
    if (new Date(band.end_time).getTime() < nowMs) {
      bucket.ended.push(band);
    } else {
      bucket.upcoming.push(band);
    }
    byDay.set(day, bucket);
  }

  const sortByStart = (a: Band, b: Band) => a.start_time.localeCompare(b.start_time);

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

/** Mid-festival: collapse past ended-only days; keep today expanded. Post-festival: none collapsed. */
export function computeInitialCollapsedDays(
  groups: MyWackenDayGroup[],
  options: { festivalActive: boolean; todayKey: string },
): Set<string> {
  if (!options.festivalActive) return new Set();
  const collapsed = new Set<string>();
  for (const group of groups) {
    const endedOnly = group.upcoming.length === 0 && group.ended.length > 0;
    if (endedOnly && group.dayKey !== options.todayKey) {
      collapsed.add(group.dayKey);
    }
  }
  return collapsed;
}

export function countUpcomingLeftToday(groups: MyWackenDayGroup[], todayKey: string): number {
  const today = groups.find((g) => g.dayKey === todayKey);
  return today?.upcoming.length ?? 0;
}
