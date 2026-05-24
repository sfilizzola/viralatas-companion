import type { UserMissedBand } from '../../types';
import { getDB } from './connection';
import { MISSED_CHANGED_EVENT } from './events';
import type { OfflineMissedOp } from './types';

function emitMissedChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MISSED_CHANGED_EVENT));
  }
}

export async function saveMissedBand(record: UserMissedBand) {
  const db = await getDB();
  await db.put('user_missed_bands', record);
  emitMissedChanged();
}

export async function removeMissedBand(userId: string, bandId: string) {
  const db = await getDB();
  await db.delete('user_missed_bands', [userId, bandId]);
  emitMissedChanged();
}

export async function loadMissedBands(userId: string): Promise<UserMissedBand[]> {
  const db = await getDB();
  return db.getAllFromIndex('user_missed_bands', 'by_user', userId);
}

export async function loadAllMissedBands(): Promise<UserMissedBand[]> {
  const db = await getDB();
  return db.getAll('user_missed_bands');
}

export async function replaceUserMissedBands(records: UserMissedBand[], userId: string) {
  const db = await getDB();
  const tx = db.transaction('user_missed_bands', 'readwrite');
  const existing = await tx.store.index('by_user').getAll(userId);
  await Promise.all(existing.map((r) => tx.store.delete([r.user_id, r.band_id])));
  await Promise.all(records.map((r) => tx.store.put(r)));
  await tx.done;
  emitMissedChanged();
}

export async function enqueueOfflineMissed(op: OfflineMissedOp) {
  const db = await getDB();
  await db.put('offline_missed_bands', op);
}

export async function loadOfflineMissedQueue(): Promise<OfflineMissedOp[]> {
  const db = await getDB();
  return db.getAll('offline_missed_bands');
}

export async function removeFromOfflineMissedQueue(id: string) {
  const db = await getDB();
  await db.delete('offline_missed_bands', id);
}
