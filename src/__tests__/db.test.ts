import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

import {
  ANNOUNCEMENTS_CHANGED_EVENT,
  BANDS_CHANGED_EVENT,
  CREW_USERS_CHANGED_EVENT,
  LIVE_BAND_TEST_CONFIG_CHANGED_EVENT,
  METAL_PLACE_CONFIG_CHANGED_EVENT,
  MISSED_CHANGED_EVENT,
  PICKS_CHANGED_EVENT,
  PRESENCE_CHANGED_EVENT,
  clearLiveBandTestConfig,
  clearMetalPlaceConfig,
  clearSession,
  enqueueOfflineAnnouncement,
  enqueueOfflineDuckQuack,
  enqueueOfflineMissed,
  enqueueOfflinePick,
  enqueueOfflinePresence,
  enqueueOfflineAnnouncementReaction,
  loadAllAnnouncementReactions,
  loadAnnouncementReactionsByAnnouncement,
  loadAllMissedBands,
  loadAllUserPicks,
  loadAllUserPresence,
  loadAnnouncementsFromCache,
  loadBands,
  loadCacheVersion,
  loadCrewUsers,
  loadLatestAnnouncement,
  loadLiveBandTestConfig,
  loadMetalPlaceConfig,
  loadMissedBands,
  loadOfflineAnnouncementsQueue,
  loadOfflineAnnouncementReactionsQueue,
  loadOfflineDuckQuackQueue,
  loadOfflineMissedQueue,
  loadOfflinePresenceQueue,
  loadOfflineQueue,
  loadSession,
  loadUserBadgeHistory,
  loadUserPicks,
  loadUserPresence,
  removeAnnouncementFromCache,
  removeAnnouncementReaction,
  removeAnnouncementReactionsForPost,
  removeFromOfflineAnnouncementsQueue,
  removeFromOfflineAnnouncementReactionsQueue,
  removeFromOfflineDuckQuackQueue,
  removeFromOfflineMissedQueue,
  removeFromOfflinePresenceQueue,
  removeFromOfflineQueue,
  removeMissedBand,
  removeUserPick,
  replaceUserMissedBands,
  replaceUserBadgeHistory,
  replaceUserPicks,
  replaceUserPresence,
  replaceAllAnnouncementReactions,
  resetDbConnectionForTests,
  saveAnnouncement,
  saveAnnouncementReaction,
  saveAnnouncements,
  saveBands,
  saveCacheVersion,
  saveCrewUsers,
  saveLiveBandTestConfig,
  saveMetalPlaceConfig,
  saveMissedBand,
  saveSession,
  saveUserPick,
  saveUserPresence,
  VIRALATAS_OBJECT_STORES,
  WIPE_PRESERVED_OBJECT_STORES,
  wipeAllLocalData,
  wipeTargetObjectStores,
} from '../lib/db';
import type {
  Announcement,
  Band,
  CrewUser,
  LiveBandTestConfig,
  MetalPlaceConfig,
  UserMissedBand,
  UserPick,
  UserPresence,
} from '../types';

const EXPECTED_OBJECT_STORES = VIRALATAS_OBJECT_STORES;
const WIPE_CLEARED_STORES = wipeTargetObjectStores();
const WIPE_PRESERVED_STORES = WIPE_PRESERVED_OBJECT_STORES;

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

const samplePresence = (userId: string, overrides: Partial<UserPresence> = {}): UserPresence => ({
  user_id: userId,
  is_camping: true,
  updated_at: '2026-05-01T12:00:00Z',
  ...overrides,
});

const sampleAnnouncement = (id: string, createdAt: string): Announcement => ({
  id,
  author_id: 'user-1',
  content: `Announcement ${id}`,
  created_at: createdAt,
  deleted_at: null,
  is_pinned: false,
});

const sampleMissed = (userId: string, bandId: string): UserMissedBand => ({
  user_id: userId,
  band_id: bandId,
  marked_at: '2026-05-01T12:00:00Z',
});

