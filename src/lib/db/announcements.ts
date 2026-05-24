import type { Announcement } from '../../types';
import { getDB } from './connection';
import { ANNOUNCEMENTS_CHANGED_EVENT } from './events';

function emitAnnouncementsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ANNOUNCEMENTS_CHANGED_EVENT));
  }
}

export async function saveAnnouncements(announcements: Announcement[]) {
  const db = await getDB();
  const tx = db.transaction('announcements', 'readwrite');
  await tx.store.clear();
  await Promise.all(announcements.map((a) => tx.store.put(a)));
  await tx.done;
  emitAnnouncementsChanged();
}

export async function saveAnnouncement(announcement: Announcement) {
  const db = await getDB();
  await db.put('announcements', announcement);
  emitAnnouncementsChanged();
}

export async function removeAnnouncementFromCache(id: string) {
  const db = await getDB();
  await db.delete('announcements', id);
  emitAnnouncementsChanged();
}

export async function loadAnnouncementsFromCache(): Promise<Announcement[]> {
  const db = await getDB();
  const all = await db.getAll('announcements');
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function loadLatestAnnouncement(): Promise<Announcement | undefined> {
  const db = await getDB();
  const all = await db.getAll('announcements');
  if (all.length === 0) return undefined;
  return all.reduce((latest, a) => (a.created_at > latest.created_at ? a : latest));
}

export async function enqueueOfflineAnnouncement(announcement: Announcement) {
  const db = await getDB();
  await db.put('pending_announcements', announcement);
}

export async function loadOfflineAnnouncementsQueue(): Promise<Announcement[]> {
  const db = await getDB();
  return db.getAll('pending_announcements');
}

export async function removeFromOfflineAnnouncementsQueue(id: string) {
  const db = await getDB();
  await db.delete('pending_announcements', id);
}
