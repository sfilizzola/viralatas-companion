import type { MetalPlaceConfig, UserPresence } from '../types';
import {
  enqueueOfflinePresence,
  loadOfflinePresenceQueue,
  removeFromOfflinePresenceQueue,
  replaceUserPresence,
  saveMetalPlaceConfig,
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

// --- Metal Place ---

export async function saveMetalPlaceConfigRemote(config: MetalPlaceConfig): Promise<void> {
  if (!navigator.onLine) {
    await saveMetalPlaceConfig(config);
    return;
  }

  const { error } = await supabase.from('metal_place_config').upsert(config);
  if (error) {
    console.error('Failed to save Metal Place config remotely:', error);
    throw error;
  }

  await saveMetalPlaceConfig(config);
}

export async function setMetalPlaceStatus(userId: string, isAtMetalPlace: boolean): Promise<void> {
  const presence: UserPresence = {
    user_id: userId,
    is_camping: false,
    is_at_metal_place: isAtMetalPlace,
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

export async function syncMetalPlaceConfig(): Promise<void> {
  const { data, error } = await supabase.from('metal_place_config').select('*').single();
  if (error || !data) return;

  await saveMetalPlaceConfig(data as MetalPlaceConfig);
}
