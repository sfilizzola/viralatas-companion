import { supabase } from '../lib/supabase';
import { subscribePostgresChanges } from '../lib/realtimeSync';
import {
  saveBandRating,
  removeBandRating,
  loadAllBandRatings,
  loadBandRatings,
  replaceAllBandRatings,
  enqueueOfflineBandRating,
  loadOfflineBandRatingsQueue,
  removeFromOfflineBandRatingsQueue,
} from '../lib/db';
import { createOptimisticQueue } from '../lib/optimisticQueue';
import type { OfflineBandRatingOp } from '../lib/db';
import type { BandRatingScore, UserBandRating } from '../types';

const ratingsOfflineQueue = createOptimisticQueue<OfflineBandRatingOp>(
  {
    load: loadOfflineBandRatingsQueue,
    remove: removeFromOfflineBandRatingsQueue,
  },
  {
    getId: (op) => op.id,
    dedup: { strategy: 'byId' },
    syncOne: async (op) => {
      if (op.action === 'upsert') {
        return supabase.from('user_band_ratings').upsert({
          user_id: op.user_id,
          band_id: op.band_id,
          score: op.score,
          rated_at: op.rated_at,
        });
      }
      return supabase
        .from('user_band_ratings')
        .delete()
        .eq('user_id', op.user_id)
        .eq('band_id', op.band_id);
    },
  },
);

async function loadAll(): Promise<UserBandRating[]> {
  return loadAllBandRatings();
}

async function setRating(userId: string, bandId: string, score: BandRatingScore): Promise<void> {
  const ratedAt = new Date().toISOString();
  const record: UserBandRating = { user_id: userId, band_id: bandId, score, rated_at: ratedAt };
  await saveBandRating(record);

  if (!navigator.onLine) {
    await enqueueOfflineBandRating({
      id: `${userId}|${bandId}`,
      user_id: userId,
      band_id: bandId,
      action: 'upsert',
      score,
      rated_at: ratedAt,
    });
    return;
  }

  const { error } = await supabase.from('user_band_ratings').upsert(record);
  if (error) {
    await enqueueOfflineBandRating({
      id: `${userId}|${bandId}`,
      user_id: userId,
      band_id: bandId,
      action: 'upsert',
      score,
      rated_at: ratedAt,
    });
  }
}

async function clearRating(userId: string, bandId: string): Promise<void> {
  await removeBandRating(userId, bandId);

  if (!navigator.onLine) {
    await enqueueOfflineBandRating({
      id: `${userId}|${bandId}`,
      user_id: userId,
      band_id: bandId,
      action: 'remove',
      rated_at: new Date().toISOString(),
    });
    return;
  }

  const { error } = await supabase
    .from('user_band_ratings')
    .delete()
    .eq('user_id', userId)
    .eq('band_id', bandId);
  if (error) {
    await enqueueOfflineBandRating({
      id: `${userId}|${bandId}`,
      user_id: userId,
      band_id: bandId,
      action: 'remove',
      rated_at: new Date().toISOString(),
    });
  }
}

async function toggleRating(userId: string, bandId: string, score: BandRatingScore): Promise<void> {
  const existing = (await loadBandRatings(userId)).find((r) => r.band_id === bandId);
  if (existing?.score === score) {
    await clearRating(userId, bandId);
  } else {
    await setRating(userId, bandId, score);
  }
}

async function flushOfflineQueue(): Promise<number> {
  return ratingsOfflineQueue.flush();
}

async function syncCrewFromRemote(): Promise<void> {
  const { data, error } = await supabase.from('user_band_ratings').select('*');
  if (error || !data) return;

  await replaceAllBandRatings(data as UserBandRating[]);
}

function subscribeToRealtime(): () => void {
  return subscribePostgresChanges('band_ratings', [
    {
      filter: { event: 'INSERT', table: 'user_band_ratings' },
      handler: async (payload) => {
        await saveBandRating(payload.new as UserBandRating);
      },
    },
    {
      filter: { event: 'UPDATE', table: 'user_band_ratings' },
      handler: async (payload) => {
        await saveBandRating(payload.new as UserBandRating);
      },
    },
    {
      filter: { event: 'DELETE', table: 'user_band_ratings' },
      handler: async (payload) => {
        const old = payload.old as Partial<UserBandRating>;
        if (old.user_id && old.band_id) {
          await removeBandRating(old.user_id, old.band_id);
        }
      },
    },
  ]);
}

export const ratingsRepository = {
  loadAll,
  setRating,
  clearRating,
  toggleRating,
  syncCrewFromRemote,
  flushOfflineQueue,
  subscribeToRealtime,
};
