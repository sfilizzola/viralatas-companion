import { supabase } from '../lib/supabase';
import {
  getActiveFestivalId,
  loadCacheVersion,
  saveCacheVersion,
  wipeAllLocalData,
  saveBands,
} from '../lib/db';
import type { Band } from '../types';
import { picksRepository } from './picks';
import { usersRepository } from './users';
import { presenceRepository } from './presence';
import { announcementsRepository } from './announcements';

export const bandsRepository = {
  async sync(festivalId?: string): Promise<void> {
    let query = supabase.from('bands').select('*');
    if (festivalId) query = query.eq('festival_id', festivalId);
    const { data, error } = await query.order('start_time');

    if (error) throw error;
    if (data && data.length > 0) await saveBands(data as unknown as Band[]);
  },

  async checkAndApplyCacheVersion(): Promise<void> {
    if (!navigator.onLine) return;

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

        const festivalId = (await getActiveFestivalId()) ?? undefined;
        await Promise.all([
          bandsRepository.sync(festivalId),
          picksRepository.syncCrewFromRemote(festivalId),
          usersRepository.syncCrew(festivalId),
          presenceRepository.syncCrewFromRemote(),
          announcementsRepository.sync(festivalId),
        ]);
      }
    } catch (error) {
      console.error('Cache version check failed:', error);
    }
  },

  async invalidateCacheForAllUsers(): Promise<void> {
    const timestamp = new Date().toISOString();

    const { error } = await supabase
      .from('app_config')
      .update({ value: timestamp })
      .eq('key', 'cache_version');

    if (error) throw error;

    await wipeAllLocalData();
    await saveCacheVersion(timestamp);
  },
};
