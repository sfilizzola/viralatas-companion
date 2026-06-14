import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        lt: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../repositories', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../repositories')>();
  return {
    ...actual,
    announcementsRepository: {
      ...actual.announcementsRepository,
      sync: vi.fn().mockResolvedValue(undefined),
      fetchMore: vi.fn().mockResolvedValue([]),
      fetchCurrentUserRole: vi.fn().mockResolvedValue('normal'),
      fetchIsBlocked: vi.fn().mockResolvedValue(false),
    },
    usersRepository: {
      ...actual.usersRepository,
      fetchUserRolesMap: vi.fn().mockResolvedValue({}),
      fetchBlockedPosters: vi.fn().mockResolvedValue([]),
    },
  };
});

import { resetDbConnectionForTests, saveAnnouncement, saveAnnouncementReaction, saveCrewUsers } from '../lib/db';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { ANNOUNCEMENTS_CHANGED_EVENT } from '../lib/db';
import { buildReactionSummaries } from '../services/announcementsDisplay';

const userId = 'user-test';

const ANNOUNCEMENT: Parameters<typeof saveAnnouncement>[0] = {
  id: 'ann-1',
  author_id: userId,
  content: 'Metal!',
  created_at: '2026-07-29T14:00:00Z',
  deleted_at: null,
  is_pinned: false,
};

beforeEach(async () => {
  await resetDbConnectionForTests();
  await deleteViralatasDatabase();
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
});

describe('useAnnouncements', () => {
  it('loads announcements from IDB on mount', async () => {
    await saveAnnouncement(ANNOUNCEMENT);
    const { result } = renderHook(() => useAnnouncements(userId));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.announcements).toHaveLength(1);
    expect(result.current.announcements[0].content).toBe('Metal!');
  });

  it('loads crew users from IDB on mount', async () => {
    await saveCrewUsers([
      {
        id: userId,
        display_name: 'Alice',
        avatar_url: null,
        wacken_arrival_day: null,
        is_friend: null,
      },
    ]);
    const { result } = renderHook(() => useAnnouncements(userId));
    await waitFor(() => expect(result.current.crewUsers).toHaveLength(1));
    expect(result.current.crewUsers[0].display_name).toBe('Alice');
  });

  it('refreshes when ANNOUNCEMENTS_CHANGED_EVENT fires', async () => {
    const { result } = renderHook(() => useAnnouncements(userId));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.announcements).toHaveLength(0);

    await saveAnnouncement(ANNOUNCEMENT);
    window.dispatchEvent(new Event(ANNOUNCEMENTS_CHANGED_EVENT));

    await waitFor(() => expect(result.current.announcements).toHaveLength(1));
  });

  it('derives canModerate from role', async () => {
    const { announcementsRepository } = await import('../repositories');
    vi.mocked(announcementsRepository.fetchCurrentUserRole).mockResolvedValue('manager');

    const { result } = renderHook(() => useAnnouncements(userId));
    await waitFor(() => expect(result.current.canModerate).toBe(true));
  });

  it('attaches reaction summaries from IDB rows', async () => {
    await saveAnnouncement(ANNOUNCEMENT);
    await saveCrewUsers([
      {
        id: userId,
        display_name: 'Alice',
        avatar_url: null,
        wacken_arrival_day: null,
        is_friend: null,
      },
    ]);
    await saveAnnouncementReaction({
      announcement_id: 'ann-1',
      user_id: userId,
      emoji: '🤘',
      created_at: '2026-07-29T14:01:00Z',
    });

    const { result } = renderHook(() => useAnnouncements(userId));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.announcements[0].reactions).toEqual([
      expect.objectContaining({ emoji: '🤘', count: 1, reactedByMe: true, reactors: ['Alice'] }),
    ]);
  });
});

describe('buildReactionSummaries', () => {
  it('sorts by count desc then emoji order', () => {
    const rows = [
      { announcement_id: 'ann-1', user_id: 'u1', emoji: '🍺', created_at: '2026-01-01T00:00:00Z' },
      { announcement_id: 'ann-1', user_id: 'u2', emoji: '🍺', created_at: '2026-01-01T00:00:00Z' },
      { announcement_id: 'ann-1', user_id: 'u3', emoji: '🤘', created_at: '2026-01-01T00:00:00Z' },
    ];
    const names = new Map([
      ['u1', 'Bob'],
      ['u2', 'Carol'],
      ['u3', 'Alice'],
    ]);
    const summaries = buildReactionSummaries(rows, 'ann-1', null, names);
    expect(summaries.map((s) => s.emoji)).toEqual(['🍺', '🤘']);
    expect(summaries[0].reactors).toEqual(['Bob', 'Carol']);
  });
});
