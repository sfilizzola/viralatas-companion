/**
 * Festival Reset — one-shot operator script
 *
 * Run (against the project pointed at by .env.local):
 *   npm run festival:reset                          # state-only wipe
 *   npm run festival:reset -- --with-bands          # state wipe + bands re-seed
 *   npm run festival:reset -- --dry-run             # preview only, writes nothing
 *   npm run festival:reset -- --force               # skip the 5-second countdown
 *
 * Flags may be combined (commutative). --dry-run always wins over --force/--with-bands
 * for write semantics (it still _shows_ what --with-bands would do, but never invokes it).
 *
 * Requires env vars (reads from .env.local automatically):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← service role; required for auth.admin + table writes
 *
 * ────────────────────────────────────────────────────────────────────────
 * DESTRUCTIVE BEHAVIOR — wipes pre-festival activity. There is no undo.
 * ────────────────────────────────────────────────────────────────────────
 *
 * Wiped:
 *   • public.announcements                                (every row)
 *   • public.blocked_posters                              (every row)
 *   • public.user_presence                                (every row)
 *   • public.users.special_badges                         (cleared to '{}' for every user)
 *   • auth.users.raw_user_meta_data keys:
 *       - achieved_badge_slugs
 *       - crew_earned_badge_slugs
 *       - location_visits
 *     (only these three keys are stripped; every other metadata key is preserved
 *      — wacken_years, wacken_arrival_day, push subs, language, etc.)
 *   • public.app_config row { key='cache_version' } is BUMPED (not deleted)
 *
 * Optionally wiped (only with --with-bands):
 *   • public.bands                                        (full replace via supabase/seed/bands.ts)
 *   • public.user_picks                                   (CASCADE from bands)
 *   • public.user_missed_bands                            (CASCADE from bands)
 *
 * Preserved (never touched):
 *   • public.users rows themselves; columns: role, display_name, email, avatar_url,
 *     country, is_friend, etc.
 *   • auth.users rows themselves (only metadata is patched, never the row).
 *   • Every auth.users metadata key not listed above (wacken_years, wacken_arrival_day,
 *     push subscription fields, language preference, …).
 *   • public.metal_place_config, public.live_band_test_config (godlike ops state).
 *
 * NEVER run mid-festival without coordination — wipes are immediate via realtime
 * to every connected client.
 *
 * Design: docs/superpowers/specs/2026-05-18-festival-reset-design.md
 */

import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// The three (and only three) keys that count as "persistent badge state" in
// auth.users.raw_user_meta_data. Adding a new persistent-badge key in the
// future means adding it here — there is no other source of truth for the
// strip list. Keeping it a const (not a config) is intentional: the spec
// requires a positive-strip pattern to avoid silently dropping unknown keys.
const PERSISTENT_BADGE_METADATA_KEYS = [
  'achieved_badge_slugs',
  'crew_earned_badge_slugs',
  'location_visits',
] as const;

const AUTH_LIST_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Env loading — matches the pattern used by bands.ts / test-users.ts
// ---------------------------------------------------------------------------

function loadEnvFile() {
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
    // .env.local missing — fall back to process.env supplied by the caller
  }
}

// ---------------------------------------------------------------------------
// Counting helpers — used both for pre-flight and post-condition verification
// ---------------------------------------------------------------------------

// `SupabaseClient<any>` matches the runtime shape of `createClient(url, key)`
// (which infers `Database = any`, schema = "public"). Using
// `ReturnType<typeof createClient>` instead resolves to a narrower type
// (`Database = unknown`, schemas as `never`) that the IDE/tsc rejects when
// the concrete client is passed in, even though runtime is fine.
type Sb = SupabaseClient<any>;

async function countRows(sb: Sb, table: string): Promise<number> {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    console.error(`Count failed for ${table}: ${error.message}`);
    process.exit(1);
  }
  return count ?? 0;
}

async function countUsersWithAssignedBadges(sb: Sb): Promise<number> {
  // PostgREST cardinality() on text[] arrays via a `not` filter:
  // any row whose special_badges array has at least one element is counted.
  // We approximate by `not('special_badges', 'is', null)` then client-filter
  // on length, but the column has a default of '{}' so that's not useful.
  // Cheapest correct path: select array_length via the .rpc-less trick of
  // filtering rows that contain ANY of '{any}' element. Easiest: fetch the
  // column and count non-empty arrays in JS — population is ~20 users.
  const { data, error } = await sb.from('users').select('special_badges');
  if (error) {
    console.error(`Count failed for users.special_badges: ${error.message}`);
    process.exit(1);
  }
  // Per-call cast: the untyped client returns rows as `any`, so we give the
  // filter callback a concrete shape that matches the column's PG type
  // (`text[]` — Postgres NULL is not possible here as the column defaults to '{}').
  const rows = (data ?? []) as Array<{ special_badges: string[] | null }>;
  return rows.filter(
    (row) => Array.isArray(row.special_badges) && row.special_badges.length > 0,
  ).length;
}

// ---------------------------------------------------------------------------
// Auth metadata helpers
// ---------------------------------------------------------------------------

