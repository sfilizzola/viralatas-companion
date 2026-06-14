import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  saveAnnouncementReaction: vi.fn(),
  removeAnnouncementReaction: vi.fn(),
  loadAllAnnouncementReactions: vi.fn(),
  replaceAllAnnouncementReactions: vi.fn(),
  enqueueOfflineAnnouncementReaction: vi.fn(),
  loadOfflineAnnouncementReactionsQueue: vi.fn(),
  removeFromOfflineAnnouncementReactionsQueue: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../lib/realtimeSync', () => ({
  subscribePostgresChanges: vi.fn(() => () => {}),
}));

import { reactionsRepository } from '../repositories/reactions';
import {
  saveAnnouncementReaction,
  removeAnnouncementReaction,
  loadAllAnnouncementReactions,
  enqueueOfflineAnnouncementReaction,
} from '../lib/db';
import { supabase } from '../lib/supabase';
import { subscribePostgresChanges } from '../lib/realtimeSync';

const ANNOUNCEMENT_ID = 'ann-1';
const USER_ID = 'user-1';
const EMOJI = '🤘';

describe('reactionsRepository.toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveAnnouncementReaction).mockResolvedValue(undefined);
    vi.mocked(removeAnnouncementReaction).mockResolvedValue(undefined);
    vi.mocked(loadAllAnnouncementReactions).mockResolvedValue([]);
    vi.mocked(enqueueOfflineAnnouncementReaction).mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('writes to IDB and calls Supabase insert when online and new', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert } as ReturnType<typeof supabase.from>);

    await reactionsRepository.toggle(ANNOUNCEMENT_ID, USER_ID, EMOJI);

    expect(saveAnnouncementReaction).toHaveBeenCalledOnce();
    expect(supabase.from).toHaveBeenCalledWith('announcement_reactions');
    expect(insert).toHaveBeenCalledOnce();
    expect(enqueueOfflineAnnouncementReaction).not.toHaveBeenCalled();
  });

  it('removes from IDB and calls Supabase delete when toggling existing', async () => {
    vi.mocked(loadAllAnnouncementReactions).mockResolvedValue([
      {
        announcement_id: ANNOUNCEMENT_ID,
        user_id: USER_ID,
        emoji: EMOJI,
        created_at: '2026-06-14T12:00:00Z',
      },
    ]);
    const mockEq3 = vi.fn().mockResolvedValue({ error: null });
    const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
    vi.mocked(supabase.from).mockReturnValue({ delete: mockDelete } as ReturnType<typeof supabase.from>);

    await reactionsRepository.toggle(ANNOUNCEMENT_ID, USER_ID, EMOJI);

    expect(removeAnnouncementReaction).toHaveBeenCalledWith(ANNOUNCEMENT_ID, USER_ID, EMOJI);
    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockEq1).toHaveBeenCalledWith('announcement_id', ANNOUNCEMENT_ID);
    expect(mockEq2).toHaveBeenCalledWith('user_id', USER_ID);
    expect(mockEq3).toHaveBeenCalledWith('emoji', EMOJI);
  });

  it('enqueues add op when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    await reactionsRepository.toggle(ANNOUNCEMENT_ID, USER_ID, EMOJI);

    expect(saveAnnouncementReaction).toHaveBeenCalledOnce();
    expect(enqueueOfflineAnnouncementReaction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `${ANNOUNCEMENT_ID}|${USER_ID}|${EMOJI}`,
        op: 'add',
      }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('enqueues remove op when offline and existing', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    vi.mocked(loadAllAnnouncementReactions).mockResolvedValue([
      {
        announcement_id: ANNOUNCEMENT_ID,
        user_id: USER_ID,
        emoji: EMOJI,
        created_at: '2026-06-14T12:00:00Z',
      },
    ]);

    await reactionsRepository.toggle(ANNOUNCEMENT_ID, USER_ID, EMOJI);

    expect(removeAnnouncementReaction).toHaveBeenCalledOnce();
    expect(enqueueOfflineAnnouncementReaction).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'remove' }),
    );
  });
});

describe('reactionsRepository.subscribeToRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveAnnouncementReaction).mockResolvedValue(undefined);
    vi.mocked(removeAnnouncementReaction).mockResolvedValue(undefined);
  });

  it('registers INSERT and DELETE handlers', () => {
    reactionsRepository.subscribeToRealtime();
    expect(subscribePostgresChanges).toHaveBeenCalledWith(
      'announcement_reactions_live',
      expect.arrayContaining([
        expect.objectContaining({ filter: { event: 'INSERT', table: 'announcement_reactions' } }),
        expect.objectContaining({ filter: { event: 'DELETE', table: 'announcement_reactions' } }),
      ]),
    );
  });
});
