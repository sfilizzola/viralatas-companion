import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

import {
  ANNOUNCEMENTS_CHANGED_EVENT,
  BANDS_CHANGED_EVENT,
  CREW_USERS_CHANGED_EVENT,
  PICKS_CHANGED_EVENT,
  PRESENCE_CHANGED_EVENT,
  clearSession,
  enqueueOfflinePick,
  loadAllUserPicks,
  loadAnnouncementsFromCache,
  loadBands,
  loadCacheVersion,
  loadCrewUsers,
  loadLatestAnnouncement,
  loadOfflineQueue,
  loadSession,
  loadUserPicks,
  loadUserPresence,
  removeFromOfflineQueue,
  removeUserPick,
  replaceUserPicks,
  resetDbConnectionForTests,
  saveAnnouncement,
  saveAnnouncements,
  saveBands,
  saveCacheVersion,
  saveCrewUsers,
  saveSession,
  saveUserPick,
  saveUserPresence,
  wipeAllLocalData,
} from '../lib/db';
import type { Announcement, Band, CrewUser, UserPick, UserPresence } from '../types';

const sampleBand: Band = {
  id: 'band-1',
  slot_id: 'FAS1',
  name: 'Test Band',
  stage: 'Faster',
  start_time: '2026-07-29T18:00:00Z',
  end_time: '2026-07-29T19:00:00Z',
  image_url: null,
  genre: 'Thrash',
  category: 'band',
};

const samplePick = (userId: string, bandId: string): UserPick => ({
  user_id: userId,
  band_id: bandId,
  created_at: '2026-05-01T12:00:00Z',
});

const samplePresence = (userId: string): UserPresence => ({
  user_id: userId,
  is_camping: true,
  updated_at: '2026-05-01T12:00:00Z',
});

const sampleAnnouncement = (id: string, createdAt: string): Announcement => ({
  id,
  author_id: 'user-1',
  content: `Announcement ${id}`,
  created_at: createdAt,
  deleted_at: null,
  is_pinned: false,
});

beforeEach(async () => {
  await resetDbConnectionForTests();
  await deleteViralatasDatabase();
});

