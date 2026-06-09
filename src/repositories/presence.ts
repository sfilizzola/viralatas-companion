import type { MetalPlaceConfig, UserPresence } from '../types';
import {
  enqueueOfflinePresence,
  loadOfflinePresenceQueue,
  loadUserPresence,
  removeFromOfflinePresenceQueue,
  replaceUserPresence,
  saveMetalPlaceConfig,
  saveUserPresence,
} from '../lib/db';
import { createOptimisticQueue } from '../lib/optimisticQueue';
import type { OfflinePresenceOp } from '../lib/db';
import { subscribePostgresChanges } from '../lib/realtimeSync';
import { supabase } from '../lib/supabase';

function presenceOpId(userId: string) {
  const unique = crypto.randomUUID?.() ?? `${Date.now()}:${Math.random()}`;
  return `${userId}:presence:${unique}`;
}

const presenceOfflineQueue = createOptimisticQueue<OfflinePresenceOp>(
  {
    load: loadOfflinePresenceQueue,
    remove: removeFromOfflinePresenceQueue,
  },
  {
    getId: (op) => op.id,
    dedup: {
      strategy: 'keepLast',
      groupKey: (op) => op.user_id,
      sortKey: (op) => op.updated_at,
    },
    syncOne: async (op) => {
      const presence: UserPresence = {
        user_id: op.user_id,
        is_camping: op.is_camping,
        is_at_metal_place: op.is_at_metal_place ?? false,
        updated_at: op.updated_at,
      };
      return supabase.from('user_presence').upsert(presence);
    },
  },
);

async function incrementLocationVisit(location: 'camping' | 'metal_place'): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  const currentVisits = (data.user.user_metadata?.location_visits as Record<string, number>) ?? {};
  const newCount = (currentVisits[location] ?? 0) + 1;

  supabase.auth.updateUser({
    data: {
      location_visits: { ...currentVisits, [location]: newCount },
    },
  }).catch(() => {});
}

async function queuePresence(presence: UserPresence) {
  await enqueueOfflinePresence({ ...presence, id: presenceOpId(presence.user_id) });
}

async function setCampingStatus(
  userId: string,
  isCamping: boolean,
): Promise<{ entered: boolean }> {
  const existing = await loadUserPresence(userId);
  const entered = isCamping && !existing?.is_camping;

  const presence: UserPresence = {
    user_id: userId,
    is_camping: isCamping,
    is_at_metal_place: isCamping ? false : existing?.is_at_metal_place ?? false,
    updated_at: new Date().toISOString(),
  };

  await saveUserPresence(presence);

  if (!navigator.onLine) {
    await queuePresence(presence);
    return { entered };
  }

  const { error } = await supabase.from('user_presence').upsert(presence);
  if (error) {
    await queuePresence(presence);
  }

  return { entered };
}

async function setMetalPlaceStatus(
  userId: string,
  isAtMetalPlace: boolean,
): Promise<{ entered: boolean }> {
  const existing = await loadUserPresence(userId);
  const entered = isAtMetalPlace && !existing?.is_at_metal_place;

  const presence: UserPresence = {
    user_id: userId,
    is_camping: isAtMetalPlace ? false : existing?.is_camping ?? false,
    is_at_metal_place: isAtMetalPlace,
    updated_at: new Date().toISOString(),
  };

  await saveUserPresence(presence);

  if (!navigator.onLine) {
    await queuePresence(presence);
    return { entered };
  }

  const { error } = await supabase.from('user_presence').upsert(presence);
  if (error) {
    await queuePresence(presence);
  }

  return { entered };
}

async function syncCrewFromRemote(): Promise<void> {
  const { data, error } = await supabase.from('user_presence').select('*');
  if (error || !data) return;

  await replaceUserPresence(data as UserPresence[]);
}

async function flushOfflineQueue(): Promise<number> {
  return presenceOfflineQueue.flush();
}

async function saveMetalPlaceConfigRemote(config: MetalPlaceConfig): Promise<void> {
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

async function syncMetalPlaceConfig(): Promise<void> {
  const { data, error } = await supabase.from('metal_place_config').select('*').single();
  if (error || !data) return;

  await saveMetalPlaceConfig(data as MetalPlaceConfig);
}

function subscribeToRealtime(): () => void {
  return subscribePostgresChanges('user_presence_live', {
    filter: { event: '*', table: 'user_presence' },
    handler: async (payload) => {
      const nextPresence = (payload.new ?? payload.old) as UserPresence | undefined;
      if (nextPresence) await saveUserPresence(nextPresence);
    },
  });
}

function subscribeToMetalPlaceConfigRealtime(): () => void {
  return subscribePostgresChanges('metal_place_config_live', {
    filter: { event: '*', table: 'metal_place_config' },
    handler: async (payload) => {
      const next = (payload.new ?? payload.old) as MetalPlaceConfig | undefined;
      if (next) await saveMetalPlaceConfig(next);
    },
  });
}

export const presenceRepository = {
  setCampingStatus,
  setMetalPlaceStatus,
  incrementLocationVisit,
  syncCrewFromRemote,
  flushOfflineQueue,
  saveMetalPlaceConfigRemote,
  syncMetalPlaceConfig,
  subscribeToRealtime,
  subscribeToMetalPlaceConfigRealtime,
};
