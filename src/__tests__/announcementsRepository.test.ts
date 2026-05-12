import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../lib/db', () => ({
  saveAnnouncement: vi.fn().mockResolvedValue(undefined),
  saveAnnouncements: vi.fn().mockResolvedValue(undefined),
  enqueueOfflineAnnouncement: vi.fn().mockResolvedValue(undefined),
  loadOfflineAnnouncementsQueue: vi.fn().mockResolvedValue([]),
  removeFromOfflineAnnouncementsQueue: vi.fn().mockResolvedValue(undefined),
  removeAnnouncementFromCache: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from '../lib/supabase';
import * as db from '../lib/db';
import { announcementsRepository } from '../repositories/announcements';
import type { Announcement } from '../types';

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    writable: true,
    configurable: true,
  });
});

/** Build a chainable Supabase query builder stub. */
function makeQueryBuilder(overrides: Record<string, unknown> = {}) {
  const single = vi.fn();
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const order = vi.fn();
  const builder = { insert, select, single, order, ...overrides };
  // select chain: .select('*').order(...)
  (builder.select as ReturnType<typeof vi.fn>).mockReturnValue({ single, order });
  return builder;
}

const SERVER_ANNOUNCEMENT: Announcement = {
  id: 'server-id-1',
  author_id: 'user1',
  content: 'Hello metal!',
  created_at: '2026-07-29T14:00:00Z',
  deleted_at: null,
};

describe('announcementsRepository.post', () => {
  it('saves draft to IDB then inserts to Supabase when online', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: SERVER_ANNOUNCEMENT, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

    await announcementsRepository.post('user1', 'Hello metal!');

    // Draft saved immediately to IDB
    expect(db.saveAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: 'user1', content: 'Hello metal!' }),
    );

    // Inserted to Supabase
    expect(supabase.from).toHaveBeenCalledWith('announcements');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: 'user1', content: 'Hello metal!' }),
    );

    // Draft replaced by server record: draft removed, server record saved
    expect(db.removeAnnouncementFromCache).toHaveBeenCalled();
    expect(db.saveAnnouncement).toHaveBeenCalledWith(SERVER_ANNOUNCEMENT);
  });

  it('saves draft to IDB and enqueues offline announcement when navigator.onLine is false', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    await announcementsRepository.post('user1', 'Offline post');

    // Draft saved to IDB
    expect(db.saveAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: 'user1', content: 'Offline post' }),
    );

    // Queued for later sync
    expect(db.enqueueOfflineAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: 'user1', content: 'Offline post' }),
    );

    // No Supabase call
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('enqueues offline when Supabase insert returns an error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

    await announcementsRepository.post('user1', 'Will fail');

    expect(db.saveAnnouncement).toHaveBeenCalled();
    expect(db.enqueueOfflineAnnouncement).toHaveBeenCalled();
  });
});

describe('announcementsRepository.flushPending', () => {
  it('posts pending announcements to Supabase and clears them from the queue on success', async () => {
    const pending: Announcement[] = [
      { id: 'pending-1', author_id: 'user1', content: 'First', created_at: '2026-07-29T10:00:00Z', deleted_at: null },
      { id: 'pending-2', author_id: 'user2', content: 'Second', created_at: '2026-07-29T11:00:00Z', deleted_at: null },
    ];
    vi.mocked(db.loadOfflineAnnouncementsQueue).mockResolvedValue(pending);

    const serverResponse: Announcement = {
      id: 'server-id-99',
      author_id: 'user1',
      content: 'First',
      created_at: '2026-07-29T10:00:00Z',
      deleted_at: null,
    };
    const mockSingle = vi.fn().mockResolvedValue({ data: serverResponse, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

    const flushed = await announcementsRepository.flushPending();

    expect(flushed).toBe(2);
    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(db.removeFromOfflineAnnouncementsQueue).toHaveBeenCalledTimes(2);
    expect(db.removeAnnouncementFromCache).toHaveBeenCalledTimes(2);
    expect(db.saveAnnouncement).toHaveBeenCalledTimes(2);
  });

  it('returns 0 and makes no Supabase calls when the queue is empty', async () => {
    vi.mocked(db.loadOfflineAnnouncementsQueue).mockResolvedValue([]);

    const flushed = await announcementsRepository.flushPending();

    expect(flushed).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(db.removeFromOfflineAnnouncementsQueue).not.toHaveBeenCalled();
  });

  it('does not clear from queue when Supabase insert fails', async () => {
    const pending: Announcement[] = [
      { id: 'pending-fail', author_id: 'user1', content: 'Will fail', created_at: '2026-07-29T10:00:00Z', deleted_at: null },
    ];
    vi.mocked(db.loadOfflineAnnouncementsQueue).mockResolvedValue(pending);

    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'network error' } });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

    const flushed = await announcementsRepository.flushPending();

    expect(flushed).toBe(0);
    expect(db.removeFromOfflineAnnouncementsQueue).not.toHaveBeenCalled();
  });
});
