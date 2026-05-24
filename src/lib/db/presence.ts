import type { UserPresence } from '../../types';
import { getDB } from './connection';
import { PRESENCE_CHANGED_EVENT } from './events';
import type { OfflinePresenceOp } from './types';

function emitPresenceChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PRESENCE_CHANGED_EVENT));
  }
}

export async function saveUserPresence(presence: UserPresence) {
  const db = await getDB();
  await db.put('user_presence', presence);
  emitPresenceChanged();
}

export async function loadUserPresence(userId: string): Promise<UserPresence | undefined> {
  const db = await getDB();
  return db.get('user_presence', userId);
}

export async function loadAllUserPresence(): Promise<UserPresence[]> {
  const db = await getDB();
  return db.getAll('user_presence');
}

export async function replaceUserPresence(presence: UserPresence[], userId?: string) {
  const db = await getDB();
  const tx = db.transaction('user_presence', 'readwrite');
  if (userId) {
    await tx.store.delete(userId);
  } else {
    await tx.store.clear();
  }
  await Promise.all(presence.map((item) => tx.store.put(item)));
  await tx.done;
  emitPresenceChanged();
}

export async function enqueueOfflinePresence(op: OfflinePresenceOp) {
  const db = await getDB();
  await db.put('offline_presence', op);
}

export async function loadOfflinePresenceQueue(): Promise<OfflinePresenceOp[]> {
  const db = await getDB();
  return db.getAll('offline_presence');
}

export async function removeFromOfflinePresenceQueue(id: string) {
  const db = await getDB();
  await db.delete('offline_presence', id);
}
