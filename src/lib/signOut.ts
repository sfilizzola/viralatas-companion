import { markUserInitiatedSignOut } from './authSessionFlags';
import { supabase } from './supabase';

export async function signOutUser(): Promise<void> {
  markUserInitiatedSignOut();
  await supabase.auth.signOut();
}
