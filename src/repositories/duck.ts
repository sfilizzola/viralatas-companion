import { supabase } from '../lib/supabase';
import {
  enqueueOfflineDuckQuack,
  loadOfflineDuckQuackQueue,
  removeFromOfflineDuckQuackQueue,
} from '../lib/db';
import { createOptimisticQueue } from '../lib/optimisticQueue';
import type { OfflineDuckQuackOp } from '../lib/db';

type DuckQuackRow = {
  id: string;
  user_id: string;
  band_id: string;
  quacked_at: string;
};

const duckOfflineQueue = createOptimisticQueue<OfflineDuckQuackOp>(
  {
    load: loadOfflineDuckQuackQueue,
    remove: removeFromOfflineDuckQuackQueue,
  },
  {
    getId: (op) => op.id,
    dedup: { strategy: 'fifo' },
    syncOne: async (op) =>
      supabase.from('duck_quacks').insert({
        user_id: op.user_id,
        band_id: op.band_id,
        quacked_at: op.quacked_at,
      }),
  },
);

/**
 * Writes a quack to Supabase, or queues it offline.
 * Returns the created row if online, null if queued.
 */
async function quackBand(
  userId: string,
  bandId: string,
): Promise<DuckQuackRow | null> {
  const quackedAt = new Date().toISOString();

  if (!navigator.onLine) {
    await enqueueOfflineDuckQuack({
      id: crypto.randomUUID(),
      user_id: userId,
      band_id: bandId,
      quacked_at: quackedAt,
    });
    return null;
  }

  const { data, error } = await supabase
    .from('duck_quacks')
    .insert({ user_id: userId, band_id: bandId, quacked_at: quackedAt })
    .select()
    .single();

  if (error) {
    await enqueueOfflineDuckQuack({
      id: crypto.randomUUID(),
      user_id: userId,
      band_id: bandId,
      quacked_at: quackedAt,
    });
    return null;
  }

  return data;
}

async function flushOfflineQueue(): Promise<number> {
  return duckOfflineQueue.flush();
}

/** @deprecated Use flushOfflineQueue — kept for callers not yet migrated. */
async function flushOfflineDucks(): Promise<number> {
  return flushOfflineQueue();
}

export const duckRepository = {
  quackBand,
  flushOfflineQueue,
  flushOfflineDucks,
};
