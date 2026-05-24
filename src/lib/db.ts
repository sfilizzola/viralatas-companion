import type { Announcement, Band, CrewUser, LiveBandTestConfig, MetalPlaceConfig, UserMissedBand, UserPick, UserPresence } from '../types';
import { getDB } from './db/connection';
import {
  ANNOUNCEMENTS_CHANGED_EVENT,
  BANDS_CHANGED_EVENT,
  CREW_USERS_CHANGED_EVENT,
  LIVE_BAND_TEST_CONFIG_CHANGED_EVENT,
  METAL_PLACE_CONFIG_CHANGED_EVENT,
  MISSED_CHANGED_EVENT,
  PICKS_CHANGED_EVENT,
  PRESENCE_CHANGED_EVENT,
} from './db/events';
import type {
  OfflineDuckQuackOp,
  OfflineMissedOp,
  OfflinePickOp,
  OfflinePresenceOp,
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

function emitBandsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BANDS_CHANGED_EVENT));
  }
}

function emitPicksChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PICKS_CHANGED_EVENT));
  }
}

function emitCrewUsersChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CREW_USERS_CHANGED_EVENT));
  }
}

function emitPresenceChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PRESENCE_CHANGED_EVENT));
  }
}

function emitAnnouncementsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ANNOUNCEMENTS_CHANGED_EVENT));
  }
}

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

export async function saveSession(session: unknown) {
  const db = await getDB();
  await db.put('session', session, 'current');
}

export async function loadSession(): Promise<unknown> {
  const db = await getDB();
  return db.get('session', 'current');
}

export async function clearSession() {
  const db = await getDB();
  await db.delete('session', 'current');
}

export async function saveBands(bands: Band[]) {
  const db = await getDB();
  const tx = db.transaction('bands', 'readwrite');
  await Promise.all(bands.map((b) => tx.store.put(b)));
  await tx.done;
  emitBandsChanged();
}

export async function loadBands(): Promise<Band[]> {
  const db = await getDB();
  return db.getAll('bands');
}

export async function saveCrewUsers(users: CrewUser[]) {
  const db = await getDB();
  const tx = db.transaction('crew_users', 'readwrite');
  await tx.store.clear();
  await Promise.all(users.map((user) => tx.store.put(user)));
  await tx.done;
  emitCrewUsersChanged();
}

export async function loadCrewUsers(): Promise<CrewUser[]> {
  const db = await getDB();
  return db.getAll('crew_users');
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

// --- Announcements ---

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
