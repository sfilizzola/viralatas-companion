import type { LiveBandTestConfig, MetalPlaceConfig, UserMissedBand } from '../types';
import { getDB } from './db/connection';
import {
  LIVE_BAND_TEST_CONFIG_CHANGED_EVENT,
  METAL_PLACE_CONFIG_CHANGED_EVENT,
  MISSED_CHANGED_EVENT,
} from './db/events';
import type {
  OfflineDuckQuackOp,
  OfflineMissedOp,
} from './db/types';

export {
  ANNOUNCEMENTS_CHANGED_EVENT,
  BANDS_CHANGED_EVENT,
  CREW_USERS_CHANGED_EVENT,
  LIVE_BAND_TEST_CONFIG_CHANGED_EVENT,
  METAL_PLACE_CONFIG_CHANGED_EVENT,
  MISSED_CHANGED_EVENT,
  PICKS_CHANGED_EVENT,
  PRESENCE_CHANGED_EVENT,
} from './db/events';
export type { OfflineDuckQuackOp, OfflinePickOp } from './db/types';
export { resetDbConnectionForTests } from './db/connection';
export { saveSession, loadSession, clearSession } from './db/session';
export { saveBands, loadBands, saveCrewUsers, loadCrewUsers } from './db/catalog';
export {
  saveUserPick,
  removeUserPick,
  loadUserPicks,
  loadAllUserPicks,
  replaceUserPicks,
  enqueueOfflinePick,
  loadOfflineQueue,
  removeFromOfflineQueue,
} from './db/picks';
export {
  saveUserPresence,
  loadUserPresence,
  loadAllUserPresence,
  replaceUserPresence,
  enqueueOfflinePresence,
  loadOfflinePresenceQueue,
  removeFromOfflinePresenceQueue,
} from './db/presence';
export {
  saveAnnouncements,
  saveAnnouncement,
  removeAnnouncementFromCache,
  loadAnnouncementsFromCache,
  loadLatestAnnouncement,
  enqueueOfflineAnnouncement,
  loadOfflineAnnouncementsQueue,
  removeFromOfflineAnnouncementsQueue,
} from './db/announcements';

function emitMetalPlaceConfigChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(METAL_PLACE_CONFIG_CHANGED_EVENT));
  }
}

function emitLiveBandTestConfigChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LIVE_BAND_TEST_CONFIG_CHANGED_EVENT));
  }
}

function emitMissedChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MISSED_CHANGED_EVENT));
  }
}

// --- Metal Place Configuration ---

export async function loadMetalPlaceConfig(): Promise<MetalPlaceConfig | null> {
  const db = await getDB();
  const config = await db.get('metal_place_config', 'current');
  return config ?? null;
}

export async function saveMetalPlaceConfig(config: MetalPlaceConfig) {
  const db = await getDB();
  await db.put('metal_place_config', config, 'current');
  emitMetalPlaceConfigChanged();
}

export async function clearMetalPlaceConfig() {
  const db = await getDB();
  await db.delete('metal_place_config', 'current');
}

// --- Live Band Test Configuration ---

export async function loadLiveBandTestConfig(): Promise<LiveBandTestConfig | null> {
  const db = await getDB();
  const config = await db.get('live_band_test_config', 'current');
  return config ?? null;
}

export async function saveLiveBandTestConfig(config: LiveBandTestConfig) {
  const db = await getDB();
  await db.put('live_band_test_config', config, 'current');
  emitLiveBandTestConfigChanged();
}

export async function clearLiveBandTestConfig() {
  const db = await getDB();
  await db.delete('live_band_test_config', 'current');
}

// --- User Missed Bands ---

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

// --- Cache version invalidation ---

export async function wipeAllLocalData() {
  const db = await getDB();
  const tx = db.transaction(
    ['bands', 'crew_users', 'user_picks', 'offline_picks', 'user_presence', 'offline_presence', 'announcements', 'pending_announcements', 'user_missed_bands', 'offline_missed_bands'],
    'readwrite',
  );

  await Promise.all([
    tx.objectStore('bands').clear(),
    tx.objectStore('crew_users').clear(),
    tx.objectStore('user_picks').clear(),
    tx.objectStore('offline_picks').clear(),
    tx.objectStore('user_presence').clear(),
    tx.objectStore('offline_presence').clear(),
    tx.objectStore('announcements').clear(),
    tx.objectStore('pending_announcements').clear(),
    tx.objectStore('user_missed_bands').clear(),
    tx.objectStore('offline_missed_bands').clear(),
  ]);

  await tx.done;
}

export async function saveCacheVersion(version: string) {
  const db = await getDB();
  await db.put('meta', { cache_version: version }, 'cache_version');
}

export async function loadCacheVersion(): Promise<string | null> {
  const db = await getDB();
  const meta = await db.get('meta', 'cache_version');
  return meta?.cache_version ?? null;
}

// --- Offline duck quacks ---

export async function enqueueOfflineDuckQuack(op: OfflineDuckQuackOp) {
  const db = await getDB();
  await db.put('offline_duck_quacks', op);
}

export async function loadOfflineDuckQuackQueue(): Promise<OfflineDuckQuackOp[]> {
  const db = await getDB();
  return db.getAll('offline_duck_quacks');
}

export async function removeFromOfflineDuckQuackQueue(id: string) {
  const db = await getDB();
  await db.delete('offline_duck_quacks', id);
}
