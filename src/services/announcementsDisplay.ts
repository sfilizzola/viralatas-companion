import type { Announcement } from '../types';
import type { AnnouncementReactionRow } from '../lib/db';
import { REACTION_EMOJIS } from '../lib/db';

export type AnnouncementReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  reactors: string[];
};

export type AnnouncementWithReactions = Announcement & {
  reactions: AnnouncementReactionSummary[];
};

export function buildReactionSummaries(
  rows: AnnouncementReactionRow[],
  announcementId: string,
  currentUserId: string | null,
  displayNameByUserId: Map<string, string>,
): AnnouncementReactionSummary[] {
  const forPost = rows.filter((r) => r.announcement_id === announcementId);
  const byEmoji = new Map<string, { userIds: string[]; reactedByMe: boolean }>();
  for (const r of forPost) {
    const entry = byEmoji.get(r.emoji) ?? { userIds: [], reactedByMe: false };
    entry.userIds.push(r.user_id);
    if (r.user_id === currentUserId) entry.reactedByMe = true;
    byEmoji.set(r.emoji, entry);
  }
  return Array.from(byEmoji.entries())
    .map(([emoji, { userIds, reactedByMe }]) => ({
      emoji,
      count: userIds.length,
      reactedByMe,
      reactors: userIds
        .map((id) => displayNameByUserId.get(id) ?? id)
        .sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return REACTION_EMOJIS.indexOf(a.emoji as (typeof REACTION_EMOJIS)[number])
        - REACTION_EMOJIS.indexOf(b.emoji as (typeof REACTION_EMOJIS)[number]);
    });
}

export function applyPinSort<T extends Announcement>(announcements: T[]): T[] {
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
