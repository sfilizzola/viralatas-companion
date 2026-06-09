// src/lib/featureFlags.ts
import { supabase } from './supabase';
import type { Database } from './supabase.types';

export type FlagKey =
  | 'registration_enabled'
  | 'duck_enabled'
  | 'playlist_testing'
  | 'moshsplit_enabled';

const FLAG_DEFAULTS: Record<FlagKey, boolean> = {
  registration_enabled: true,  // fail-open: network failure never locks users out
  duck_enabled: true,          // fail-open: duck stays available offline
  playlist_testing: true,      // fail-safe: true = restricted mode
  moshsplit_enabled: false,    // fail-hidden: feature stays hidden on error
};

async function get(key: FlagKey): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select(key)
      .limit(1)
      .single();

    if (error) return FLAG_DEFAULTS[key];
    return (data as Partial<Record<FlagKey, boolean | null>> | null)?.[key] ?? FLAG_DEFAULTS[key];
  } catch {
    return FLAG_DEFAULTS[key];
  }
}

async function set(key: FlagKey, value: boolean): Promise<void> {
  const { data: settings, error: fetchError } = await supabase
    .from('app_settings')
    .select('id')
    .limit(1)
    .single();

  if (fetchError || !settings) {
    throw fetchError ?? new Error('App settings row not found');
  }

  const payload = {
    [key]: value,
    updated_at: new Date().toISOString(),
  } as Database['public']['Tables']['app_settings']['Update'];

  const { error } = await supabase
    .from('app_settings')
    .update(payload)
    .eq('id', settings.id);

  if (error) throw error;
}

async function getAll(): Promise<Record<FlagKey, boolean>> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('registration_enabled, duck_enabled, playlist_testing, moshsplit_enabled')
      .limit(1)
      .single();

    if (error || !data) return { ...FLAG_DEFAULTS };

    return {
      registration_enabled: data.registration_enabled ?? FLAG_DEFAULTS.registration_enabled,
      duck_enabled: data.duck_enabled ?? FLAG_DEFAULTS.duck_enabled,
      playlist_testing: data.playlist_testing ?? FLAG_DEFAULTS.playlist_testing,
      moshsplit_enabled: data.moshsplit_enabled ?? FLAG_DEFAULTS.moshsplit_enabled,
    };
  } catch {
    return { ...FLAG_DEFAULTS };
  }
}

export const featureFlags = { get, set, getAll };
