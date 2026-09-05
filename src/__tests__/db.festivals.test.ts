import { beforeEach, describe, expect, it } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

import {
  clearActiveFestivalPack,
  enqueueOfflineAnnouncement,
  enqueueOfflineAnnouncementReaction,
  enqueueOfflineBandRating,
  enqueueOfflineDuckQuack,
  enqueueOfflineMissed,
  enqueueOfflinePick,
  enqueueOfflinePresence,
  getActiveFestivalCacheVersion,
  getActiveFestivalId,
  loadFestivalCatalog,
  loadFestivalMemberships,
  loadAllAnnouncementReactions,
  loadAllBandRatings,
  loadAllMissedBands,
  loadAllUserPicks,
  loadAllUserPresence,
  loadAnnouncementsFromCache,
  loadBands,
  loadCacheVersion,
  loadCampLocation,
  loadCrewUsers,
  loadLiveBandTestConfig,
  loadMetalPlaceConfig,
  loadOfflineAnnouncementReactionsQueue,
  loadOfflineAnnouncementsQueue,
  loadOfflineBandRatingsQueue,
  loadOfflineDuckQuackQueue,
  loadOfflineMissedQueue,
  loadOfflinePresenceQueue,
  loadOfflineQueue,
  loadSession,
  loadUserBadgeHistory,
  replaceUserBadgeHistory,
  resetDbConnectionForTests,
  saveAnnouncementReaction,
  saveAnnouncements,
  saveBandRating,
  saveBands,
  saveCacheVersion,
  saveCampLocation,
  saveCrewUsers,
  saveLiveBandTestConfig,
  saveMetalPlaceConfig,
  saveMissedBand,
  saveSession,
  saveUserPick,
  saveUserPresence,
  saveFestivalCatalog,
  saveFestivalMemberships,
  setActiveFestivalCacheVersion,
  setActiveFestivalId,
} from '../lib/db';
import type {
  Announcement,
  Band,
  Festival,
  FestivalMembership,
  LiveBandTestConfig,
  MetalPlaceConfig,
  UserMissedBand,
  UserPick,
  UserPresence,
} from '../types';

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
  created_at: '2026-01-01T00:00:00.000Z',
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

const samplePresence = (userId: string): UserPresence => ({
  user_id: userId,
  is_camping: true,
  updated_at: '2026-05-01T12:00:00Z',
});

const sampleMetalPlaceConfig = (): MetalPlaceConfig => ({
  id: 1,
  label: 'Metal Place',
  windows: [
    {
      id: 'sample-window-1',
      festival_day: 1,
      start_time: '10:00',
      end_time: '22:00',
      sort_order: 0,
    },
  ],
  updated_by: 'godlike',
  updated_at: '2026-05-01T12:00:00Z',
});

const sampleLiveBandTestConfig = (): LiveBandTestConfig => ({
  band_id: 'band-1',
  enabled: true,
  updated_by: 'godlike',
  updated_at: '2026-05-01T12:00:00Z',
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

  describe('festival catalog + memberships cache', () => {
    it('save/load festival catalog and memberships round-trip', async () => {
      const catalog: Festival[] = [
        {
          id: 'wacken-2026',
          slug: 'wacken-2026',
          name: 'Wacken',
          timezone: 'Europe/Berlin',
          starts_at: '2026-07-27T00:00:00+02:00',
          ends_at: '2026-08-02T03:00:00+02:00',
          features: { map: true },
          cache_version: '1',
        },
      ];
      const memberships: FestivalMembership[] = [
        { user_id: 'user-1', festival_id: 'wacken-2026', opted_in_at: '2026-05-01T12:00:00Z' },
      ];

      expect(await loadFestivalCatalog()).toEqual([]);
      expect(await loadFestivalMemberships()).toEqual([]);

      await saveFestivalCatalog(catalog);
      await saveFestivalMemberships(memberships);

      expect(await loadFestivalCatalog()).toEqual(catalog);
      expect(await loadFestivalMemberships()).toEqual(memberships);
    });

    it('survives clearActiveFestivalPack (meta, not pack stores)', async () => {
      await saveFestivalCatalog([
        {
          id: 'wacken-2026',
          slug: 'wacken-2026',
          name: 'Wacken',
          timezone: 'Europe/Berlin',
          starts_at: '2026-07-27T00:00:00+02:00',
          ends_at: '2026-08-02T03:00:00+02:00',
          features: {},
          cache_version: '1',
        },
      ]);
      await saveFestivalMemberships([
        { user_id: 'user-1', festival_id: 'wacken-2026', opted_in_at: '2026-05-01T12:00:00Z' },
      ]);

      await clearActiveFestivalPack();

      expect(await loadFestivalCatalog()).toHaveLength(1);
      expect(await loadFestivalMemberships()).toHaveLength(1);
    });
  });

  describe('clearActiveFestivalPack', () => {
    it('clears festival social/grounds stores but keeps session, meta, badge history', async () => {
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
      await enqueueOfflineDuckQuack({
        id: 'quack-1',
        user_id: 'user-1',
        band_id: 'band-1',
        quacked_at: '2026-05-01T12:00:00Z',
      });
      await saveMetalPlaceConfig(sampleMetalPlaceConfig());
      await saveLiveBandTestConfig(sampleLiveBandTestConfig());
      await saveCampLocation({ lat: 54.037809, lng: 9.368845 });
      await replaceUserBadgeHistory(
        [
          {
            user_id: 'user-1',
            festival_year: 2026,
            slug: 'puppy',
            image_path: '/badges/badge_new-puppy.png',
            label_key: 'badgePuppy',
          },
        ],
        'user-1',
      );

      await saveSession({ token: 'keep' });
      await saveCacheVersion('global-v1');
      await setActiveFestivalId('wacken-2026');
      await setActiveFestivalCacheVersion('fest-v1');

      await clearActiveFestivalPack();

      expect(await loadBands()).toEqual([]);
      expect(await loadCrewUsers()).toEqual([]);
      expect(await loadAllUserPicks()).toEqual([]);
      expect(await loadOfflineQueue()).toEqual([]);
      expect(await loadAllUserPresence()).toEqual([]);
      expect(await loadOfflinePresenceQueue()).toEqual([]);
      expect(await loadAnnouncementsFromCache()).toEqual([]);
      expect(await loadOfflineAnnouncementsQueue()).toEqual([]);
      expect(await loadAllMissedBands()).toEqual([]);
      expect(await loadOfflineMissedQueue()).toEqual([]);
      expect(await loadAllBandRatings()).toEqual([]);
      expect(await loadOfflineBandRatingsQueue()).toEqual([]);
      expect(await loadAllAnnouncementReactions()).toEqual([]);
      expect(await loadOfflineAnnouncementReactionsQueue()).toEqual([]);
      expect(await loadOfflineDuckQuackQueue()).toEqual([]);
      expect(await loadMetalPlaceConfig()).toBeNull();
      expect(await loadLiveBandTestConfig()).toBeNull();
      expect(await loadCampLocation()).toBeNull();

      expect(await loadSession()).toEqual({ token: 'keep' });
      expect(await loadCacheVersion()).toBe('global-v1');
      expect(await getActiveFestivalId()).toBe('wacken-2026');
      expect(await getActiveFestivalCacheVersion()).toBe('fest-v1');
      expect(await loadUserBadgeHistory('user-1')).toEqual([
        {
          user_id: 'user-1',
          festival_year: 2026,
          slug: 'puppy',
          image_path: '/badges/badge_new-puppy.png',
          label_key: 'badgePuppy',
        },
      ]);
    });
  });
});
