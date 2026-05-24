import { openDB, type IDBPDatabase } from 'idb';
import type { ViralatasDB } from './types';

export const DB_NAME = 'viralatas-db';
export const DB_VERSION = 9;

let dbPromise: Promise<IDBPDatabase<ViralatasDB>> | null = null;

/** Test-only: close cached connection so the next IDB op opens a fresh database. */
export async function resetDbConnectionForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

export function getDB() {
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
        if (!db.objectStoreNames.contains('offline_duck_quacks')) {
          db.createObjectStore('offline_duck_quacks', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}
