import type { Session } from '@supabase/supabase-js';
import { loadSession } from './db';

export const AUTH_STORAGE_KEY = 'viralatas-auth';
/** Legacy mistaken key from early bootstrap — kept for reads only. */
export const AUTH_TOKEN_KEY = `${AUTH_STORAGE_KEY}-token`;

export type IdbSessionRead = {
  session: Session | null;
  hadIdbSession: boolean;
};

function parseStoredSession(stored: unknown): Session | null {
  if (stored == null) return null;
  try {
    const parsed =
      typeof stored === 'string'
        ? (JSON.parse(stored) as Session)
        : (stored as Session);
    return parsed?.access_token ? parsed : null;
  } catch {
    return null;
  }
}

export async function readSessionFromIdb(): Promise<IdbSessionRead> {
  const raw = await loadSession();
  if (!raw || typeof raw !== 'object') {
    return { session: null, hadIdbSession: false };
  }

  const record = raw as Record<string, unknown>;
  const stored = record[AUTH_STORAGE_KEY] ?? record[AUTH_TOKEN_KEY];
  const session = parseStoredSession(stored);

  if (!session) {
    return { session: null, hadIdbSession: false };
  }

  return { session, hadIdbSession: true };
}
