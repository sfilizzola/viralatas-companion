import { saveCrewUsers } from '../lib/db';
import { supabase } from '../lib/supabase';
import type { CrewUser } from '../types';

async function syncCrew(): Promise<void> {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .order('display_name', { ascending: true, nullsFirst: false });

  if (error || !data) return;

  await saveCrewUsers(data as CrewUser[]);
}

export const usersRepository = {
  syncCrew,
};