type AuthListed = {
  id: string;
  user_metadata: Record<string, unknown> | null | undefined;
};

async function listAllAuthUsers(sb: Sb): Promise<AuthListed[]> {
  const all: AuthListed[] = [];
  let page = 1;
  // Defensive pagination loop; the crew is ~20 people so 1 page in practice.
  // Bounded at 1000 iterations to avoid runaway loops on a malformed API.
  for (let i = 0; i < 1000; i++) {
    const { data, error } = await sb.auth.admin.listUsers({
      page,
      perPage: AUTH_LIST_PAGE_SIZE,
    });
    if (error) {
      console.error(`auth.admin.listUsers failed on page ${page}: ${error.message}`);
      process.exit(1);
    }
    const users = (data?.users ?? []) as Array<{
      id: string;
      user_metadata?: Record<string, unknown> | null;
    }>;
    for (const u of users) {
      all.push({ id: u.id, user_metadata: u.user_metadata ?? {} });
    }
    if (users.length < AUTH_LIST_PAGE_SIZE) break;
    page += 1;
  }
  return all;
}

function hasAnyPersistentBadgeKey(meta: Record<string, unknown> | null | undefined): boolean {
  if (!meta) return false;
  return PERSISTENT_BADGE_METADATA_KEYS.some((k) => k in meta);
}

