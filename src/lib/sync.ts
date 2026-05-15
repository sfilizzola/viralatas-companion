import { supabase } from './supabase';
import { saveBands } from './db';
import type { Band } from '../types';

export async function syncBands(): Promise<void> {
  const { data, error } = await supabase
    .from('bands')
    .select('*')
    .order('start_time');

  if (error) throw error;
  if (data && data.length > 0) await saveBands(data as unknown as Band[]);
}
