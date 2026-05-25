import type { LivePlanStatus, PresenceLocation } from '../services/livePreview';
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
import { getFestivalDay, now } from '../services/time';

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

async function setCampingStatus(userId: string, isCamping: boolean): Promise<void> {
  const existing = await loadUserPresence(userId);
  const wasNotCamping = !existing?.is_camping;
  const isEnteringCamping = isCamping && wasNotCamping;

  const presence: UserPresence = {
    user_id: userId,
    is_camping: isCamping,
    is_at_metal_place: isCamping ? false : existing?.is_at_metal_place ?? false,
    updated_at: new Date().toISOString(),
  };

  await saveUserPresence(presence);

  if (isEnteringCamping) {
    await incrementLocationVisit('camping');
  }

  if (!navigator.onLine) {
    await queuePresence(presence);
    return;
  }

  const { error } = await supabase.from('user_presence').upsert(presence);
  if (error) {
    await queuePresence(presence);
  }
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

async function setMetalPlaceStatus(userId: string, isAtMetalPlace: boolean): Promise<void> {
  const existing = await loadUserPresence(userId);
  const wasNotAtMetalPlace = !existing?.is_at_metal_place;
  const isEnteringMetalPlace = isAtMetalPlace && wasNotAtMetalPlace;

  const presence: UserPresence = {
    user_id: userId,
    is_camping: isAtMetalPlace ? false : existing?.is_camping ?? false,
    is_at_metal_place: isAtMetalPlace,
    updated_at: new Date().toISOString(),
  };

  await saveUserPresence(presence);

  if (isEnteringMetalPlace) {
    await incrementLocationVisit('metal_place');
  }

  if (!navigator.onLine) {
    await queuePresence(presence);
    return;
  }

  const { error } = await supabase.from('user_presence').upsert(presence);
  if (error) {
    await queuePresence(presence);
  }
}

async function syncMetalPlaceConfig(): Promise<void> {
  const { data, error } = await supabase.from('metal_place_config').select('*').single();
  if (error || !data) return;

  await saveMetalPlaceConfig(data as MetalPlaceConfig);
}

function isTimeWithinMetalPlaceWindow(config: MetalPlaceConfig | null, nowDate: Date): boolean {
  if (!config || !config.start_time || !config.end_time) {
    return false;
  }

  const isTestMode = config.test_override_day !== null && config.test_override_day !== undefined;

  if (!isTestMode) {
    if (config.festival_day === null || config.festival_day === undefined) {
      return false;
    }
    const currentFestivalDay = getFestivalDay(nowDate);
    if (currentFestivalDay !== config.festival_day) {
      return false;
    }
  }

  const [startHour, startMin] = config.start_time.split(':').map(Number);
  const [endHour, endMin] = config.end_time.split(':').map(Number);

  const wallClock = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Berlin',
  }).format(nowDate);
  const [nowHourStr, nowMinStr] = wallClock.split(':');
  const nowTotalMinutes = parseInt(nowHourStr, 10) * 60 + parseInt(nowMinStr, 10);

  const startTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = endHour * 60 + endMin;

  return nowTotalMinutes >= startTotalMinutes && nowTotalMinutes < endTotalMinutes;
}

async function autoCheckoutAllUsers(): Promise<void> {
  try {
    const { data, error } = await supabase.from('user_presence').select('*');
    if (error || !data) return;

    const usersAtMetalPlace = (data as UserPresence[]).filter((p) => p.is_at_metal_place);

    for (const presence of usersAtMetalPlace) {
      try {
        await setMetalPlaceStatus(presence.user_id, false);
      } catch (err) {
        if (err instanceof Error && err.name !== 'InvalidStateError') {
          console.error(`Failed to checkout user ${presence.user_id}:`, err);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'InvalidStateError') {
      console.debug('[Metal Place] Auto-checkout skipped due to DB connection closing');
      return;
    }
    throw error;
  }
}

export type PresenceToggleContext = {
  myRawPlanStatus: LivePlanStatus;
  isAtMetalPlace: boolean;
  isCamping: boolean;
};

async function applyPresenceToggle(
  userId: string,
  nextValue: PresenceLocation,
  context: PresenceToggleContext,
): Promise<void> {
  if (nextValue === 'camping') {
    if (context.myRawPlanStatus === 'current') {
      await setCampingStatus(userId, false);
      return;
    }
    await setCampingStatus(userId, true);
    return;
  }
  if (nextValue === 'metal_place') {
    await setMetalPlaceStatus(userId, true);
    return;
  }
  if (context.isAtMetalPlace) await setMetalPlaceStatus(userId, false);
  if (context.isCamping) await setCampingStatus(userId, false);
}

async function autoClearCampingOnCurrentBand(
  userId: string,
  isCamping: boolean,
  myRawPlanStatus: LivePlanStatus,
): Promise<void> {
  if (!isCamping || myRawPlanStatus !== 'current') return;
  await setCampingStatus(userId, false);
}

async function validateAndAutoCheckout(
  config: MetalPlaceConfig | null,
  userId: string | null,
): Promise<void> {
  if (!userId || !config) return;

  const hasDay = config.festival_day != null || config.test_override_day != null;
  if (!hasDay || !config.start_time || !config.end_time) return;

  if (isTimeWithinMetalPlaceWindow(config, now())) return;

  try {
    const presence = await loadUserPresence(userId);
    if (presence?.is_at_metal_place) {
      await setMetalPlaceStatus(userId, false);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'InvalidStateError') {
      console.debug('[Metal Place] Skipping auto-checkout due to DB connection closing', error);
      return;
    }
    throw error;
  }
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
  applyPresenceToggle,
  autoClearCampingOnCurrentBand,
  syncCrewFromRemote,
  flushOfflineQueue,
  saveMetalPlaceConfigRemote,
  syncMetalPlaceConfig,
  isTimeWithinMetalPlaceWindow,
  autoCheckoutAllUsers,
  validateAndAutoCheckout,
  subscribeToRealtime,
  subscribeToMetalPlaceConfigRealtime,
};
