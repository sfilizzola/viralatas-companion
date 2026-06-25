import type { LiveBandTestConfig, MetalPlaceConfig, MetalPlaceWindow } from '../../types';
import { getDB } from './connection';
import {
  LIVE_BAND_TEST_CONFIG_CHANGED_EVENT,
  METAL_PLACE_CONFIG_CHANGED_EVENT,
} from './events';

function emitMetalPlaceConfigChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(METAL_PLACE_CONFIG_CHANGED_EVENT));
  }
}

function emitLiveBandTestConfigChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LIVE_BAND_TEST_CONFIG_CHANGED_EVENT));
  }
}

type LegacyCachedMetalPlaceConfig = MetalPlaceConfig & {
  festival_day?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  test_override_day?: number | null;
};

function newWindowId(): string {
  return crypto.randomUUID?.() ?? `legacy-${Date.now()}`;
}

/**
 * Offline upgrade shim: legacy IDB rows may still have single-window columns.
 * Same rules as SQL migration — synthesize one window only when day + both times
 * are set; otherwise windows=[].
 */
function normalizeMetalPlaceConfig(
  raw: LegacyCachedMetalPlaceConfig | undefined,
): MetalPlaceConfig | null {
  if (!raw) return null;

  if (Array.isArray(raw.windows)) {
    const {
      festival_day: _day,
      start_time: _start,
      end_time: _end,
      test_override_day: _test,
      ...rest
    } = raw;
    return { ...rest, windows: raw.windows };
  }

  const {
    festival_day,
    start_time,
    end_time,
    test_override_day: _test,
    ...rest
  } = raw;

  let windows: MetalPlaceWindow[] = [];
  if (festival_day != null && start_time != null && end_time != null) {
    windows = [
      {
        id: newWindowId(),
        festival_day,
        start_time,
        end_time,
        sort_order: 0,
      },
    ];
  }

  return { ...rest, windows };
}

// --- Metal Place Configuration ---

export async function loadMetalPlaceConfig(): Promise<MetalPlaceConfig | null> {
  const db = await getDB();
  const config = await db.get('metal_place_config', 'current');
  return normalizeMetalPlaceConfig(config as LegacyCachedMetalPlaceConfig | undefined);
}

export async function saveMetalPlaceConfig(config: MetalPlaceConfig) {
  const db = await getDB();
  await db.put('metal_place_config', config, 'current');
  emitMetalPlaceConfigChanged();
}

export async function clearMetalPlaceConfig() {
  const db = await getDB();
  await db.delete('metal_place_config', 'current');
}

// --- Live Band Test Configuration ---

export async function loadLiveBandTestConfig(): Promise<LiveBandTestConfig | null> {
  const db = await getDB();
  const config = await db.get('live_band_test_config', 'current');
  return config ?? null;
}

export async function saveLiveBandTestConfig(config: LiveBandTestConfig) {
  const db = await getDB();
  await db.put('live_band_test_config', config, 'current');
  emitLiveBandTestConfigChanged();
}

export async function clearLiveBandTestConfig() {
  const db = await getDB();
  await db.delete('live_band_test_config', 'current');
}
