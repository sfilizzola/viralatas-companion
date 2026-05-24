import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function loadEnvFile() {
  try {
    const raw = readFileSync('.env.local', 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local not found — rely on process.env being set by the caller
  }
}

export function createServiceClient(): {
  supabase: SupabaseClient;
  supabaseUrl: string;
} {
  loadEnvFile();
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return { supabase, supabaseUrl };
}

export async function bumpCacheVersion(
  supabase: SupabaseClient,
): Promise<{ ok: boolean; value: string }> {
  const value = new Date().toISOString();
  const { data, error } = await supabase
    .from('app_config')
    .update({ value })
    .eq('key', 'cache_version')
    .select('key');
  if (error) {
    console.warn(`  ⚠ cache_version bump failed: ${error.message}`);
    return { ok: false, value };
  }
  if (!data || data.length === 0) {
    console.warn(
      '  ⚠ cache_version row missing in public.app_config — clients will catch up on natural reload.',
    );
    return { ok: false, value };
  }
  return { ok: true, value };
}

export function isSelfInvoked(moduleUrl: string): boolean {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === fileURLToPath(moduleUrl);
}
