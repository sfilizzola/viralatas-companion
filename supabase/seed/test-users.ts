/**
 * Seed script — disposable Viralatas test crew
 *
 * Run:
 *   npm run seed:test-users          # recreate disposable test users
 *   npm run seed:test-users:delete   # remove disposable test users
 *
 * Requires env vars (reads from .env.local automatically):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

type SeedBand = {
  id: string;
};

type TestProfile = {
  id: string;
  email: string;
};

const TEST_USER_NAMES = [
  'Alencar',
  'Cae',
  'Dani',
  'Alemao',
  'Ribeirinho',
  'Beth',
  'Bernard',
  'Jack Black',
  'Moacir',
  'Daniel',
  'Jean',
  'Cassio',
  'Patron',
  'Carlos',
  'Rieke',
  'Babaca',
  'Lils',
  'Fede',
] as const;

const EMAIL_DOMAIN = 'viralatas-test.example.com';
const PASSWORD = 'ViralatasTest123!';

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
    // .env.local not found — rely on process.env being set by the caller
  }
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function testEmail(name: string) {
  return `${slugify(name)}@${EMAIL_DOMAIN}`;
}

function sampleBands(bands: SeedBand[]) {
  const shuffled = [...bands].sort(() => Math.random() - 0.5);
  const pickCount = Math.min(bands.length, 6 + Math.floor(Math.random() * 11));
  return shuffled.slice(0, pickCount);
}

function isMode(value: string): value is 'create' | 'delete' | 'reset' {
  return value === 'create' || value === 'delete' || value === 'reset';
}

async function deleteTestUsers(supabase: ReturnType<typeof createClient>) {
  const { data: markedUsers, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('is_test_user', true);

  if (error) {
    console.error('Could not list marked test users:', error.message);
    process.exit(1);
  }

  const usersById = new Map<string, TestProfile>(
    (markedUsers ?? []).map((user) => [user.id, user as TestProfile]),
  );

  for (let page = 1; ; page += 1) {
    const { data, error: listError } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (listError) {
      console.error('Could not list auth users:', listError.message);
      process.exit(1);
    }

    for (const authUser of data.users) {
      const isKnownTestEmail = TEST_USER_NAMES.some((name) => authUser.email === testEmail(name));
      const isMetadataMarked = authUser.user_metadata?.['is_test_user'] === true;
      if (isKnownTestEmail || isMetadataMarked) {
        usersById.set(authUser.id, {
          id: authUser.id,
          email: authUser.email ?? '(no email)',
        });
      }
    }

    if (data.users.length < 1000) break;
  }

  for (const user of usersById.values()) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.warn(`Auth delete skipped for ${user.email}: ${deleteError.message}`);
    }
  }

  const { error: cleanupError } = await supabase.from('users').delete().eq('is_test_user', true);
  if (cleanupError) {
    console.error('Could not clean up remaining public test profiles:', cleanupError.message);
    process.exit(1);
  }

  console.log(`Deleted ${usersById.size} disposable test users.`);
}

async function createTestUsers(supabase: ReturnType<typeof createClient>) {
  const { data: bands, error: bandError } = await supabase.from('bands').select('id');
  if (bandError || !bands?.length) {
    console.error('No bands found. Seed bands before creating test users.');
    process.exit(1);
  }

  const createdProfiles: TestProfile[] = [];

  for (const name of TEST_USER_NAMES) {
    const email = testEmail(name);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        display_name: name,
        preferred_language: 'br',
        is_test_user: true,
      },
    });

    if (error || !data.user) {
      console.error(`Could not create ${name}: ${error?.message ?? 'missing user data'}`);
      process.exit(1);
    }

    createdProfiles.push({ id: data.user.id, email });
  }

  const now = new Date().toISOString();

  const publicUsers = createdProfiles.map((profile) => {
    const name = TEST_USER_NAMES.find((candidate) => testEmail(candidate) === profile.email);
    return {
      id: profile.id,
      email: profile.email,
      display_name: name ?? profile.email,
      preferred_language: 'br',
      is_test_user: true,
    };
  });

  const { error: profileError } = await supabase.from('users').upsert(publicUsers);
  if (profileError) {
    console.error('Could not upsert public test profiles:', profileError.message);
    process.exit(1);
  }

  const picks = createdProfiles.flatMap((profile) =>
    sampleBands(bands as SeedBand[]).map((band) => ({
      user_id: profile.id,
      band_id: band.id,
      created_at: now,
    })),
  );

  const presence = createdProfiles.map((profile) => ({
    user_id: profile.id,
    is_camping: Math.random() < 0.35,
    updated_at: now,
  }));

  const { error: picksError } = await supabase.from('user_picks').insert(picks);
  if (picksError) {
    console.error('Could not insert random test picks:', picksError.message);
    process.exit(1);
  }

  const { error: presenceError } = await supabase.from('user_presence').upsert(presence);
  if (presenceError) {
    console.error('Could not upsert random camping state:', presenceError.message);
    process.exit(1);
  }

  console.log(`Created ${createdProfiles.length} disposable test users.`);
  console.log(`Inserted ${picks.length} random picks and ${presence.length} camping states.`);
  console.log(`Password for all test accounts: ${PASSWORD}`);
}

async function main() {
  loadEnvFile();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const requestedMode = process.argv[2] ?? 'reset';
  if (!isMode(requestedMode)) {
    console.error('Usage: tsx supabase/seed/test-users.ts [create|delete|reset]');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  if (requestedMode === 'delete') {
    await deleteTestUsers(supabase);
    return;
  }

  if (requestedMode === 'reset') {
    await deleteTestUsers(supabase);
  }

  await createTestUsers(supabase);
}

main();
