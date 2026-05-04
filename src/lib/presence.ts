import type { UserPresence } from '../types';
import {
  enqueueOfflinePresence,
  loadOfflinePresenceQueue,
  removeFromOfflinePresenceQueue,
  replaceUserPresence,
  saveUserPresence,
} from './db';
import { supabase } from './supabase';

function presenceOpId(userId: string) {
  const unique = crypto.randomUUID?.() ?? `${Date.now()}:${Math.random()}`;
  return `${userId}:presence:${unique}`;
}

async function queuePresence(presence: UserPresence) {
  await enqueueOfflinePresence({ ...presence, id: presenceOpId(presence.user_id) });
}

export async function setCampingStatus(userId: string, isCamping: boolean): Promise<void> {
  const presence: UserPresence = {
    user_id: userId,
    is_camping: isCamping,
    updated_at: new Date().toISOString(),
  };

  await saveUserPresence(presence);

  if (!navigator.onLine) {
    await queuePresence(presence);
    return;
  }

  const { error } = await supabase.from('user_presence').upsert(presence);
  if (error) {
    await queuePresence(presence);
  }
}

export async function syncCrewPresence(): Promise<void> {
  const { data, error } = await supabase.from('user_presence').select('*');
  if (error || !data) return;

  await replaceUserPresence(data as UserPresence[]);
}

export async function flushPresenceQueue(): Promise<void> {
  const queue = (await loadOfflinePresenceQueue()).sort((a, b) =>
    a.updated_at.localeCompare(b.updated_at),
  );
  if (queue.length === 0) return;

  const latestByUser = new Map<string, { allIds: string[]; presence: UserPresence }>();
  for (const item of queue) {
    const existing = latestByUser.get(item.user_id);
    const presence = {
      user_id: item.user_id,
      is_camping: item.is_camping,
      updated_at: item.updated_at,
    };

    if (existing) {
      existing.allIds.push(item.id);
      existing.presence = presence;
    } else {
      latestByUser.set(item.user_id, { allIds: [item.id], presence });
    }
  }

  for (const { allIds, presence } of latestByUser.values()) {
    const { error } = await supabase.from('user_presence').upsert(presence);
    if (!error) {
      await Promise.all(allIds.map((id) => removeFromOfflinePresenceQueue(id)));
    }
  }
}
