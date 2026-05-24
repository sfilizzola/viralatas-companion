import type { UserPick } from '../../types';
import { getDB } from './connection';
import { PICKS_CHANGED_EVENT } from './events';
import type { OfflinePickOp } from './types';

function emitPicksChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PICKS_CHANGED_EVENT));
  }
}

export async function saveUserPick(pick: UserPick) {
  const db = await getDB();
  await db.put('user_picks', pick);
  emitPicksChanged();
}

export async function removeUserPick(userId: string, bandId: string) {
  const db = await getDB();
  await db.delete('user_picks', [userId, bandId]);
  emitPicksChanged();
}

export async function loadUserPicks(userId: string): Promise<UserPick[]> {
  const db = await getDB();
  return db.getAllFromIndex('user_picks', 'by_user', userId);
}

export async function loadAllUserPicks(): Promise<UserPick[]> {
  const db = await getDB();
  return db.getAll('user_picks');
}

export async function replaceUserPicks(picks: UserPick[], userId?: string) {
  const db = await getDB();
  const tx = db.transaction('user_picks', 'readwrite');
  if (userId) {
    const existing = await tx.store.index('by_user').getAll(userId);
    await Promise.all(existing.map((pick) => tx.store.delete([pick.user_id, pick.band_id])));
  } else {
    await tx.store.clear();
  }
  await Promise.all(picks.map((pick) => tx.store.put(pick)));
  await tx.done;
  emitPicksChanged();
}

export async function enqueueOfflinePick(op: OfflinePickOp) {
  const db = await getDB();
  await db.put('offline_picks', op);
}

export async function loadOfflineQueue(): Promise<OfflinePickOp[]> {
  const db = await getDB();
  return db.getAll('offline_picks');
}

export async function removeFromOfflineQueue(id: string) {
  const db = await getDB();
  await db.delete('offline_picks', id);
}
