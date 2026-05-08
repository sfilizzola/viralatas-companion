import type { MetalPlaceConfig, UserPresence } from '../types';
import {
  enqueueOfflinePresence,
  loadOfflinePresenceQueue,
  loadUserPresence,
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
  // Mutual exclusion with Metal Place: enabling camping clears Metal Place attendance.
  const presence: UserPresence = {
    user_id: userId,
    is_camping: isCamping,
    is_at_metal_place: isCamping ? false : (await loadUserPresence(userId))?.is_at_metal_place ?? false,
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
    const presence: UserPresence = {
      user_id: item.user_id,
      is_camping: item.is_camping,
      is_at_metal_place: item.is_at_metal_place ?? false,
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
  // Mutual exclusion with camping: checking in to Metal Place clears camping; checking out
  // preserves the prior camping state.
  const existing = await loadUserPresence(userId);
  const presence: UserPresence = {
    user_id: userId,
    is_camping: isAtMetalPlace ? false : existing?.is_camping ?? false,
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

export function isTimeWithinMetalPlaceWindow(config: MetalPlaceConfig | null, now: Date): boolean {
  if (!config || !config.start_time || !config.end_time) {
    return false;
  }

  // Test mode: when test_override_day is set, treat today as that festival day
  // regardless of the actual date. Otherwise check the configured festival_day.
  const isTestMode = config.test_override_day !== null && config.test_override_day !== undefined;

  if (!isTestMode) {
    if (config.festival_day === null || config.festival_day === undefined) {
      return false;
    }
    const WACKEN_START = new Date('2026-07-29T00:00:00Z');
    const DAY_DURATION_MS = 24 * 60 * 60 * 1000;
    const dayOffset = Math.floor((now.getTime() - WACKEN_START.getTime()) / DAY_DURATION_MS);
    const currentFestivalDay = dayOffset + 1;
    if (currentFestivalDay !== config.festival_day) {
      return false;
    }
  }

  const [startHour, startMin] = config.start_time.split(':').map(Number);
  const [endHour, endMin] = config.end_time.split(':').map(Number);

  // Compare against local Wacken (Europe/Berlin) wall-clock time, since admins
  // configure start/end as wall-clock times, not UTC.
  const wallClock = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Berlin',
  }).format(now);
  const [nowHourStr, nowMinStr] = wallClock.split(':');
  const nowTotalMinutes = parseInt(nowHourStr, 10) * 60 + parseInt(nowMinStr, 10);

  const startTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = endHour * 60 + endMin;

  return nowTotalMinutes >= startTotalMinutes && nowTotalMinutes < endTotalMinutes;
}

export async function autoCheckoutAllUsersFromMetalPlace(): Promise<void> {
  try {
    const { data, error } = await supabase.from('user_presence').select('*');
    if (error || !data) return;

    const usersAtMetalPlace = (data as UserPresence[]).filter((p) => p.is_at_metal_place);

    for (const presence of usersAtMetalPlace) {
      try {
        await setMetalPlaceStatus(presence.user_id, false);
      } catch (err) {
        // Continue with other users if one fails
        if (err instanceof Error && err.name !== 'InvalidStateError') {
          console.error(`Failed to checkout user ${presence.user_id}:`, err);
        }
      }
    }
  } catch (error) {
    // Silently handle IDB connection errors during batch operations
    if (error instanceof Error && error.name === 'InvalidStateError') {
      console.debug('[Metal Place] Auto-checkout skipped due to DB connection closing');
      return;
    }
    throw error;
  }
}

export async function validateAndAutoCheckoutOutsideMetalPlaceWindow(config: MetalPlaceConfig | null): Promise<void> {
  if (isTimeWithinMetalPlaceWindow(config, new Date())) {
    return;
  }

  try {
    await autoCheckoutAllUsersFromMetalPlace();
  } catch (error) {
    // Ignore InvalidStateError from closing IDB connections
    // This can happen when Service Worker cache operations conflict with app DB operations
    if (error instanceof Error && error.name === 'InvalidStateError') {
      console.debug('[Metal Place] Skipping auto-checkout due to DB connection closing', error);
      return;
    }
    throw error;
  }
}
