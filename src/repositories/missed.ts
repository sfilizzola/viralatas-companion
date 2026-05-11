import { supabase } from '../lib/supabase';
import {
  saveMissedBand,
  removeMissedBand,
  loadAllMissedBands,
  replaceUserMissedBands,
  enqueueOfflineMissed,
  loadOfflineMissedQueue,
  removeFromOfflineMissedQueue,
} from '../lib/db';
import type { UserMissedBand } from '../types';

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

async function flushOfflineQueue(): Promise<void> {
  const queue = await loadOfflineMissedQueue();
  if (queue.length === 0) return;

  const groups = new Map<string, (typeof queue)[0]>();
  for (const op of queue) {
    groups.set(op.id, op);
  }

  for (const op of groups.values()) {
    const { error } =
      op.action === 'add'
        ? await supabase
            .from('user_missed_bands')
            .upsert({ user_id: op.user_id, band_id: op.band_id, marked_at: op.marked_at })
        : await supabase
            .from('user_missed_bands')
            .delete()
            .eq('user_id', op.user_id)
            .eq('band_id', op.band_id);

    if (!error) {
      await removeFromOfflineMissedQueue(op.id);
    }
  }
}

async function sync(userId: string): Promise<void> {
  await flushOfflineQueue();

  const { data, error } = await supabase
    .from('user_missed_bands')
    .select('*')
    .eq('user_id', userId);
  if (error || !data) return;

  await replaceUserMissedBands(data as UserMissedBand[], userId);
}

function subscribeToRealtime(): () => void {
  const channel = supabase
    .channel('missed_bands')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'user_missed_bands' },
      async (payload) => {
        await saveMissedBand(payload.new as UserMissedBand);
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'user_missed_bands' },
      async (payload) => {
        const old = payload.old as Partial<UserMissedBand>;
        if (old.user_id && old.band_id) {
          await removeMissedBand(old.user_id, old.band_id);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export const missedRepository = {
  loadAll,
  mark,
  unmark,
  sync,
  flushOfflineQueue,
  subscribeToRealtime,
};
