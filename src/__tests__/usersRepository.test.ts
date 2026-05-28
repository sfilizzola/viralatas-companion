import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

vi.mock('../lib/db', () => ({
  saveCrewUsers: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from '../lib/supabase';
import * as db from '../lib/db';
import { usersRepository } from '../repositories/users';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as any);
  vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: { user: null }, error: null } as any);
});

describe('usersRepository.syncCrew', () => {
  it('fetches crew profiles and saves to IndexedDB', async () => {
    const crew = [{ id: 'u1', display_name: 'Alice', avatar_url: null, wacken_arrival_day: 1, is_friend: true, special_badges: null }];
    const mockOrder = vi.fn().mockResolvedValue({ data: crew, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    await usersRepository.syncCrew();

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(mockSelect).toHaveBeenCalledWith(
      'id, display_name, avatar_url, wacken_arrival_day, is_friend, special_badges',
    );
    expect(db.saveCrewUsers).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'u1', special_badges: [] }),
    ]);
  });

  it('persists special_badges on crew_users IDB rows', async () => {
    const crew = [{ id: 'u1', display_name: 'Alice', avatar_url: null, wacken_arrival_day: 1, is_friend: false, special_badges: ['code-wizards'] }];
    const mockOrder = vi.fn().mockResolvedValue({ data: crew, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);
    await usersRepository.syncCrew();
    expect(db.saveCrewUsers).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'u1', special_badges: ['code-wizards'] }),
    ]);
  });

  it('updates auth metadata when special_badges drift from crew row', async () => {
    const crew = [{ id: 'u1', display_name: 'Alice', avatar_url: null, wacken_arrival_day: 1, is_friend: false, special_badges: ['code-wizards'] }];
    const mockOrder = vi.fn().mockResolvedValue({ data: crew, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: { special_badges: [] } } },
      error: null,
    } as any);

    await usersRepository.syncCrew();

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      data: { special_badges: ['code-wizards'] },
    });
  });

  it('skips auth update when metadata already matches crew row', async () => {
    const crew = [{ id: 'u1', display_name: 'Alice', avatar_url: null, wacken_arrival_day: 1, is_friend: false, special_badges: ['code-wizards'] }];
    const mockOrder = vi.fn().mockResolvedValue({ data: crew, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: { special_badges: ['code-wizards'] } } },
      error: null,
    } as any);

    await usersRepository.syncCrew();

    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
});

describe('usersRepository.fetchUserRolesMap', () => {
  it('returns id → role map from users table', async () => {
    const mockSelect = vi.fn().mockResolvedValue({
      data: [
        { id: 'u1', role: 'manager' },
        { id: 'u2', role: 'normal' },
      ],
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    const roles = await usersRepository.fetchUserRolesMap();

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(roles).toEqual({ u1: 'manager', u2: 'normal' });
  });

  it('returns empty object when query returns no data', async () => {
    const mockSelect = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    expect(await usersRepository.fetchUserRolesMap()).toEqual({});
  });
});

describe('usersRepository.fetchAllUsers', () => {
  it('returns users with special_badges defaulting to empty array', async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [{ id: 'u1', email: 'a@x.com', display_name: 'A', avatar_url: null, role: 'normal', special_badges: null, is_friend: false }],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    const users = await usersRepository.fetchAllUsers();

    expect(users).toEqual([
      expect.objectContaining({ id: 'u1', special_badges: [] }),
    ]);
  });
});

describe('usersRepository.setUserRole', () => {
  it('calls set_user_role RPC', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

    await usersRepository.setUserRole('target-id', 'manager');

    expect(supabase.rpc).toHaveBeenCalledWith('set_user_role', {
      target_user_id: 'target-id',
      new_role: 'manager',
    });
  });
});

describe('usersRepository.fetchBlockedPosters', () => {
  it('returns blocked poster rows', async () => {
    const blocked = [{ user_id: 'u1', blocked_by: 'admin', blocked_at: '2026-01-01T00:00:00Z' }];
    const mockSelect = vi.fn().mockResolvedValue({ data: blocked, error: null });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    const result = await usersRepository.fetchBlockedPosters();

    expect(supabase.from).toHaveBeenCalledWith('blocked_posters');
    expect(result).toEqual(blocked);
  });
});

describe('usersRepository.fetchBlockedPostersWithUserDetails', () => {
  it('joins blocked posters with user profile fields', async () => {
    const blocked = [{ user_id: 'u1', blocked_by: 'admin', blocked_at: '2026-01-01T00:00:00Z' }];
    const mockBlockedSelect = vi.fn().mockResolvedValue({ data: blocked, error: null });

    const mockIn = vi.fn().mockResolvedValue({
      data: [{ id: 'u1', email: 'a@x.com', display_name: 'Alice', avatar_url: null, special_badges: ['vip'] }],
      error: null,
    });
    const mockSelectUsers = vi.fn().mockReturnValue({ in: mockIn });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'blocked_posters') return { select: mockBlockedSelect } as any;
      if (table === 'users') return { select: mockSelectUsers } as any;
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await usersRepository.fetchBlockedPostersWithUserDetails();

    expect(result).toEqual([
      expect.objectContaining({
        user_id: 'u1',
        user_email: 'a@x.com',
        user_display_name: 'Alice',
        user_special_badges: ['vip'],
      }),
    ]);
  });

  it('returns empty array when no blocked posters', async () => {
    const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    expect(await usersRepository.fetchBlockedPostersWithUserDetails()).toEqual([]);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});

describe('usersRepository.blockUser', () => {
  it('upserts blocked_posters row', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ upsert: mockUpsert } as any);

    await usersRepository.blockUser('u1', 'admin-id');

    expect(supabase.from).toHaveBeenCalledWith('blocked_posters');
    expect(mockUpsert).toHaveBeenCalledWith({ user_id: 'u1', blocked_by: 'admin-id' });
  });
});

describe('usersRepository.unblockUser', () => {
  it('deletes blocked_posters row by user_id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockReturnValue({ delete: mockDelete } as any);

    await usersRepository.unblockUser('u1');

    expect(supabase.from).toHaveBeenCalledWith('blocked_posters');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
  });
});
