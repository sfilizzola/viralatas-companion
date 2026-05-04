import { saveCrewUsers } from './db';
import { supabase } from './supabase';
import type { CrewUser } from '../types';

export async function syncCrewUsers(): Promise<void> {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .order('display_name', { ascending: true, nullsFirst: false });

  if (error || !data) return;

  await saveCrewUsers(data as CrewUser[]);
}
