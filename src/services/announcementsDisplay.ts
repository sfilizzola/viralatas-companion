import type { Announcement } from '../types';

export function applyPinSort(announcements: Announcement[]): Announcement[] {
  if (announcements.length < 2) return announcements;
  const pinnedIdx = announcements.findIndex((a) => a.is_pinned);
  if (pinnedIdx === -1) return announcements;
  const pinned = announcements[pinnedIdx];
  const rest = announcements.filter((_, i) => i !== pinnedIdx);
  // rest[0] is the most recent non-pinned; insert pinned at position 1
  return [rest[0], pinned, ...rest.slice(1)];
}

export function relativeTime(
  isoString: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const date = new Date(isoString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hoursAgo', { n: hours });
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}
