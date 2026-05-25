import { subscribePostgresChanges } from '../lib/realtimeSync';
import { supabase } from '../lib/supabase';
import {
  saveUserPick,
  removeUserPick,
  replaceUserPicks,
  enqueueOfflinePick,
  loadOfflineQueue,
  removeFromOfflineQueue,
} from '../lib/db';
import { createOptimisticQueue } from '../lib/optimisticQueue';
import type { OfflinePickOp } from '../lib/db';
import type { UserPick } from '../types';

function offlinePickId(userId: string, bandId: string) {
  const unique = crypto.randomUUID?.() ?? `${Date.now()}:${Math.random()}`;
  return `${userId}:${bandId}:${unique}`;
}

async function queuePick(
  userId: string,
  bandId: string,
  action: 'add' | 'remove',
  createdAt: string,
) {
  await enqueueOfflinePick({
    id: offlinePickId(userId, bandId),
    user_id: userId,
    band_id: bandId,
    action,
    created_at: createdAt,
  });
}

const pickOfflineQueue = createOptimisticQueue<OfflinePickOp>(
  {
    load: loadOfflineQueue,
    remove: removeFromOfflineQueue,
  },
  {
    getId: (op) => op.id,
    dedup: {
      strategy: 'keepLast',
      groupKey: (op) => `${op.user_id}:${op.band_id}`,
      sortKey: (op) => op.created_at,
    },
    syncOne: async (op) => {
      if (op.action === 'add') {
        return supabase.from('user_picks').upsert({
          user_id: op.user_id,
          band_id: op.band_id,
          created_at: op.created_at,
        });
      }
      return supabase
        .from('user_picks')
        .delete()
        .eq('user_id', op.user_id)
        .eq('band_id', op.band_id);
    },
  },
);

async function toggle(
  userId: string,
  bandId: string,
  currentlyPicked: boolean,
): Promise<void> {
  const now = new Date().toISOString();

  if (currentlyPicked) {
    await removeUserPick(userId, bandId);
    if (!navigator.onLine) {
      await queuePick(userId, bandId, 'remove', now);
      return;
    }

    const { error } = await supabase
      .from('user_picks')
      .delete()
      .eq('user_id', userId)
      .eq('band_id', bandId);
    if (error) {
      await queuePick(userId, bandId, 'remove', now);
    }
  } else {
    const pick: UserPick = { user_id: userId, band_id: bandId, created_at: now };
    await saveUserPick(pick);
    if (!navigator.onLine) {
      await queuePick(userId, bandId, 'add', now);
      return;
    }

    const { error } = await supabase.from('user_picks').upsert(pick);
    if (error) {
      await queuePick(userId, bandId, 'add', now);
    }
  }
}

async function syncForUser(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('user_picks')
    .select('*')
    .eq('user_id', userId);
  if (error || !data) return;

  await replaceUserPicks(data as UserPick[], userId);
}

async function syncCrewFromRemote(): Promise<void> {
  const { data, error } = await supabase.from('user_picks').select('*');
  if (error || !data) return;

  await replaceUserPicks(data as UserPick[]);
}

async function flushOfflineQueue(): Promise<number> {
  return pickOfflineQueue.flush();
}

function subscribeToRealtime(): () => void {
  return subscribePostgresChanges('pick_counts', [
    {
      filter: { event: 'INSERT', table: 'user_picks' },
      handler: async (payload) => {
        await saveUserPick(payload.new as UserPick);
      },
    },
    {
      filter: { event: 'DELETE', table: 'user_picks' },
      handler: async (payload) => {
        const pick = payload.old as UserPick;
        await removeUserPick(pick.user_id, pick.band_id);
      },
    },
  ]);
}

export const picksRepository = {
  toggle,
  syncForUser,
  syncCrewFromRemote,
  flushOfflineQueue,
  subscribeToRealtime,
};
