import { beforeEach, describe, expect, it } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

import {
  clearActiveFestivalPack,
  enqueueOfflineAnnouncement,
  enqueueOfflineAnnouncementReaction,
  enqueueOfflineBandRating,
  enqueueOfflineMissed,
  enqueueOfflinePick,
  getActiveFestivalCacheVersion,
  getActiveFestivalId,
  loadAllAnnouncementReactions,
  loadAllBandRatings,
  loadAllMissedBands,
  loadAllUserPicks,
  loadAnnouncementsFromCache,
  loadBands,
  loadCacheVersion,
  loadCrewUsers,
  loadOfflineAnnouncementReactionsQueue,
  loadOfflineAnnouncementsQueue,
  loadOfflineBandRatingsQueue,
  loadOfflineMissedQueue,
  loadOfflineQueue,
  loadSession,
  resetDbConnectionForTests,
  saveAnnouncementReaction,
  saveAnnouncements,
  saveBandRating,
  saveBands,
  saveCacheVersion,
  saveCrewUsers,
  saveMissedBand,
  saveSession,
  saveUserPick,
  setActiveFestivalCacheVersion,
  setActiveFestivalId,
} from '../lib/db';
import type { Announcement, Band, UserMissedBand, UserPick } from '../types';

const sampleBand: Band = {
  id: 'band-1',
  festival_id: 'wacken-2026',
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
  festival_id: 'wacken-2026',
  created_at: '2026-05-01T12:00:00Z',
});

const sampleAnnouncement = (id: string, createdAt: string): Announcement => ({
  id,
  festival_id: 'wacken-2026',
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

beforeEach(async () => {
  await resetDbConnectionForTests();
  await deleteViralatasDatabase();
});

describe('IndexedDB festival meta (lib/db/festivals.ts)', () => {
  describe('active festival id', () => {
    it('getActiveFestivalId / setActiveFestivalId round-trip', async () => {
      expect(await getActiveFestivalId()).toBeNull();

      await setActiveFestivalId('wacken-2026');
      expect(await getActiveFestivalId()).toBe('wacken-2026');

      await setActiveFestivalId('other-fest-2027');
      expect(await getActiveFestivalId()).toBe('other-fest-2027');
    });
  });

  describe('active festival cache version', () => {
    it('getActiveFestivalCacheVersion / setActiveFestivalCacheVersion round-trip', async () => {
      expect(await getActiveFestivalCacheVersion()).toBeNull();

      await setActiveFestivalCacheVersion('fest-v1');
      expect(await getActiveFestivalCacheVersion()).toBe('fest-v1');
    });
  });

  describe('clearActiveFestivalPack', () => {
    it('clears festival social stores but keeps session and evergreen meta', async () => {
      await saveBands([sampleBand]);
      await saveCrewUsers([
        { id: 'u1', display_name: 'Alice', avatar_url: null, wacken_arrival_day: null },
      ]);
      await saveUserPick(samplePick('user-1', 'band-1'));
      await enqueueOfflinePick({
        id: 'op-1',
        user_id: 'user-1',
        band_id: 'band-1',
        festival_id: 'wacken-2026',
        action: 'add',
        created_at: '2026-05-01T12:00:00Z',
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
      await saveBandRating({
        user_id: 'user-1',
        band_id: 'band-1',
        score: 5,
        rated_at: '2026-05-01T12:00:00Z',
      });
      await enqueueOfflineBandRating({
        id: 'user-1|band-1',
        user_id: 'user-1',
        band_id: 'band-1',
        action: 'upsert',
        score: 5,
        rated_at: '2026-05-01T12:00:00Z',
      });
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

      await saveSession({ token: 'keep' });
      await saveCacheVersion('global-v1');
      await setActiveFestivalId('wacken-2026');
      await setActiveFestivalCacheVersion('fest-v1');

      await clearActiveFestivalPack();

      expect(await loadBands()).toEqual([]);
      expect(await loadCrewUsers()).toEqual([]);
      expect(await loadAllUserPicks()).toEqual([]);
      expect(await loadOfflineQueue()).toEqual([]);
      expect(await loadAnnouncementsFromCache()).toEqual([]);
      expect(await loadOfflineAnnouncementsQueue()).toEqual([]);
      expect(await loadAllMissedBands()).toEqual([]);
      expect(await loadOfflineMissedQueue()).toEqual([]);
      expect(await loadAllBandRatings()).toEqual([]);
      expect(await loadOfflineBandRatingsQueue()).toEqual([]);
      expect(await loadAllAnnouncementReactions()).toEqual([]);
      expect(await loadOfflineAnnouncementReactionsQueue()).toEqual([]);

      expect(await loadSession()).toEqual({ token: 'keep' });
      expect(await loadCacheVersion()).toBe('global-v1');
      expect(await getActiveFestivalId()).toBe('wacken-2026');
      expect(await getActiveFestivalCacheVersion()).toBe('fest-v1');
    });
  });
});
