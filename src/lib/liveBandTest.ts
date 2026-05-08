import type { LiveBandTestConfig } from '../types';
import { saveLiveBandTestConfig } from './db';
import { supabase } from './supabase';

export async function syncLiveBandTestConfig(): Promise<void> {
  const { data, error } = await supabase.from('live_band_test_config').select('*').single();
  if (error || !data) return;

  await saveLiveBandTestConfig(data as LiveBandTestConfig);
}

export async function saveLiveBandTestConfigRemote(config: LiveBandTestConfig): Promise<void> {
  if (!navigator.onLine) {
    await saveLiveBandTestConfig(config);
    return;
  }

  const { error } = await supabase.from('live_band_test_config').upsert(config);
  if (error) {
    console.error('Failed to save Live Band Test config remotely:', error);
    throw error;
  }

  await saveLiveBandTestConfig(config);
}
