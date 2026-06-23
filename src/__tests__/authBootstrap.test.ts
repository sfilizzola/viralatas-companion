import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  loadSession: vi.fn(),
}));

import { loadSession } from '../lib/db';
import { AUTH_STORAGE_KEY, AUTH_TOKEN_KEY, readSessionFromIdb } from '../lib/authStorage';

describe('readSessionFromIdb', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns parsed session from Supabase storage key (viralatas-auth)', async () => {
    const fakeSession = {
      access_token: 'a',
      refresh_token: 'r',
      expires_at: 9_999_999_999,
      user: { id: 'u1', email: 'x@y.com' },
    };
    vi.mocked(loadSession).mockResolvedValue({
      [AUTH_STORAGE_KEY]: JSON.stringify(fakeSession),
    });

    const result = await readSessionFromIdb();

    expect(result.session?.access_token).toBe('a');
    expect(result.hadIdbSession).toBe(true);
  });

  it('supports legacy viralatas-auth-token key', async () => {
    const fakeSession = {
      access_token: 'legacy',
      refresh_token: 'r',
      expires_at: 9_999_999_999,
      user: { id: 'u1' },
    };
    vi.mocked(loadSession).mockResolvedValue({
      [AUTH_TOKEN_KEY]: JSON.stringify(fakeSession),
    });

    const result = await readSessionFromIdb();

    expect(result.session?.access_token).toBe('legacy');
    expect(result.hadIdbSession).toBe(true);
  });

  it('returns null session immediately when IDB empty', async () => {
    vi.mocked(loadSession).mockResolvedValue(null);

    const result = await readSessionFromIdb();

    expect(result.session).toBeNull();
    expect(result.hadIdbSession).toBe(false);
  });
});
