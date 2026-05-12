import { supabase } from '../lib/supabase';
import {
  saveUserPick,
  removeUserPick,
  replaceUserPicks,
  enqueueOfflinePick,
  loadOfflineQueue,
  removeFromOfflineQueue,
  type OfflinePickOp,
} from '../lib/db';
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

export function deduplicatePickQueue(ops: OfflinePickOp[]): OfflinePickOp[] {
  const sorted = [...ops].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const lastByKey = new Map<string, OfflinePickOp>();
  for (const op of sorted) {
    lastByKey.set(`${op.user_id}:${op.band_id}`, op);
  }
  return Array.from(lastByKey.values());
}

async function flushOfflineQueue(): Promise<number> {
  const queue = await loadOfflineQueue();
  if (queue.length === 0) return 0;

  const deduped = deduplicatePickQueue(queue);
  const keyToAll = new Map<string, OfflinePickOp[]>();
  for (const op of queue) {
    const key = `${op.user_id}:${op.band_id}`;
    const list = keyToAll.get(key);
    if (list) {
      list.push(op);
    } else {
      keyToAll.set(key, [op]);
    }
  }

  let flushed = 0;
  for (const last of deduped) {
    const key = `${last.user_id}:${last.band_id}`;
    const all = keyToAll.get(key) ?? [last];

    const { error } =
      last.action === 'add'
        ? await supabase.from('user_picks').upsert({
            user_id: last.user_id,
            band_id: last.band_id,
            created_at: last.created_at,
          })
        : await supabase
            .from('user_picks')
            .delete()
            .eq('user_id', last.user_id)
            .eq('band_id', last.band_id);

    if (!error) {
      await Promise.all(all.map((op) => removeFromOfflineQueue(op.id)));
      flushed += all.length;
    }
  }
  return flushed;
}

export const picksRepository = {
  toggle,
  syncForUser,
  syncCrewFromRemote,
  flushOfflineQueue,
};
