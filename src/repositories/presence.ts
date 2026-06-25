import type { MetalPlaceConfig, MetalPlaceWindow, UserPresence } from '../types';
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
import { sortMetalPlaceWindows } from '../services/metalPlaceValidation';

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

function prepareWindowsForSave(windows: MetalPlaceWindow[]): MetalPlaceWindow[] {
  return sortMetalPlaceWindows(windows).map((window, index) => ({
    ...window,
    id: window.id || crypto.randomUUID(),
    sort_order: index,
  }));
}

async function saveMetalPlaceConfigRemote(config: MetalPlaceConfig): Promise<void> {
  if (!navigator.onLine) {
    await saveMetalPlaceConfig(config);
    return;
  }

  const windows = prepareWindowsForSave(config.windows);
  const payloadIds = windows.map((window) => window.id);
  const updatedAt = config.updated_at ?? new Date().toISOString();

  const { error: metaError } = await supabase.from('metal_place_config').upsert({
    id: 1,
    label: config.label,
    updated_by: config.updated_by,
    updated_at: updatedAt,
  });
  if (metaError) {
    console.error('Failed to save Metal Place config metadata:', metaError);
    throw metaError;
  }

  if (windows.length > 0) {
    const windowRows = windows.map((window) => ({
      id: window.id,
      festival_day: window.festival_day,
      start_time: window.start_time,
      end_time: window.end_time,
      sort_order: window.sort_order ?? 0,
      updated_at: window.updated_at ?? updatedAt,
    }));

    const { error: windowsError } = await supabase.from('metal_place_windows').upsert(windowRows);
    if (windowsError) {
      console.error('Failed to save Metal Place windows:', windowsError);
      throw windowsError;
    }
  }

  const { data: existingWindows, error: fetchError } = await supabase
    .from('metal_place_windows')
    .select('id');
  if (fetchError) {
    console.error('Failed to fetch Metal Place windows for cleanup:', fetchError);
    throw fetchError;
  }

  const idsToDelete = (existingWindows ?? [])
    .map((row) => row.id)
    .filter((id) => !payloadIds.includes(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('metal_place_windows')
      .delete()
      .in('id', idsToDelete);
    if (deleteError) {
      console.error('Failed to delete stale Metal Place windows:', deleteError);
      throw deleteError;
    }
  }

  await syncMetalPlaceConfig();
}

async function syncMetalPlaceConfig(): Promise<void> {
  const { data: meta, error: metaError } = await supabase
    .from('metal_place_config')
    .select('id, label, updated_by, updated_at')
    .eq('id', 1)
    .single();
  if (metaError || !meta) return;

  const { data: windows, error: windowsError } = await supabase
    .from('metal_place_windows')
    .select('id, festival_day, start_time, end_time, sort_order, created_at, updated_at')
    .order('festival_day')
    .order('start_time');
  if (windowsError) return;

  const config: MetalPlaceConfig = {
    id: meta.id,
    label: meta.label ?? undefined,
    updated_by: meta.updated_by ?? undefined,
    updated_at: meta.updated_at ?? undefined,
    windows: (windows ?? []).map((window) => ({
      id: window.id,
      festival_day: window.festival_day,
      start_time: window.start_time,
      end_time: window.end_time,
      sort_order: window.sort_order,
      created_at: window.created_at,
      updated_at: window.updated_at,
    })),
  };

  await saveMetalPlaceConfig(config);
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
  const handler = async () => {
    await syncMetalPlaceConfig();
  };

  return subscribePostgresChanges('metal_place_config_live', [
    { filter: { event: '*', table: 'metal_place_config' }, handler },
    { filter: { event: '*', table: 'metal_place_windows' }, handler },
  ]);
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
