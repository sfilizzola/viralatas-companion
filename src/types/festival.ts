export type FestivalFeatureKey =
  | 'metal_place'
  | 'map'
  | 'duck'
  | 'camp'
  | 'wrap'
  | 'remote_lineup'
  | 'running_order';

export type FestivalFeatures = Partial<Record<FestivalFeatureKey, boolean>>;

export type Festival = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  starts_at: string;
  ends_at: string;
  features: FestivalFeatures;
  cache_version: string;
};

export type FestivalMembership = {
  user_id: string;
  festival_id: string;
  opted_in_at: string;
};
