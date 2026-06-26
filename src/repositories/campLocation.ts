import { supabase } from '../lib/supabase';
import {
  clearCampLocationCache,
  loadCampLocation,
  saveCampLocation,
} from '../lib/db';
import { isCampLocation } from '../services/campLocation';
import type { CampLocation } from '../types';

function rowToLocation(
  row: { camping_latitude: number | null; camping_longitude: number | null } | null,
): CampLocation | null {
  if (!row) return null;
  return isCampLocation({ lat: row.camping_latitude, lng: row.camping_longitude })
    ? { lat: row.camping_latitude!, lng: row.camping_longitude! }
    : null;
}

async function syncCampLocation(): Promise<CampLocation | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('camping_latitude, camping_longitude')
    .limit(1)
    .single();

  if (error) {
    return loadCampLocation();
  }

  const location = rowToLocation(data);
  if (location) {
    await saveCampLocation(location);
  } else {
    await clearCampLocationCache();
  }
  return location;
}

async function saveCampLocationRemote(location: CampLocation): Promise<void> {
  const { data: settings, error: fetchError } = await supabase
    .from('app_settings')
    .select('id')
    .limit(1)
    .single();

  if (fetchError || !settings) {
    throw fetchError ?? new Error('App settings row not found');
  }

  const { error } = await supabase
    .from('app_settings')
    .update({
      camping_latitude: location.lat,
      camping_longitude: location.lng,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settings.id);

  if (error) throw error;
  await saveCampLocation(location);
}

async function clearCampLocationRemote(): Promise<void> {
  const { data: settings, error: fetchError } = await supabase
    .from('app_settings')
    .select('id')
    .limit(1)
    .single();

  if (fetchError || !settings) {
    throw fetchError ?? new Error('App settings row not found');
  }

  const { error } = await supabase
    .from('app_settings')
    .update({
      camping_latitude: null,
      camping_longitude: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settings.id);

  if (error) throw error;
  await clearCampLocationCache();
}

export const campLocationRepository = {
  loadCampLocation,
  syncCampLocation,
  saveCampLocationRemote,
  clearCampLocationRemote,
};
