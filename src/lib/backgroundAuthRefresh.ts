import { supabase } from './supabase';
import { withTimeout } from './withTimeout';

export const BACKGROUND_AUTH_REFRESH_MS = 3_000;

export async function refreshAuthSessionInBackground(): Promise<void> {
  if (!navigator.onLine) return;
  try {
    await withTimeout(supabase.auth.getSession(), BACKGROUND_AUTH_REFRESH_MS);
  } catch {
    // Stale IDB session remains valid for offline UX.
  }
}

export function watchOnlineAuthRefresh(onRefresh: () => void): () => void {
  const handler = () => onRefresh();
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
