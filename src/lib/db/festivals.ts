import { getDB } from './connection';
import type { ViralatasDB } from './types';

const ACTIVE_FESTIVAL_ID_KEY = 'active_festival_id';
const ACTIVE_FESTIVAL_CACHE_VERSION_KEY = 'active_festival_cache_version';

/** Festival-scoped stores cleared on pack switch — session, meta, badge history kept. */
export const FESTIVAL_PACK_OBJECT_STORES = [
  'bands',
  'crew_users',
  'user_picks',
  'offline_picks',
  'user_presence',
  'offline_presence',
  'announcements',
  'pending_announcements',
  'announcement_reactions',
  'offline_announcement_reactions',
  'user_missed_bands',
  'offline_missed_bands',
  'user_band_ratings',
  'offline_band_ratings',
  'offline_duck_quacks',
  'metal_place_config',
  'live_band_test_config',
  'camp_location',
] as const satisfies readonly (keyof ViralatasDB)[];

export async function getActiveFestivalId(): Promise<string | null> {
  const db = await getDB();
  const row = await db.get('meta', ACTIVE_FESTIVAL_ID_KEY);
  return row?.active_festival_id ?? null;
}

export async function setActiveFestivalId(festivalId: string): Promise<void> {
  const db = await getDB();
  await db.put('meta', { active_festival_id: festivalId }, ACTIVE_FESTIVAL_ID_KEY);
}

export async function getActiveFestivalCacheVersion(): Promise<string | null> {
  const db = await getDB();
  const row = await db.get('meta', ACTIVE_FESTIVAL_CACHE_VERSION_KEY);
  return row?.active_festival_cache_version ?? null;
}

export async function setActiveFestivalCacheVersion(version: string): Promise<void> {
  const db = await getDB();
  await db.put(
    'meta',
    { active_festival_cache_version: version },
    ACTIVE_FESTIVAL_CACHE_VERSION_KEY,
  );
}

export async function clearActiveFestivalPack(): Promise<void> {
  const db = await getDB();
  const stores = [...FESTIVAL_PACK_OBJECT_STORES];
  const tx = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map((store) => tx.objectStore(store).clear()));
  await tx.done;
}
