import type { LiveBandTestConfig, MetalPlaceConfig } from '../../types';
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

// --- Metal Place Configuration ---

export async function loadMetalPlaceConfig(): Promise<MetalPlaceConfig | null> {
  const db = await getDB();
  const config = await db.get('metal_place_config', 'current');
  return config ?? null;
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
