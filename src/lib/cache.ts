import { supabase } from './supabase';
import { loadCacheVersion, saveCacheVersion, wipeAllLocalData } from './db';
import { syncBands } from './sync';
import { syncCrewPicks } from './picks';
import { syncCrewUsers } from './users';
import { syncCrewPresence } from './presence';
import { syncAnnouncements } from './announcements';

export async function checkAndApplyCacheVersion(): Promise<void> {
  try {
    const { data } = await supabase.from('app_config').select('value').eq('key', 'cache_version').single();

    if (!data) return;

    const remoteVersion = data.value;
    const localVersion = await loadCacheVersion();

    if (remoteVersion !== localVersion) {
      await wipeAllLocalData();
      await saveCacheVersion(remoteVersion);

      await Promise.all([syncBands(), syncCrewPicks(), syncCrewUsers(), syncCrewPresence(), syncAnnouncements()]);
    }
  } catch (error) {
    console.error('Cache version check failed:', error);
  }
}

export async function invalidateCacheForAllUsers(): Promise<void> {
  const timestamp = new Date().toISOString();

  const { error } = await supabase
    .from('app_config')
    .update({ value: timestamp })
    .eq('key', 'cache_version');

  if (error) throw error;

  await wipeAllLocalData();
  await saveCacheVersion(timestamp);
}