function stripPersistentBadgeKeys(
  meta: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...(meta ?? {}) };
  for (const k of PERSISTENT_BADGE_METADATA_KEYS) {
    delete copy[k];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Bump cache_version (forces clients to invalidate IndexedDB on next load)
// ---------------------------------------------------------------------------

async function bumpCacheVersion(sb: Sb): Promise<{ ok: boolean; value: string }> {
  const value = new Date().toISOString();
  const { data, error } = await sb
    .from('app_config')
    .update({ value })
    .eq('key', 'cache_version')
    .select('key');
  if (error) {
    console.warn(`  ⚠ cache_version bump failed (data wipe still succeeded): ${error.message}`);
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

// ---------------------------------------------------------------------------
// Bands re-seed (subprocess; isolated process, no env/state pollution)
// ---------------------------------------------------------------------------

function spawnBandsSeed(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', 'supabase/seed/bands.ts', '--force'], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', (err) => {
      console.error(`Failed to spawn bands seed: ${err.message}`);
      resolve(1);
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function festivalReset() {
  loadEnvFile();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const argv = process.argv.slice(2);
  const force = argv.includes('--force');
  const dryRun = argv.includes('--dry-run');
  const withBands = argv.includes('--with-bands');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('  (set them in .env.local — the script reads it automatically)');
    process.exit(1);
  }

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── Pre-flight summary ──────────────────────────────────────────────────
  console.log('━'.repeat(72));
  console.log(
    `Festival Reset — ${dryRun ? 'DRY RUN (no writes)' : 'DESTRUCTIVE'}${
      withBands ? ' · WITH BANDS RE-SEED' : ''
    }`,
  );
  console.log('━'.repeat(72));
  console.log(`Target: ${supabaseUrl}`);
  console.log('');

  console.log('Reading current state…');
  const [annCount, blockedCount, presenceCount, assignedCount, authUsers, bandsCount] =
    await Promise.all([
      countRows(sb, 'announcements'),
      countRows(sb, 'blocked_posters'),
      countRows(sb, 'user_presence'),
      countUsersWithAssignedBadges(sb),
      listAllAuthUsers(sb),
      withBands ? countRows(sb, 'bands') : Promise.resolve(-1),
    ]);

  const usersWithPersistentBadges = authUsers.filter((u) =>
    hasAnyPersistentBadgeKey(u.user_metadata),
  ).length;

  console.log('');
  console.log('Current state:');
  console.log(`  • announcements rows ................. ${annCount}`);
  console.log(`  • blocked_posters rows ............... ${blockedCount}`);
  console.log(`  • user_presence rows ................. ${presenceCount}`);
  console.log(`  • users with assigned badges ......... ${assignedCount}`);
  console.log(
    `  • auth.users total ................... ${authUsers.length} (${usersWithPersistentBadges} carry persistent badge keys)`,
  );
  if (withBands) {
    console.log(`  • bands rows (will be replaced) ...... ${bandsCount}`);
  }
  console.log('');

  console.log('Plan:');
  console.log('  1. DELETE every row in public.announcements');
  console.log('  2. DELETE every row in public.blocked_posters');
  console.log('  3. DELETE every row in public.user_presence');
  console.log("  4. UPDATE public.users SET special_badges = '{}'");
  console.log(
    `  5. STRIP keys ${PERSISTENT_BADGE_METADATA_KEYS.join(', ')} from auth.users metadata`,
  );
  console.log('  6. BUMP public.app_config cache_version (force client cache invalidation)');
  if (withBands) {
    console.log('  7. RE-SEED public.bands (delegates to supabase/seed/bands.ts --force)');
    console.log('     └─ CASCADEs public.user_picks + public.user_missed_bands');
  }
  console.log('');

  if (dryRun) {
    console.log('--dry-run set: no writes will be performed. Exiting.');
    return;
  }

  if (!force) {
    console.log(
      'Starting in 5s — press Ctrl-C to abort, or rerun with --force to skip the wait.',
    );
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log('');

  // ── 1. Wipe announcements ──────────────────────────────────────────────
  console.log('[1/6] Deleting public.announcements…');
  {
    const { error } = await sb
      .from('announcements')
      .delete()
      .not('id', 'is', null);
    if (error) {
      console.error(`  ✗ delete failed: ${error.message}`);
      process.exit(1);
    }
    const after = await countRows(sb, 'announcements');
    if (after !== 0) {
      console.error(`  ✗ post-condition failed: expected 0 rows, found ${after}`);
      process.exit(1);
    }
    console.log(`  ✓ deleted ${annCount} rows`);
  }

  // ── 2. Wipe blocked_posters ────────────────────────────────────────────
  console.log('[2/6] Deleting public.blocked_posters…');
  {
    const { error } = await sb
      .from('blocked_posters')
      .delete()
      .not('user_id', 'is', null);
    if (error) {
      console.error(`  ✗ delete failed: ${error.message}`);
      process.exit(1);
    }
    const after = await countRows(sb, 'blocked_posters');
    if (after !== 0) {
      console.error(`  ✗ post-condition failed: expected 0 rows, found ${after}`);
      process.exit(1);
    }
    console.log(`  ✓ deleted ${blockedCount} rows`);
  }

  // ── 3. Wipe user_presence ──────────────────────────────────────────────
  console.log('[3/6] Deleting public.user_presence…');
  {
    const { error } = await sb
      .from('user_presence')
      .delete()
      .not('user_id', 'is', null);
    if (error) {
      console.error(`  ✗ delete failed: ${error.message}`);
      process.exit(1);
    }
    const after = await countRows(sb, 'user_presence');
    if (after !== 0) {
      console.error(`  ✗ post-condition failed: expected 0 rows, found ${after}`);
      process.exit(1);
    }
    console.log(`  ✓ deleted ${presenceCount} rows`);
  }

  // ── 4. Clear assigned badges (public.users.special_badges) ─────────────
  console.log("[4/6] Clearing public.users.special_badges…");
  {
    const { error } = await sb
      .from('users')
      .update({ special_badges: [] })
      .not('id', 'is', null);
    if (error) {
      console.error(`  ✗ update failed: ${error.message}`);
      process.exit(1);
    }
    const remaining = await countUsersWithAssignedBadges(sb);
    if (remaining !== 0) {
      console.error(
        `  ✗ post-condition failed: ${remaining} users still have non-empty special_badges`,
      );
      process.exit(1);
    }
    console.log(`  ✓ cleared assigned badges on ${assignedCount} users`);
  }

  // ── 5. Strip persistent badge keys from auth.users metadata ────────────
  console.log('[5/6] Stripping persistent badge keys from auth.users metadata…');
  let stripped = 0;
  let skipped = 0;
  let failed = 0;
  for (const u of authUsers) {
    if (!hasAnyPersistentBadgeKey(u.user_metadata)) {
      skipped += 1;
      continue;
    }
    const next = stripPersistentBadgeKeys(u.user_metadata);
    const { error } = await sb.auth.admin.updateUserById(u.id, {
      user_metadata: next,
    });
    if (error) {
      failed += 1;
      console.warn(`  ⚠ user ${u.id}: ${error.message}`);
      continue;
    }
    stripped += 1;
  }
  console.log(
    `  ${failed === 0 ? '✓' : '✗'} stripped ${stripped} · skipped ${skipped} (no relevant keys) · failed ${failed}`,
  );
  if (failed > 0) {
    console.error(`  ✗ ${failed} metadata strip failures — see warnings above`);
  }

  // ── 6. Bump cache_version ──────────────────────────────────────────────
  console.log('[6/6] Bumping public.app_config cache_version…');
  const bump = await bumpCacheVersion(sb);
  if (bump.ok) {
    console.log(`  ✓ cache_version = ${bump.value}`);
  }

  // ── Optional: bands re-seed (delegates to supabase/seed/bands.ts) ──────
  if (withBands) {
    console.log('');
    console.log('━'.repeat(72));
    console.log('Delegating to supabase/seed/bands.ts --force …');
    console.log('━'.repeat(72));
    const code = await spawnBandsSeed();
    if (code !== 0) {
      console.error(`Bands seed exited with code ${code}.`);
      process.exit(code);
    }
  }

  // ── Final summary ──────────────────────────────────────────────────────
  console.log('');
  console.log('━'.repeat(72));
  console.log('Festival Reset complete');
  console.log('━'.repeat(72));
  if (!withBands) {
    console.log(
      "Reminder: bands were NOT re-seeded. Run `npm run seed:bands` (or rerun with --with-bands) when the real lineup is in place.",
    );
  }
  if (failed > 0) {
    console.log(`Exited with ${failed} metadata strip failures.`);
    process.exit(1);
  }
  console.log('Done 🤘');
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  festivalReset();
}
