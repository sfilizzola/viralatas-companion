import { supabase } from '../lib/supabase';
import {
  clearActiveFestivalPack,
  getActiveFestivalCacheVersion,
  getActiveFestivalId,
  saveBands,
  setActiveFestivalCacheVersion,
} from '../lib/db';
import { shouldInvalidatePack } from '../lib/festivalCacheVersion';
import type { Band } from '../types';

export const bandsRepository = {
  async sync(festivalId?: string): Promise<void> {
    let query = supabase.from('bands').select('*');
    if (festivalId) query = query.eq('festival_id', festivalId);
    const { data, error } = await query.order('start_time');

    if (error) throw error;
    if (data && data.length > 0) await saveBands(data as unknown as Band[]);
  },

  /**
   * Compares Active Festival `festivals.cache_version` to the local pack marker.
   * On mismatch: clears only the Active Festival pack (not forever data like badge
   * history) and reloads that festival's offline pack.
   */
  async checkAndApplyCacheVersion(userId?: string): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const festivalId = await getActiveFestivalId();
      if (!festivalId) return;

      const { data: festival, error } = await supabase
        .from('festivals')
        .select('id, cache_version')
        .eq('id', festivalId)
        .maybeSingle();

      if (error) throw error;
      if (!festival) return;

      const localVersion = await getActiveFestivalCacheVersion();
      const remote = {
        id: festival.id as string,
        cache_version: festival.cache_version as string,
      };

      if (
        !shouldInvalidatePack(festivalId, { [festivalId]: localVersion }, [remote])
      ) {
        if (localVersion == null) {
          await setActiveFestivalCacheVersion(remote.cache_version);
        }
        return;
      }

      const { festivalsRepository } = await import('./festivals');
      await festivalsRepository.syncCatalog();
      await clearActiveFestivalPack();
      await setActiveFestivalCacheVersion(remote.cache_version);

      if (userId) {
        await festivalsRepository.loadActivePack(userId, festivalId);
      }
    } catch (error) {
      console.error('Cache version check failed:', error);
    }
  },

  /** Bumps Active Festival cache_version so clients reload that festival's pack. */
  async invalidateCacheForAllUsers(): Promise<void> {
    const timestamp = new Date().toISOString();
    const festivalId = await getActiveFestivalId();

    if (!festivalId) {
      throw new Error('No active festival — cannot invalidate cache');
    }

    const { error } = await supabase
      .from('festivals')
      .update({ cache_version: timestamp })
      .eq('id', festivalId);

    if (error) throw error;

    await clearActiveFestivalPack();
    await setActiveFestivalCacheVersion(timestamp);
  },
};