describe('IndexedDB layer (lib/db.ts)', () => {
  describe('session', () => {
    it('saveSession / loadSession round-trip', async () => {
      await saveSession({ 'viralatas-auth': '{"access_token":"abc"}' });
      await expect(loadSession()).resolves.toEqual({ 'viralatas-auth': '{"access_token":"abc"}' });
    });

    it('clearSession removes stored session', async () => {
      await saveSession({ token: 'x' });
      await clearSession();
      await expect(loadSession()).resolves.toBeUndefined();
    });
  });

  describe('bands', () => {
    it('saveBands / loadBands round-trip', async () => {
      await saveBands([sampleBand]);
      const bands = await loadBands();
      expect(bands).toHaveLength(1);
      expect(bands[0]).toEqual(sampleBand);
    });

    it('fires BANDS_CHANGED_EVENT after saveBands', async () => {
      const handler = vi.fn();
      window.addEventListener(BANDS_CHANGED_EVENT, handler);
      await saveBands([sampleBand]);
      expect(handler).toHaveBeenCalledOnce();
      window.removeEventListener(BANDS_CHANGED_EVENT, handler);
    });
  });

  describe('crew users', () => {
    it('saveCrewUsers replaces roster and emits CREW_USERS_CHANGED_EVENT', async () => {
      const handler = vi.fn();
      window.addEventListener(CREW_USERS_CHANGED_EVENT, handler);

      const users: CrewUser[] = [
        { id: 'u1', display_name: 'Alice', avatar_url: null, wacken_arrival_day: null },
      ];
      await saveCrewUsers(users);

      expect(await loadCrewUsers()).toEqual(users);
      expect(handler).toHaveBeenCalledTimes(1);
      window.removeEventListener(CREW_USERS_CHANGED_EVENT, handler);
    });
  });

  describe('user picks', () => {
    it('saveUserPick / loadUserPicks round-trip', async () => {
      const pick = samplePick('user-1', 'band-1');
      await saveUserPick(pick);
      expect(await loadUserPicks('user-1')).toEqual([pick]);
    });

    it('removeUserPick deletes a pick', async () => {
      await saveUserPick(samplePick('user-1', 'band-1'));
      await removeUserPick('user-1', 'band-1');
      expect(await loadUserPicks('user-1')).toEqual([]);
    });

    it('replaceUserPicks scoped to one user leaves other users intact', async () => {
      await saveUserPick(samplePick('user-1', 'band-1'));
      await saveUserPick(samplePick('user-2', 'band-2'));
      await replaceUserPicks([samplePick('user-1', 'band-3')], 'user-1');

      expect(await loadUserPicks('user-1')).toEqual([samplePick('user-1', 'band-3')]);
      expect(await loadUserPicks('user-2')).toEqual([samplePick('user-2', 'band-2')]);
    });

    it('replaceUserPicks without userId clears all picks', async () => {
      await saveUserPick(samplePick('user-1', 'band-1'));
      await saveUserPick(samplePick('user-2', 'band-2'));
      await replaceUserPicks([samplePick('user-1', 'band-9')]);

      const all = await loadAllUserPicks();
      expect(all).toHaveLength(1);
      expect(all[0].band_id).toBe('band-9');
    });

    it('fires PICKS_CHANGED_EVENT after save and remove', async () => {
      const handler = vi.fn();
      window.addEventListener(PICKS_CHANGED_EVENT, handler);

      await saveUserPick(samplePick('user-1', 'band-1'));
      await removeUserPick('user-1', 'band-1');

      expect(handler).toHaveBeenCalledTimes(2);
      window.removeEventListener(PICKS_CHANGED_EVENT, handler);
    });
  });

  describe('offline pick queue', () => {
    it('enqueueOfflinePick / loadOfflineQueue / removeFromOfflineQueue', async () => {
      const op = {
        id: 'op-1',
        user_id: 'user-1',
        band_id: 'band-1',
        action: 'add' as const,
        created_at: '2026-05-01T12:00:00Z',
      };

      await enqueueOfflinePick(op);
      expect(await loadOfflineQueue()).toEqual([op]);

      await removeFromOfflineQueue('op-1');
      expect(await loadOfflineQueue()).toEqual([]);
    });
  });

  describe('presence', () => {
    it('saveUserPresence / loadUserPresence round-trip', async () => {
      const presence = samplePresence('user-1');
      await saveUserPresence(presence);
      expect(await loadUserPresence('user-1')).toEqual(presence);
    });

    it('fires PRESENCE_CHANGED_EVENT after saveUserPresence', async () => {
      const handler = vi.fn();
      window.addEventListener(PRESENCE_CHANGED_EVENT, handler);

      await saveUserPresence(samplePresence('user-1'));
      expect(handler).toHaveBeenCalledTimes(1);
      window.removeEventListener(PRESENCE_CHANGED_EVENT, handler);
    });
  });

  describe('announcements', () => {
    it('loadLatestAnnouncement returns the most recent created_at', async () => {
      await saveAnnouncements([
        sampleAnnouncement('a-old', '2026-05-01T10:00:00Z'),
        sampleAnnouncement('a-new', '2026-05-01T12:00:00Z'),
      ]);

      const latest = await loadLatestAnnouncement();
      expect(latest?.id).toBe('a-new');
    });

    it('loadAnnouncementsFromCache sorts newest first', async () => {
      await saveAnnouncement(sampleAnnouncement('a-old', '2026-05-01T10:00:00Z'));
      await saveAnnouncement(sampleAnnouncement('a-new', '2026-05-01T12:00:00Z'));

      const cached = await loadAnnouncementsFromCache();
      expect(cached.map((a) => a.id)).toEqual(['a-new', 'a-old']);
    });

    it('fires ANNOUNCEMENTS_CHANGED_EVENT after saveAnnouncement', async () => {
      const handler = vi.fn();
      window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handler);

      await saveAnnouncement(sampleAnnouncement('a-1', '2026-05-01T12:00:00Z'));
      expect(handler).toHaveBeenCalledTimes(1);
      window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handler);
    });
  });

  describe('cache version and wipe', () => {
    it('saveCacheVersion / loadCacheVersion round-trip', async () => {
      await saveCacheVersion('v42');
      expect(await loadCacheVersion()).toBe('v42');
    });

    it('wipeAllLocalData clears synced stores but keeps session and meta', async () => {
      await saveBands([sampleBand]);
      await saveUserPick(samplePick('user-1', 'band-1'));
      await saveSession({ token: 'keep' });
      await saveCacheVersion('v1');

      await wipeAllLocalData();

      expect(await loadBands()).toEqual([]);
      expect(await loadAllUserPicks()).toEqual([]);
      expect(await loadSession()).toEqual({ token: 'keep' });
      expect(await loadCacheVersion()).toBe('v1');
    });
  });
});
