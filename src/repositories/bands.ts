import { supabase } from '../lib/supabase';
import { loadCacheVersion, saveCacheVersion, wipeAllLocalData } from '../lib/db';
import { syncBands } from '../lib/sync';
import { picksRepository } from './picks';
import { usersRepository } from './users';
import { presenceRepository } from './presence';
import { announcementsRepository } from './announcements';

async function checkAndApplyCacheVersion(): Promise<void> {
  try {
    const { data } = await supabase
      .from('app_config')
      .select('*')
      .eq('key', 'cache_version')
      .single();

    if (!data) return;

    const remoteVersion = data.value;
    const localVersion = await loadCacheVersion();

    if (remoteVersion !== localVersion) {
      await wipeAllLocalData();
      await saveCacheVersion(remoteVersion);

      await Promise.all([
        syncBands(),
        picksRepository.syncCrewFromRemote(),
        usersRepository.syncCrew(),
        presenceRepository.syncCrewFromRemote(),
        announcementsRepository.sync(),
      ]);
    }
  } catch (error) {
    console.error('Cache version check failed:', error);
  }
}

async function invalidateCacheForAllUsers(): Promise<void> {
  const timestamp = new Date().toISOString();

  const { error } = await supabase
    .from('app_config')
    .update({ value: timestamp })
    .eq('key', 'cache_version');

  if (error) throw error;

  await wipeAllLocalData();
  await saveCacheVersion(timestamp);
}

export const bandsRepository = {
  checkAndApplyCacheVersion,
  invalidateCacheForAllUsers,
};
