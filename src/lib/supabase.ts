import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase.types';
import { AUTH_STORAGE_KEY } from './authStorage';
import { loadSession, saveSession } from './db';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    // Online refresh stays enabled; cold-start critical path reads IDB directly in useAuth.
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: AUTH_STORAGE_KEY,
    storage: {
      getItem: async (key) => {
        const session = await loadSession();
        if (!session || typeof session !== 'object') return null;
        return (session as Record<string, string>)[key] ?? null;
      },
      setItem: async (key, value) => {
        const existing = (await loadSession()) as Record<string, string> | null;
        await saveSession({ ...(existing ?? {}), [key]: value });
      },
      removeItem: async (key) => {
        const existing = (await loadSession()) as Record<string, string> | null;
        if (!existing) return;
        const rest = { ...existing };
        delete rest[key];
        await saveSession(rest);
      },
    },
  },
});
