import { subscribePostgresChanges } from '../lib/realtimeSync';
import { supabase } from '../lib/supabase';
import {
  getActiveFestivalId,
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

async function requireActiveFestivalId(): Promise<string> {
  const festivalId = await getActiveFestivalId();
  if (!festivalId) {
    throw new Error('ACTIVE_FESTIVAL_REQUIRED');
  }
  return festivalId;
}

async function queuePick(
  userId: string,
  bandId: string,
  festivalId: string,
  action: 'add' | 'remove',
  createdAt: string,
) {
  await enqueueOfflinePick({
    id: offlinePickId(userId, bandId),
    user_id: userId,
    band_id: bandId,
    festival_id: festivalId,
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
          festival_id: op.festival_id,
          created_at: op.created_at,
        });
      }
      return supabase
        .from('user_picks')
        .delete()
        .eq('user_id', op.user_id)
        .eq('band_id', op.band_id)
        .eq('festival_id', op.festival_id);
    },
  },
);

async function toggle(
  userId: string,
  bandId: string,
  currentlyPicked: boolean,
): Promise<void> {
  const festivalId = await requireActiveFestivalId();
  const now = new Date().toISOString();

  if (currentlyPicked) {
    await removeUserPick(userId, bandId);
    if (!navigator.onLine) {
      await queuePick(userId, bandId, festivalId, 'remove', now);
      return;
    }

    const { error } = await supabase
      .from('user_picks')
      .delete()
      .eq('user_id', userId)
      .eq('band_id', bandId)
      .eq('festival_id', festivalId);
    if (error) {
      await queuePick(userId, bandId, festivalId, 'remove', now);
    }
  } else {
    const pick: UserPick = {
      user_id: userId,
      band_id: bandId,
      festival_id: festivalId,
      created_at: now,
    };
    await saveUserPick(pick);
    if (!navigator.onLine) {
      await queuePick(userId, bandId, festivalId, 'add', now);
      return;
    }

    const { error } = await supabase.from('user_picks').upsert(pick);
    if (error) {
      await queuePick(userId, bandId, festivalId, 'add', now);
    }
  }
}

async function syncForUser(userId: string, festivalId?: string): Promise<void> {
  let query = supabase.from('user_picks').select('*').eq('user_id', userId);
  if (festivalId) query = query.eq('festival_id', festivalId);
  const { data, error } = await query;
  if (error || !data) return;

  await replaceUserPicks(data as UserPick[], userId);
}

async function syncCrewFromRemote(festivalId?: string): Promise<void> {
  let query = supabase.from('user_picks').select('*');
  if (festivalId) query = query.eq('festival_id', festivalId);
  const { data, error } = await query;
  if (error || !data) return;

  await replaceUserPicks(data as UserPick[]);
}

async function flushOfflineQueue(festivalId?: string): Promise<number> {
  const activeId = festivalId ?? (await getActiveFestivalId());
  if (!activeId) return 0;
  return pickOfflineQueue.flush({
    include: (op) => op.festival_id === activeId,
  });
}

function subscribeToRealtime(festivalId?: string | null): () => void {
  const festivalFilter = festivalId ? `festival_id=eq.${festivalId}` : undefined;
  return subscribePostgresChanges('pick_counts', [
    {
      filter: { event: 'INSERT', table: 'user_picks', filter: festivalFilter },
      handler: async (payload) => {
        const pick = payload.new as UserPick;
        if (festivalId && pick.festival_id !== festivalId) return;
        await saveUserPick(pick);
      },
    },
    {
      filter: { event: 'DELETE', table: 'user_picks', filter: festivalFilter },
      handler: async (payload) => {
        const pick = payload.old as UserPick;
        if (festivalId && pick.festival_id != null && pick.festival_id !== festivalId) return;
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
