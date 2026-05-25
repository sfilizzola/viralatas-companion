import { supabase } from '../lib/supabase';
import { subscribePostgresChanges } from '../lib/realtimeSync';
import {
  saveMissedBand,
  removeMissedBand,
  loadAllMissedBands,
  replaceUserMissedBands,
  enqueueOfflineMissed,
  loadOfflineMissedQueue,
  removeFromOfflineMissedQueue,
} from '../lib/db';
import { createOptimisticQueue } from '../lib/optimisticQueue';
import type { OfflineMissedOp } from '../lib/db';
import type { UserMissedBand } from '../types';

const missedOfflineQueue = createOptimisticQueue<OfflineMissedOp>(
  {
    load: loadOfflineMissedQueue,
    remove: removeFromOfflineMissedQueue,
  },
  {
    getId: (op) => op.id,
    dedup: { strategy: 'byId' },
    syncOne: async (op) => {
      if (op.action === 'add') {
        return supabase.from('user_missed_bands').upsert({
          user_id: op.user_id,
          band_id: op.band_id,
          marked_at: op.marked_at,
        });
      }
      return supabase
        .from('user_missed_bands')
        .delete()
        .eq('user_id', op.user_id)
        .eq('band_id', op.band_id);
    },
  },
);

async function loadAll(): Promise<UserMissedBand[]> {
  return loadAllMissedBands();
}

async function mark(userId: string, bandId: string): Promise<void> {
  const markedAt = new Date().toISOString();
  const record: UserMissedBand = { user_id: userId, band_id: bandId, marked_at: markedAt };
  await saveMissedBand(record);

  if (!navigator.onLine) {
    await enqueueOfflineMissed({ id: `${userId}|${bandId}`, user_id: userId, band_id: bandId, action: 'add', marked_at: markedAt });
    return;
  }

  const { error } = await supabase.from('user_missed_bands').upsert(record);
  if (error) {
    await enqueueOfflineMissed({ id: `${userId}|${bandId}`, user_id: userId, band_id: bandId, action: 'add', marked_at: markedAt });
  }
}

async function unmark(userId: string, bandId: string): Promise<void> {
  await removeMissedBand(userId, bandId);

  if (!navigator.onLine) {
    await enqueueOfflineMissed({ id: `${userId}|${bandId}`, user_id: userId, band_id: bandId, action: 'remove', marked_at: new Date().toISOString() });
    return;
  }

  const { error } = await supabase
    .from('user_missed_bands')
    .delete()
    .eq('user_id', userId)
    .eq('band_id', bandId);
  if (error) {
    await enqueueOfflineMissed({ id: `${userId}|${bandId}`, user_id: userId, band_id: bandId, action: 'remove', marked_at: new Date().toISOString() });
  }
}

async function flushOfflineQueue(): Promise<number> {
  return missedOfflineQueue.flush();
}

async function syncFromRemote(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('user_missed_bands')
    .select('*')
    .eq('user_id', userId);
  if (error || !data) return;

  await replaceUserMissedBands(data as UserMissedBand[], userId);
}

async function sync(userId: string): Promise<void> {
  await flushOfflineQueue();
  await syncFromRemote(userId);
}

function subscribeToRealtime(): () => void {
  return subscribePostgresChanges('missed_bands', [
    {
      filter: { event: 'INSERT', table: 'user_missed_bands' },
      handler: async (payload) => {
        await saveMissedBand(payload.new as UserMissedBand);
      },
    },
    {
      filter: { event: 'DELETE', table: 'user_missed_bands' },
      handler: async (payload) => {
        const old = payload.old as Partial<UserMissedBand>;
        if (old.user_id && old.band_id) {
          await removeMissedBand(old.user_id, old.band_id);
        }
      },
    },
  ]);
}

export const missedRepository = {
  loadAll,
  mark,
  unmark,
  sync,
  syncFromRemote,
  flushOfflineQueue,
  subscribeToRealtime,
};
