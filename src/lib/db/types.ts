import type {
  Announcement,
  Band,
  BandRatingScore,
  CrewUser,
  LiveBandTestConfig,
  MetalPlaceConfig,
  UserBadgeHistory,
  UserMissedBand,
  UserBandRating,
  UserPick,
  UserPresence,
} from '../../types';

export type OfflinePickOp = {
  id: string;
  user_id: string;
  band_id: string;
  action: 'add' | 'remove';
  created_at: string;
};

export type OfflineMissedOp = {
  id: string; // `${user_id}|${band_id}`
  user_id: string;
  band_id: string;
  action: 'add' | 'remove';
  marked_at: string;
};

export type OfflineBandRatingOp =
  | { id: string; user_id: string; band_id: string; action: 'upsert'; score: BandRatingScore; rated_at: string }
  | { id: string; user_id: string; band_id: string; action: 'remove'; rated_at: string };

export type OfflinePresenceOp = UserPresence & {
  id: string;
};

export type OfflineDuckQuackOp = {
  id: string;
  user_id: string;
  band_id: string;
  quacked_at: string;
};

export type ViralatasDB = {
  session: {
    key: string;
    value: unknown;
  };
  bands: {
    key: string;
    value: Band;
  };
  crew_users: {
    key: string;
    value: CrewUser;
  };
  user_picks: {
    key: [string, string];
    value: UserPick;
    indexes: { by_user: string };
  };
  offline_picks: {
    key: string;
    value: OfflinePickOp;
  };
  user_presence: {
    key: string;
    value: UserPresence;
  };
  offline_presence: {
    key: string;
    value: OfflinePresenceOp;
  };
  announcements: {
    key: string;
    value: Announcement;
  };
  pending_announcements: {
    key: string;
    value: Announcement;
  };
  metal_place_config: {
    key: string;
    value: MetalPlaceConfig;
  };
  live_band_test_config: {
    key: string;
    value: LiveBandTestConfig;
  };
  meta: {
    key: string;
    value: { cache_version: string };
  };
  user_missed_bands: {
    key: [string, string];
    value: UserMissedBand;
    indexes: { by_user: string };
  };
  offline_missed_bands: {
    key: string;
    value: OfflineMissedOp;
  };
  user_band_ratings: {
    key: [string, string];
    value: UserBandRating;
    indexes: { by_user: string };
  };
  offline_band_ratings: {
    key: string;
    value: OfflineBandRatingOp;
  };
  offline_duck_quacks: {
    key: string;
    value: OfflineDuckQuackOp;
  };
  user_badge_history: {
    key: [string, number, string];
    value: UserBadgeHistory;
    indexes: { by_user: string };
  };
};
