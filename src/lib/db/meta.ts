import { getDB } from './connection';

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
