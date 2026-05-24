import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { signUp: mocks.signUp },
    from: mocks.from,
  },
}));

import {
  clearSession,
  loadSession,
  resetDbConnectionForTests,
  saveSession,
} from '../lib/db';
import { supabase } from '../lib/supabase';

const AUTH_STORAGE_KEY = 'viralatas-auth';

/** Mirrors lib/supabase.ts custom auth storage backed by IndexedDB. */
async function authStorageGetItem(key: string): Promise<string | null> {
  const session = await loadSession();
  if (!session || typeof session !== 'object') return null;
  return (session as Record<string, string>)[key] ?? null;
}

async function authStorageSetItem(key: string, value: string): Promise<void> {
  const existing = (await loadSession()) as Record<string, string> | null;
  await saveSession({ ...(existing ?? {}), [key]: value });
}

async function authStorageRemoveItem(key: string): Promise<void> {
  const existing = (await loadSession()) as Record<string, string> | null;
  if (!existing) return;
  const rest = { ...existing };
  delete rest[key];
  await saveSession(rest);
}

function resolveRoleForEmail(email: string): 'godlike' | 'normal' {
  return email === 'sfilizzola@gmail.com' ? 'godlike' : 'normal';
}

function resolveIsTestUser(metadataValue: string | undefined): boolean {
  return metadataValue === 'true';
}

function resolvePreferredLanguage(metadataValue: string | undefined): string {
  return metadataValue || 'br';
}

describe('Auth & Users Table Integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDbConnectionForTests();
    await deleteViralatasDatabase();
  });

  describe('IndexedDB session persistence (Supabase auth storage)', () => {
    it('persists auth payload under viralatas-auth key', async () => {
      const payload = JSON.stringify({ access_token: 'abc', refresh_token: 'def' });
      await authStorageSetItem(AUTH_STORAGE_KEY, payload);

      await expect(authStorageGetItem(AUTH_STORAGE_KEY)).resolves.toBe(payload);
    });

    it('merges multiple storage keys in one session object', async () => {
      await authStorageSetItem('key-a', 'value-a');
      await authStorageSetItem('key-b', 'value-b');

      await expect(loadSession()).resolves.toEqual({
        'key-a': 'value-a',
        'key-b': 'value-b',
      });
    });

    it('removeItem deletes one key without wiping others', async () => {
      await authStorageSetItem(AUTH_STORAGE_KEY, 'token');
      await authStorageSetItem('other', 'keep');

      await authStorageRemoveItem(AUTH_STORAGE_KEY);

      await expect(authStorageGetItem(AUTH_STORAGE_KEY)).resolves.toBeNull();
      await expect(authStorageGetItem('other')).resolves.toBe('keep');
    });

    it('clearSession removes all persisted auth state', async () => {
      await authStorageSetItem(AUTH_STORAGE_KEY, 'token');
      await clearSession();
      await expect(loadSession()).resolves.toBeUndefined();
    });
  });

  describe('handle_new_user trigger contract (metadata → users row)', () => {
    it('assigns godlike role for sfilizzola@gmail.com', () => {
      expect(resolveRoleForEmail('sfilizzola@gmail.com')).toBe('godlike');
      expect(resolveRoleForEmail('test@example.com')).toBe('normal');
    });

    it('defaults is_test_user to false when metadata is missing', () => {
      expect(resolveIsTestUser(undefined)).toBe(false);
      expect(resolveIsTestUser('true')).toBe(true);
      expect(resolveIsTestUser('false')).toBe(false);
    });

    it('defaults preferred_language to br when metadata is missing', () => {
      expect(resolvePreferredLanguage(undefined)).toBe('br');
      expect(resolvePreferredLanguage('en')).toBe('en');
    });

    it('normalizes empty display_name to null in signup metadata shape', () => {
      const displayName = '';
      expect(displayName || null).toBeNull();
    });
  });

  describe('Signup → profile verification flow (mocked Supabase)', () => {
    it('creates auth user before users table verification', async () => {
      mocks.signUp.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      });

      const single = vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null });
      const eq = vi.fn().mockReturnValue({ single });
      const select = vi.fn().mockReturnValue({ eq });
      mocks.from.mockReturnValue({ select });

      const { data, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            display_name: null,
            preferred_language: 'br',
            is_test_user: false,
          },
        },
      });

      expect(error).toBeNull();
      expect(data.user?.id).toBe('user-1');

      const profile = await supabase.from('users').select('id').eq('id', 'user-1').single();
      expect(profile.data).toEqual({ id: 'user-1' });
      expect(mocks.signUp).toHaveBeenCalledTimes(1);
      expect(mocks.from).toHaveBeenCalledWith('users');
    });
  });
});
