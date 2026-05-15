import { supabase } from '../lib/supabase';
import {
  enqueueOfflineDuckQuack,
  loadOfflineDuckQuackQueue,
  removeFromOfflineDuckQuackQueue,
} from '../lib/db';

type DuckQuackRow = {
  id: string;
  user_id: string;
  band_id: string;
  quacked_at: string;
};

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

/**
 * Flushes all offline duck quacks queued during offline periods.
 * Returns the number of successfully flushed quacks.
 */
async function flushOfflineDucks(): Promise<number> {
  const queue = await loadOfflineDuckQuackQueue();
  if (queue.length === 0) return 0;

  let flushed = 0;
  for (const op of queue) {
    const { error } = await supabase.from('duck_quacks').insert({
      user_id: op.user_id,
      band_id: op.band_id,
      quacked_at: op.quacked_at,
    });

    if (!error) {
      await removeFromOfflineDuckQuackQueue(op.id);
      flushed++;
    }
  }

  return flushed;
}

export const duckRepository = {
  quackBand,
  flushOfflineDucks,
};
