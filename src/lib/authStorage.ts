import type { Session } from '@supabase/supabase-js';
import { loadSession } from './db';

export const AUTH_STORAGE_KEY = 'viralatas-auth';
export const AUTH_TOKEN_KEY = `${AUTH_STORAGE_KEY}-token`;

export type IdbSessionRead = {
  session: Session | null;
  hadIdbSession: boolean;
};

export async function readSessionFromIdb(): Promise<IdbSessionRead> {
  const raw = await loadSession();
  if (!raw || typeof raw !== 'object') {
    return { session: null, hadIdbSession: false };
  }
  const tokenJson = (raw as Record<string, string>)[AUTH_TOKEN_KEY];
  if (!tokenJson) {
    return { session: null, hadIdbSession: false };
  }
  try {
    const parsed = JSON.parse(tokenJson) as Session;
    if (!parsed?.access_token) {
      return { session: null, hadIdbSession: false };
    }
    return { session: parsed, hadIdbSession: true };
  } catch {
    return { session: null, hadIdbSession: false };
  }
}
