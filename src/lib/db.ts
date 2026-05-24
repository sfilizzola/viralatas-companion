import { getDB } from './db/connection';
import type {
  OfflineDuckQuackOp,
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
export {
  saveMissedBand,
  removeMissedBand,
  loadMissedBands,
  loadAllMissedBands,
  replaceUserMissedBands,
  enqueueOfflineMissed,
  loadOfflineMissedQueue,
  removeFromOfflineMissedQueue,
} from './db/missed';
export {
  loadMetalPlaceConfig,
  saveMetalPlaceConfig,
  clearMetalPlaceConfig,
  loadLiveBandTestConfig,
  saveLiveBandTestConfig,
  clearLiveBandTestConfig,
} from './db/config';

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
