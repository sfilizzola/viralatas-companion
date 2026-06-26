import { openDB, type IDBPDatabase } from 'idb';
import type { ViralatasDB } from './types';

export const DB_NAME = 'viralatas-db';
export const DB_VERSION = 14;

/** Canonical object store list — keep in sync with the upgrade() block below. */
export const VIRALATAS_OBJECT_STORES = [
  'session',
  'bands',
  'crew_users',
  'user_picks',
  'offline_picks',
  'user_presence',
  'offline_presence',
  'announcements',
  'pending_announcements',
  'metal_place_config',
  'live_band_test_config',
  'camp_location',
  'meta',
  'user_missed_bands',
  'offline_missed_bands',
  'user_band_ratings',
  'offline_band_ratings',
  'offline_duck_quacks',
  'user_badge_history',
  'announcement_reactions',
  'offline_announcement_reactions',
] as const satisfies readonly (keyof ViralatasDB)[];

/** Preserved on cache-version invalidation (session + local cache_version marker). */
export const WIPE_PRESERVED_OBJECT_STORES = ['session', 'meta'] as const;

type WipePreservedStore = (typeof WIPE_PRESERVED_OBJECT_STORES)[number];
export type WipeTargetStore = Exclude<(typeof VIRALATAS_OBJECT_STORES)[number], WipePreservedStore>;

export function wipeTargetObjectStores(): WipeTargetStore[] {
  const preserved = new Set<string>(WIPE_PRESERVED_OBJECT_STORES);
  return VIRALATAS_OBJECT_STORES.filter((name) => !preserved.has(name)) as WipeTargetStore[];
}

let dbPromise: Promise<IDBPDatabase<ViralatasDB>> | null = null;

function isDatabaseCurrent(db: IDBPDatabase<ViralatasDB>): boolean {
  if (db.version < DB_VERSION) return false;
  return VIRALATAS_OBJECT_STORES.every((store) => db.objectStoreNames.contains(store));
}

function upgradeDatabase(db: IDBPDatabase<ViralatasDB>) {
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
        if (!db.objectStoreNames.contains('announcements')) {
          db.createObjectStore('announcements', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending_announcements')) {
          db.createObjectStore('pending_announcements', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('metal_place_config')) {
          db.createObjectStore('metal_place_config');
        }
        if (!db.objectStoreNames.contains('live_band_test_config')) {
          db.createObjectStore('live_band_test_config');
        }
        if (!db.objectStoreNames.contains('camp_location')) {
          db.createObjectStore('camp_location');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
        if (!db.objectStoreNames.contains('user_missed_bands')) {
          const missedStore = db.createObjectStore('user_missed_bands', {
            keyPath: ['user_id', 'band_id'],
          });
          missedStore.createIndex('by_user', 'user_id');
        }
        if (!db.objectStoreNames.contains('offline_missed_bands')) {
          db.createObjectStore('offline_missed_bands', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('user_band_ratings')) {
          const ratingsStore = db.createObjectStore('user_band_ratings', {
            keyPath: ['user_id', 'band_id'],
          });
          ratingsStore.createIndex('by_user', 'user_id');
        }
        if (!db.objectStoreNames.contains('offline_band_ratings')) {
          db.createObjectStore('offline_band_ratings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offline_duck_quacks')) {
          db.createObjectStore('offline_duck_quacks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('user_badge_history')) {
          const historyStore = db.createObjectStore('user_badge_history', {
            keyPath: ['user_id', 'festival_year', 'slug'],
          });
          historyStore.createIndex('by_user', 'user_id');
        }
        if (!db.objectStoreNames.contains('announcement_reactions')) {
          const reactionsStore = db.createObjectStore('announcement_reactions', {
            keyPath: ['announcement_id', 'user_id', 'emoji'],
          });
          reactionsStore.createIndex('by_announcement', 'announcement_id');
        }
        if (!db.objectStoreNames.contains('offline_announcement_reactions')) {
          db.createObjectStore('offline_announcement_reactions', { keyPath: 'id' });
        }
}

function openDatabase(version = DB_VERSION): Promise<IDBPDatabase<ViralatasDB>> {
  return openDB<ViralatasDB>(DB_NAME, version, { upgrade: upgradeDatabase });
}

/** Close cached IDB connection so the next getDB() reopens and runs upgrade(). */
export async function resetDbConnection(): Promise<void> {
  if (!dbPromise) return;
  try {
    const db = await dbPromise;
    db.close();
  } catch {
    // ignore close errors on broken connections
  }
  dbPromise = null;
}

/** @deprecated alias for tests */
export const resetDbConnectionForTests = resetDbConnection;

export async function getDB(): Promise<IDBPDatabase<ViralatasDB>> {
  if (!dbPromise) {
    dbPromise = openDatabase();
  }

  let db = await dbPromise;
  if (!isDatabaseCurrent(db)) {
    db.close();
    // Same-version open skips upgrade(); bump past on-disk version to create missing stores.
    const reopenVersion = Math.max(DB_VERSION, db.version + 1);
    dbPromise = openDatabase(reopenVersion);
    db = await dbPromise;
  }

  if (!isDatabaseCurrent(db)) {
    db.close();
    dbPromise = null;
    throw new Error(
      'IndexedDB schema upgrade failed. Reload the page to finish upgrading local storage.',
    );
  }

  return db;
}
