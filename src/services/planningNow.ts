import type { Band, CrewUser, UserPick } from '../types';

/**
 * Pure helpers for the `/now` planning tree (Phase 50). Everything here is fed
 * from the offline pack in IndexedDB — no Supabase reads, no trusted clock.
 */

/** Countdown to gates, expressed in festival-local calendar days. */
export type FestivalCountdown =
  | { kind: 'days'; days: number }
  | { kind: 'today' }
  | { kind: 'tba' };

/** One "pack picks" row: a peer Pick with its member and Band already resolved. */
export type PackPickActivityItem = {
  pick: UserPick;
  member: CrewUser;
  band: Band;
};

const DEFAULT_LIMIT = 3;
const MS_PER_DAY = 86_400_000;

function compareText(a: string, b: string): number {
  const byLocale = a.localeCompare(b, 'en', { sensitivity: 'base' });
  if (byLocale !== 0) return byLocale;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Unparsable timestamps sort as the oldest possible value, never as "newest". */
function timestamp(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/** Newest first; safe when both sides are `-Infinity` (subtraction would yield NaN). */
function compareNewestFirst(a: string | null | undefined, b: string | null | undefined): number {
  const left = timestamp(a);
  const right = timestamp(b);
  if (left === right) return 0;
  return left > right ? -1 : 1;
}

/**
 * The `limit` most recently announced Bands, newest `created_at` first.
 * Equal timestamps fall back to name ascending so the list is stable across
 * renders and independent of the input order. Input is never mutated.
 */
export function newestAnnouncedBands(bands: Band[], limit: number = DEFAULT_LIMIT): Band[] {
  return [...bands]
    .sort((a, b) => {
      const byCreated = compareNewestFirst(a.created_at, b.created_at);
      if (byCreated !== 0) return byCreated;
      const byName = compareText(a.name, b.name);
      if (byName !== 0) return byName;
      return compareText(a.id, b.id);
    })
    .slice(0, Math.max(0, limit));
}

/** Calendar date in a given IANA timezone, as days since the Unix epoch. */
function localDayIndex(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  for (const part of parts) {
    if (part.type === 'year') year = Number(part.value);
    else if (part.type === 'month') month = Number(part.value);
    else if (part.type === 'day') day = Number(part.value);
  }

  if (year == null || month == null || day == null) {
    throw new Error('Unable to resolve local calendar date');
  }

  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/**
 * Whole festival-local calendar days between `now` and the gates opening.
 * Time of day is irrelevant — only the local date matters, so a countdown never
 * flips on the device's own timezone. Returns `tba` when the start date or the
 * festival timezone cannot be resolved, and `today` once gates day has arrived.
 */
export function festivalCountdown(
  startsAt: string | null | undefined,
  timeZone: string | null | undefined,
  now: Date = new Date(),
): FestivalCountdown {
  if (!startsAt || !timeZone) return { kind: 'tba' };

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(now.getTime())) return { kind: 'tba' };

  let days: number;
  try {
    days = localDayIndex(start, timeZone) - localDayIndex(now, timeZone);
  } catch {
    return { kind: 'tba' };
  }

  return days <= 0 ? { kind: 'today' } : { kind: 'days', days };
}

/** Members with no display name sort last, so the roster never opens on a blank row. */
function memberSortKey(memberValue: CrewUser): string {
  return memberValue.display_name?.trim() ?? '';
}

/**
 * Roster order for the "who's going" sheet: display name ascending, unnamed
 * members last, ties broken by id. Includes members with zero Picks — the
 * caller passes the full cached `crew_users` roster. Input is never mutated.
 */
export function sortGoingMembers(members: CrewUser[]): CrewUser[] {
  return [...members].sort((a, b) => {
    const nameA = memberSortKey(a);
    const nameB = memberSortKey(b);

    const hasNameA = nameA.length > 0;
    const hasNameB = nameB.length > 0;
    if (hasNameA !== hasNameB) return hasNameA ? -1 : 1;

    const byName = compareText(nameA, nameB);
    if (byName !== 0) return byName;
    return compareText(a.id, b.id);
  });
}

/**
 * The `limit` most recent Picks made by other current members of the Active
 * Festival. Excludes the current user, anyone missing from the roster (leavers),
 * and Picks whose Band is not in the offline pack. Input is never mutated.
 */
export function buildPackPickActivity(
  picks: UserPick[],
  crewUsers: CrewUser[],
  bands: Band[],
  currentUserId: string | null | undefined,
  limit: number = DEFAULT_LIMIT,
): PackPickActivityItem[] {
  const memberById = new Map(crewUsers.map((crewUser) => [crewUser.id, crewUser]));
  const bandById = new Map(bands.map((bandRow) => [bandRow.id, bandRow]));

  const items: PackPickActivityItem[] = [];
  for (const pick of picks) {
    if (currentUserId && pick.user_id === currentUserId) continue;
    const memberRow = memberById.get(pick.user_id);
    const bandRow = bandById.get(pick.band_id);
    if (!memberRow || !bandRow) continue;
    items.push({ pick, member: memberRow, band: bandRow });
  }

  return items
    .sort((a, b) => {
      const byCreated = compareNewestFirst(a.pick.created_at, b.pick.created_at);
      if (byCreated !== 0) return byCreated;
      const byUser = compareText(a.pick.user_id, b.pick.user_id);
      if (byUser !== 0) return byUser;
      return compareText(a.pick.band_id, b.pick.band_id);
    })
    .slice(0, Math.max(0, limit));
}
