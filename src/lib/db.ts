import { openDB, type IDBPDatabase } from 'idb';
import type { Band, CrewUser, UserPick, UserPresence } from '../types';

const DB_NAME = 'viralatas-db';
const DB_VERSION = 4;

export const PICKS_CHANGED_EVENT = 'viralatas:picks-changed';
export const CREW_USERS_CHANGED_EVENT = 'viralatas:crew-users-changed';
export const PRESENCE_CHANGED_EVENT = 'viralatas:presence-changed';

type OfflinePickOp = {
  id: string;
  user_id: string;
  band_id: string;
  action: 'add' | 'remove';
  created_at: string;
};

type OfflinePresenceOp = UserPresence & {
  id: string;
};

type ViralatasDB = {
  session: {
    key: string;
    value: unknown;
  };
  bands: {
    key: string;
    value: Band;
  };
  crew_users: {
    key: string;
    value: CrewUser;
  };
  user_picks: {
    key: [string, string];
    value: UserPick;
    indexes: { by_user: string };
  };
  offline_picks: {
    key: string;
    value: OfflinePickOp;
  };
  user_presence: {
    key: string;
    value: UserPresence;
  };
  offline_presence: {
    key: string;
    value: OfflinePresenceOp;
  };
};

let dbPromise: Promise<IDBPDatabase<ViralatasDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ViralatasDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session');
        }
        if (!db.objectStoreNames.contains('bands')) {
          db.createObjectStore('bands', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('crew_users')) {
          db.createObjectStore('crew_users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('user_picks')) {
          const picksStore = db.createObjectStore('user_picks', {
            keyPath: ['user_id', 'band_id'],
          });
          picksStore.createIndex('by_user', 'user_id');
        }
        if (!db.objectStoreNames.contains('offline_picks')) {
          db.createObjectStore('offline_picks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('user_presence')) {
          db.createObjectStore('user_presence', { keyPath: 'user_id' });
        }
        if (!db.objectStoreNames.contains('offline_presence')) {
          db.createObjectStore('offline_presence', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
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
}

export async function loadBands(): Promise<Band[]> {
  const db = await getDB();
  return db.getAll('bands');
}

export async function saveCrewUsers(users: CrewUser[]) {
  const db = await getDB();
  const tx = db.transaction('crew_users', 'readwrite');
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
