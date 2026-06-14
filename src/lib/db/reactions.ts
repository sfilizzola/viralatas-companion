import { getDB } from './connection';
import { ANNOUNCEMENTS_CHANGED_EVENT } from './events';
import type { AnnouncementReactionRow, OfflineAnnouncementReactionOp } from './types';

function emitAnnouncementsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ANNOUNCEMENTS_CHANGED_EVENT));
  }
}

export async function saveAnnouncementReaction(row: AnnouncementReactionRow) {
  const db = await getDB();
  await db.put('announcement_reactions', row);
  emitAnnouncementsChanged();
}

export async function removeAnnouncementReaction(
  announcementId: string,
  userId: string,
  emoji: string,
) {
  const db = await getDB();
  await db.delete('announcement_reactions', [announcementId, userId, emoji]);
  emitAnnouncementsChanged();
}

export async function loadAllAnnouncementReactions(): Promise<AnnouncementReactionRow[]> {
  const db = await getDB();
  return db.getAll('announcement_reactions');
}

export async function loadAnnouncementReactionsByAnnouncement(
  announcementId: string,
): Promise<AnnouncementReactionRow[]> {
  const db = await getDB();
  return db.getAllFromIndex('announcement_reactions', 'by_announcement', announcementId);
}

export async function removeAnnouncementReactionsForPost(announcementId: string) {
  const db = await getDB();
  const rows = await db.getAllFromIndex('announcement_reactions', 'by_announcement', announcementId);
  const tx = db.transaction('announcement_reactions', 'readwrite');
  await Promise.all(rows.map((row) => tx.store.delete([row.announcement_id, row.user_id, row.emoji])));
  await tx.done;
  if (rows.length > 0) emitAnnouncementsChanged();
}

export async function replaceAllAnnouncementReactions(rows: AnnouncementReactionRow[]) {
  const db = await getDB();
  const tx = db.transaction('announcement_reactions', 'readwrite');
  await tx.store.clear();
  await Promise.all(rows.map((row) => tx.store.put(row)));
  await tx.done;
  emitAnnouncementsChanged();
}

export async function enqueueOfflineAnnouncementReaction(op: OfflineAnnouncementReactionOp) {
  const db = await getDB();
  await db.put('offline_announcement_reactions', op);
}

export async function loadOfflineAnnouncementReactionsQueue(): Promise<OfflineAnnouncementReactionOp[]> {
  const db = await getDB();
  return db.getAll('offline_announcement_reactions');
}

export async function removeFromOfflineAnnouncementReactionsQueue(id: string) {
  const db = await getDB();
  await db.delete('offline_announcement_reactions', id);
}

export type { AnnouncementReactionRow, OfflineAnnouncementReactionOp };
