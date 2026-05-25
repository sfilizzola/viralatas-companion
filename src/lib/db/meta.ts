import { getDB, wipeTargetObjectStores } from './connection';

// --- Cache version invalidation ---

export async function wipeAllLocalData() {
  const db = await getDB();
  const stores = wipeTargetObjectStores();
  const tx = db.transaction(stores, 'readwrite');

  await Promise.all(stores.map((store) => tx.objectStore(store).clear()));

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
