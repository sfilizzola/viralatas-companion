import type { BandRatingScore, UserBandRating } from '../../types';
import { getDB } from './connection';
import { RATINGS_CHANGED_EVENT } from './events';
import type { OfflineBandRatingOp } from './types';

function emitRatingsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(RATINGS_CHANGED_EVENT));
  }
}

export async function saveBandRating(record: UserBandRating) {
  const db = await getDB();
  await db.put('user_band_ratings', record);
  emitRatingsChanged();
}

export async function removeBandRating(userId: string, bandId: string) {
  const db = await getDB();
  await db.delete('user_band_ratings', [userId, bandId]);
  emitRatingsChanged();
}

export async function loadBandRatings(userId: string): Promise<UserBandRating[]> {
  const db = await getDB();
  return db.getAllFromIndex('user_band_ratings', 'by_user', userId);
}

export async function loadAllBandRatings(): Promise<UserBandRating[]> {
  const db = await getDB();
  return db.getAll('user_band_ratings');
}

export async function replaceAllBandRatings(records: UserBandRating[]) {
  const db = await getDB();
  const tx = db.transaction('user_band_ratings', 'readwrite');
  await tx.store.clear();
  await Promise.all(records.map((r) => tx.store.put(r)));
  await tx.done;
  emitRatingsChanged();
}

export async function enqueueOfflineBandRating(op: OfflineBandRatingOp) {
  const db = await getDB();
  await db.put('offline_band_ratings', op);
}

export async function loadOfflineBandRatingsQueue(): Promise<OfflineBandRatingOp[]> {
  const db = await getDB();
  return db.getAll('offline_band_ratings');
}

export async function removeFromOfflineBandRatingsQueue(id: string) {
  const db = await getDB();
  await db.delete('offline_band_ratings', id);
}

export type { BandRatingScore };