const sampleMetalPlaceConfig = (): MetalPlaceConfig => ({
  festival_day: 1,
  start_time: '2026-07-29T10:00:00Z',
  end_time: '2026-07-29T22:00:00Z',
  label: 'Metal Place',
  updated_by: 'godlike',
  updated_at: '2026-05-01T12:00:00Z',
});

const sampleLiveBandTestConfig = (): LiveBandTestConfig => ({
  band_id: 'band-1',
  enabled: true,
  updated_by: 'godlike',
  updated_at: '2026-05-01T12:00:00Z',
});

async function getObjectStoreNames(): Promise<string[]> {
  await loadSession();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('viralatas-db');
    request.onsuccess = () => {
      const names = Array.from(request.result.objectStoreNames).sort();
      request.result.close();
      resolve(names);
    };
    request.onerror = () => reject(request.error ?? new Error('open failed'));
  });
}

beforeEach(async () => {
  await resetDbConnectionForTests();
  await deleteViralatasDatabase();
});

describe('IndexedDB layer (lib/db.ts)', () => {
  describe('event constants', () => {
    it('exports all 8 window event names under viralatas: namespace', () => {
      expect(BANDS_CHANGED_EVENT).toBe('viralatas:bands-changed');
      expect(PICKS_CHANGED_EVENT).toBe('viralatas:picks-changed');
      expect(CREW_USERS_CHANGED_EVENT).toBe('viralatas:crew-users-changed');
      expect(PRESENCE_CHANGED_EVENT).toBe('viralatas:presence-changed');
      expect(ANNOUNCEMENTS_CHANGED_EVENT).toBe('viralatas:announcements-changed');
      expect(METAL_PLACE_CONFIG_CHANGED_EVENT).toBe('viralatas:metal-place-config-changed');
      expect(LIVE_BAND_TEST_CONFIG_CHANGED_EVENT).toBe('viralatas:live-band-test-config-changed');
      expect(MISSED_CHANGED_EVENT).toBe('viralatas:missed-changed');
    });
  });

  describe('connection', () => {
    it('creates all object stores on first open', async () => {
      const storeNames = await getObjectStoreNames();
      expect(storeNames).toEqual([...EXPECTED_OBJECT_STORES].sort());
    });
  });

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

    it('loadAllUserPresence returns all presence rows', async () => {
      await saveUserPresence(samplePresence('user-1'));
      await saveUserPresence(samplePresence('user-2', { is_camping: false }));
      const all = await loadAllUserPresence();
      expect(all).toHaveLength(2);
      expect(all.map((p) => p.user_id).sort()).toEqual(['user-1', 'user-2']);
    });

    it('replaceUserPresence scoped to one user leaves other users intact', async () => {
      await saveUserPresence(samplePresence('user-1'));
      await saveUserPresence(samplePresence('user-2', { is_camping: false }));

      await replaceUserPresence([samplePresence('user-1', { is_at_metal_place: true })], 'user-1');

      expect(await loadUserPresence('user-1')).toEqual(
        samplePresence('user-1', { is_at_metal_place: true }),
      );
      expect(await loadUserPresence('user-2')).toEqual(
        samplePresence('user-2', { is_camping: false }),
      );
    });

    it('replaceUserPresence without userId clears all presence', async () => {
      await saveUserPresence(samplePresence('user-1'));
      await saveUserPresence(samplePresence('user-2'));

      await replaceUserPresence([samplePresence('user-3')]);

      const all = await loadAllUserPresence();
      expect(all).toHaveLength(1);
      expect(all[0].user_id).toBe('user-3');
    });

    it('fires PRESENCE_CHANGED_EVENT after saveUserPresence and replaceUserPresence', async () => {
      const handler = vi.fn();
      window.addEventListener(PRESENCE_CHANGED_EVENT, handler);

      await saveUserPresence(samplePresence('user-1'));
      await replaceUserPresence([samplePresence('user-2')]);

      expect(handler).toHaveBeenCalledTimes(2);
      window.removeEventListener(PRESENCE_CHANGED_EVENT, handler);
    });
  });

  describe('offline presence queue', () => {
    it('enqueueOfflinePresence / loadOfflinePresenceQueue / removeFromOfflinePresenceQueue', async () => {
      const op = {
        id: 'presence-op-1',
        user_id: 'user-1',
        is_camping: true,
        updated_at: '2026-05-01T12:00:00Z',
      };

      await enqueueOfflinePresence(op);
      expect(await loadOfflinePresenceQueue()).toEqual([op]);

      await removeFromOfflinePresenceQueue('presence-op-1');
      expect(await loadOfflinePresenceQueue()).toEqual([]);
    });
  });

  describe('announcements', () => {
    it('saveAnnouncements bulk replace clears prior rows and emits event', async () => {
      const handler = vi.fn();
      window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handler);

      await saveAnnouncement(sampleAnnouncement('a-old', '2026-05-01T10:00:00Z'));
      await saveAnnouncements([
        sampleAnnouncement('a-new-1', '2026-05-01T11:00:00Z'),
        sampleAnnouncement('a-new-2', '2026-05-01T12:00:00Z'),
      ]);

      const cached = await loadAnnouncementsFromCache();
      expect(cached.map((a) => a.id)).toEqual(['a-new-2', 'a-new-1']);
      expect(handler).toHaveBeenCalledTimes(2);
      window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handler);
    });

    it('removeAnnouncementFromCache deletes one row and emits event', async () => {
      const handler = vi.fn();
      window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handler);

      await saveAnnouncements([
        sampleAnnouncement('a-keep', '2026-05-01T11:00:00Z'),
        sampleAnnouncement('a-drop', '2026-05-01T10:00:00Z'),
      ]);
      await removeAnnouncementFromCache('a-drop');

      expect(await loadAnnouncementsFromCache()).toEqual([
        sampleAnnouncement('a-keep', '2026-05-01T11:00:00Z'),
      ]);
      expect(handler).toHaveBeenCalledTimes(2);
      window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handler);
    });

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

  describe('offline announcement queue', () => {
    it('enqueueOfflineAnnouncement / loadOfflineAnnouncementsQueue / removeFromOfflineAnnouncementsQueue', async () => {
      const pending = sampleAnnouncement('pending-1', '2026-05-01T12:00:00Z');

      await enqueueOfflineAnnouncement(pending);
      expect(await loadOfflineAnnouncementsQueue()).toEqual([pending]);

      await removeFromOfflineAnnouncementsQueue('pending-1');
      expect(await loadOfflineAnnouncementsQueue()).toEqual([]);
    });
  });

  describe('announcement reactions', () => {
    const sampleReaction = (announcementId: string, userId: string, emoji: string) => ({
      announcement_id: announcementId,
      user_id: userId,
      emoji,
      created_at: '2026-06-14T12:00:00Z',
    });

    it('saveAnnouncementReaction / loadAnnouncementReactionsByAnnouncement round-trip', async () => {
      await saveAnnouncementReaction(sampleReaction('ann-1', 'user-1', '🤘'));
      await saveAnnouncementReaction(sampleReaction('ann-1', 'user-2', '🍺'));
      await saveAnnouncementReaction(sampleReaction('ann-2', 'user-1', '🤘'));

      expect(await loadAnnouncementReactionsByAnnouncement('ann-1')).toHaveLength(2);
      expect(await loadAllAnnouncementReactions()).toHaveLength(3);
    });

    it('removeAnnouncementReaction deletes one row', async () => {
      await saveAnnouncementReaction(sampleReaction('ann-1', 'user-1', '🤘'));
      await removeAnnouncementReaction('ann-1', 'user-1', '🤘');
      expect(await loadAllAnnouncementReactions()).toEqual([]);
    });

    it('replaceAllAnnouncementReactions clears and bulk puts', async () => {
      await saveAnnouncementReaction(sampleReaction('ann-old', 'user-1', '🤘'));
      await replaceAllAnnouncementReactions([sampleReaction('ann-new', 'user-2', '🔥')]);
      expect(await loadAllAnnouncementReactions()).toEqual([
        sampleReaction('ann-new', 'user-2', '🔥'),
      ]);
    });

    it('removeAnnouncementReactionsForPost purges all rows for announcement', async () => {
      await saveAnnouncementReaction(sampleReaction('ann-1', 'user-1', '🤘'));
      await saveAnnouncementReaction(sampleReaction('ann-1', 'user-2', '🍺'));
      await saveAnnouncementReaction(sampleReaction('ann-2', 'user-1', '🤘'));
      await removeAnnouncementReactionsForPost('ann-1');
      expect(await loadAllAnnouncementReactions()).toEqual([
        sampleReaction('ann-2', 'user-1', '🤘'),
      ]);
    });

    it('fires ANNOUNCEMENTS_CHANGED_EVENT after saveAnnouncementReaction', async () => {
      const handler = vi.fn();
      window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handler);
      await saveAnnouncementReaction(sampleReaction('ann-1', 'user-1', '🤘'));
      expect(handler).toHaveBeenCalledOnce();
      window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handler);
    });
  });

  describe('offline announcement reactions queue', () => {
    it('enqueueOfflineAnnouncementReaction / load / remove', async () => {
      const op = {
        id: 'ann-1|user-1|🤘',
        announcement_id: 'ann-1',
        user_id: 'user-1',
        emoji: '🤘',
        op: 'add' as const,
      };

      await enqueueOfflineAnnouncementReaction(op);
      expect(await loadOfflineAnnouncementReactionsQueue()).toEqual([op]);

      await removeFromOfflineAnnouncementReactionsQueue('ann-1|user-1|🤘');
      expect(await loadOfflineAnnouncementReactionsQueue()).toEqual([]);
    });
  });

  describe('metal place config', () => {
    it('saveMetalPlaceConfig / loadMetalPlaceConfig round-trip', async () => {
      const config = sampleMetalPlaceConfig();
      await saveMetalPlaceConfig(config);
      expect(await loadMetalPlaceConfig()).toEqual(config);
    });

    it('clearMetalPlaceConfig removes stored config', async () => {
      await saveMetalPlaceConfig(sampleMetalPlaceConfig());
      await clearMetalPlaceConfig();
      expect(await loadMetalPlaceConfig()).toBeNull();
    });

    it('fires METAL_PLACE_CONFIG_CHANGED_EVENT after saveMetalPlaceConfig', async () => {
      const handler = vi.fn();
      window.addEventListener(METAL_PLACE_CONFIG_CHANGED_EVENT, handler);

      await saveMetalPlaceConfig(sampleMetalPlaceConfig());
      expect(handler).toHaveBeenCalledOnce();
      window.removeEventListener(METAL_PLACE_CONFIG_CHANGED_EVENT, handler);
    });
  });

  describe('live band test config', () => {
    it('saveLiveBandTestConfig / loadLiveBandTestConfig round-trip', async () => {
      const config = sampleLiveBandTestConfig();
      await saveLiveBandTestConfig(config);
      expect(await loadLiveBandTestConfig()).toEqual(config);
    });

    it('clearLiveBandTestConfig removes stored config', async () => {
      await saveLiveBandTestConfig(sampleLiveBandTestConfig());
      await clearLiveBandTestConfig();
      expect(await loadLiveBandTestConfig()).toBeNull();
    });

    it('fires LIVE_BAND_TEST_CONFIG_CHANGED_EVENT after saveLiveBandTestConfig', async () => {
      const handler = vi.fn();
      window.addEventListener(LIVE_BAND_TEST_CONFIG_CHANGED_EVENT, handler);

      await saveLiveBandTestConfig(sampleLiveBandTestConfig());
      expect(handler).toHaveBeenCalledOnce();
      window.removeEventListener(LIVE_BAND_TEST_CONFIG_CHANGED_EVENT, handler);
    });
  });

  describe('missed bands', () => {
    it('saveMissedBand / loadMissedBands round-trip', async () => {
      const record = sampleMissed('user-1', 'band-1');
      await saveMissedBand(record);
      expect(await loadMissedBands('user-1')).toEqual([record]);
    });

    it('removeMissedBand deletes a record', async () => {
      await saveMissedBand(sampleMissed('user-1', 'band-1'));
      await removeMissedBand('user-1', 'band-1');
      expect(await loadMissedBands('user-1')).toEqual([]);
    });

    it('loadAllMissedBands returns all records', async () => {
      await saveMissedBand(sampleMissed('user-1', 'band-1'));
      await saveMissedBand(sampleMissed('user-2', 'band-2'));
      expect(await loadAllMissedBands()).toHaveLength(2);
    });

    it('replaceUserMissedBands scoped to one user leaves other users intact', async () => {
      await saveMissedBand(sampleMissed('user-1', 'band-1'));
      await saveMissedBand(sampleMissed('user-2', 'band-2'));

      await replaceUserMissedBands([sampleMissed('user-1', 'band-9')], 'user-1');

      expect(await loadMissedBands('user-1')).toEqual([sampleMissed('user-1', 'band-9')]);
      expect(await loadMissedBands('user-2')).toEqual([sampleMissed('user-2', 'band-2')]);
    });

    it('fires MISSED_CHANGED_EVENT after save, remove, and replace', async () => {
      const handler = vi.fn();
      window.addEventListener(MISSED_CHANGED_EVENT, handler);

      await saveMissedBand(sampleMissed('user-1', 'band-1'));
      await removeMissedBand('user-1', 'band-1');
      await replaceUserMissedBands([sampleMissed('user-1', 'band-2')], 'user-1');

      expect(handler).toHaveBeenCalledTimes(3);
      window.removeEventListener(MISSED_CHANGED_EVENT, handler);
    });
  });

  describe('offline missed queue', () => {
    it('enqueueOfflineMissed / loadOfflineMissedQueue / removeFromOfflineMissedQueue', async () => {
      const op = {
        id: 'user-1|band-1',
        user_id: 'user-1',
        band_id: 'band-1',
        action: 'add' as const,
        marked_at: '2026-05-01T12:00:00Z',
      };

      await enqueueOfflineMissed(op);
      expect(await loadOfflineMissedQueue()).toEqual([op]);

      await removeFromOfflineMissedQueue('user-1|band-1');
      expect(await loadOfflineMissedQueue()).toEqual([]);
    });
  });

  describe('offline duck quack queue', () => {
    it('enqueueOfflineDuckQuack / loadOfflineDuckQuackQueue / removeFromOfflineDuckQuackQueue', async () => {
      const op = {
        id: 'quack-1',
        user_id: 'user-1',
        band_id: 'band-1',
        quacked_at: '2026-05-01T12:00:00Z',
      };

      await enqueueOfflineDuckQuack(op);
      expect(await loadOfflineDuckQuackQueue()).toEqual([op]);

      await removeFromOfflineDuckQuackQueue('quack-1');
      expect(await loadOfflineDuckQuackQueue()).toEqual([]);
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

    it('wipeAllLocalData clears all non-session/meta stores and preserves cache_version', async () => {
      await saveBands([sampleBand]);
      await saveCrewUsers([
        { id: 'u1', display_name: 'Alice', avatar_url: null, wacken_arrival_day: null },
      ]);
      await saveUserPick(samplePick('user-1', 'band-1'));
      await enqueueOfflinePick({
        id: 'op-1',
        user_id: 'user-1',
        band_id: 'band-1',
        action: 'add',
        created_at: '2026-05-01T12:00:00Z',
      });
      await saveUserPresence(samplePresence('user-1'));
      await enqueueOfflinePresence({
        id: 'presence-op-1',
        user_id: 'user-1',
        is_camping: true,
        updated_at: '2026-05-01T12:00:00Z',
      });
      await saveAnnouncements([sampleAnnouncement('a-1', '2026-05-01T12:00:00Z')]);
      await enqueueOfflineAnnouncement(sampleAnnouncement('pending-1', '2026-05-01T12:00:00Z'));
      await saveMissedBand(sampleMissed('user-1', 'band-1'));
      await enqueueOfflineMissed({
        id: 'user-1|band-1',
        user_id: 'user-1',
        band_id: 'band-1',
        action: 'add',
        marked_at: '2026-05-01T12:00:00Z',
      });

      await saveSession({ token: 'keep' });
      await saveCacheVersion('v1');
      await saveMetalPlaceConfig(sampleMetalPlaceConfig());
      await saveLiveBandTestConfig(sampleLiveBandTestConfig());
      await enqueueOfflineDuckQuack({
        id: 'quack-1',
        user_id: 'user-1',
        band_id: 'band-1',
        quacked_at: '2026-05-01T12:00:00Z',
      });
      await replaceUserBadgeHistory(
        [{
          user_id: 'user-1',
          festival_year: 2026,
          slug: 'puppy',
          image_path: '/badges/badge_new-puppy.png',
          label_key: 'badgePuppy',
        }],
        'user-1',
      );
      await saveAnnouncementReaction({
        announcement_id: 'a-1',
        user_id: 'user-1',
        emoji: '🤘',
        created_at: '2026-05-01T12:00:00Z',
      });
      await enqueueOfflineAnnouncementReaction({
        id: 'a-1|user-1|🤘',
        announcement_id: 'a-1',
        user_id: 'user-1',
        emoji: '🤘',
        op: 'add',
      });

      await wipeAllLocalData();

      for (const store of WIPE_CLEARED_STORES) {
        switch (store) {
          case 'bands':
            expect(await loadBands(), `${store} should be cleared`).toEqual([]);
            break;
          case 'crew_users':
            expect(await loadCrewUsers(), `${store} should be cleared`).toEqual([]);
            break;
          case 'user_picks':
            expect(await loadAllUserPicks(), `${store} should be cleared`).toEqual([]);
            break;
          case 'offline_picks':
            expect(await loadOfflineQueue(), `${store} should be cleared`).toEqual([]);
            break;
          case 'user_presence':
            expect(await loadAllUserPresence(), `${store} should be cleared`).toEqual([]);
            break;
          case 'offline_presence':
            expect(await loadOfflinePresenceQueue(), `${store} should be cleared`).toEqual([]);
            break;
          case 'announcements':
            expect(await loadAnnouncementsFromCache(), `${store} should be cleared`).toEqual([]);
            break;
          case 'pending_announcements':
            expect(await loadOfflineAnnouncementsQueue(), `${store} should be cleared`).toEqual([]);
            break;
          case 'user_missed_bands':
            expect(await loadAllMissedBands(), `${store} should be cleared`).toEqual([]);
            break;
          case 'offline_missed_bands':
            expect(await loadOfflineMissedQueue(), `${store} should be cleared`).toEqual([]);
            break;
          case 'metal_place_config':
            expect(await loadMetalPlaceConfig(), `${store} should be cleared`).toBeNull();
            break;
          case 'live_band_test_config':
            expect(await loadLiveBandTestConfig(), `${store} should be cleared`).toBeNull();
            break;
          case 'offline_duck_quacks':
            expect(await loadOfflineDuckQuackQueue(), `${store} should be cleared`).toEqual([]);
            break;
          case 'user_badge_history':
            expect(await loadUserBadgeHistory('user-1'), `${store} should be cleared`).toEqual([]);
            break;
          case 'announcement_reactions':
            expect(await loadAllAnnouncementReactions(), `${store} should be cleared`).toEqual([]);
            break;
          case 'offline_announcement_reactions':
            expect(await loadOfflineAnnouncementReactionsQueue(), `${store} should be cleared`).toEqual([]);
            break;
        }
      }

      expect(await loadSession()).toEqual({ token: 'keep' });
      expect(await loadCacheVersion()).toBe('v1');

      expect(WIPE_CLEARED_STORES).toHaveLength(18);
      expect(WIPE_PRESERVED_STORES).toHaveLength(2);
      expect(WIPE_CLEARED_STORES.length + WIPE_PRESERVED_STORES.length).toBe(
        EXPECTED_OBJECT_STORES.length,
      );
    });

    it('wipeTargetObjectStores covers every schema store except session and meta', () => {
      expect([...WIPE_CLEARED_STORES].sort()).toEqual(
        [...EXPECTED_OBJECT_STORES]
          .filter((name) => !WIPE_PRESERVED_STORES.includes(name as (typeof WIPE_PRESERVED_STORES)[number]))
          .sort(),
      );
    });
  });
});
