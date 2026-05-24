export type UserRole = 'normal' | 'manager' | 'godlike';

export type Country = 'de' | 'es' | 'br' | 'us' | 'co' | 'be' | 'other';

export type User = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  preferred_language: 'br' | 'en' | 'es' | 'de';
  is_test_user: boolean;
  is_friend?: boolean | null;
  role: UserRole;
  created_at: string;
  wacken_years: number[];
  country: Country | null;
  wacken_arrival_day?: string | null;
};

export type CrewUser = Pick<User, 'id' | 'display_name' | 'avatar_url' | 'wacken_arrival_day' | 'is_friend'>;

export type BandCategory = 'band' | 'ceremony';

export type Band = {
  id: string;
  slot_id: string;
  name: string;
  stage: string;
  start_time: string;
  end_time: string;
  image_url: string | null;
  genre: string | null;
  category: BandCategory | null;
};

export type UserPick = {
  user_id: string;
  band_id: string;
  created_at: string;
};

export type UserMissedBand = {
  user_id: string;
  band_id: string;
  marked_at: string;
};

export type UserPresence = {
  user_id: string;
  is_camping: boolean;
  is_at_metal_place?: boolean;
  updated_at: string;
};

export type Announcement = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  is_pinned: boolean;
};

export type BlockedPoster = {
  user_id: string;
  blocked_by: string;
  blocked_at: string;
};

export type UsefulLink = {
  title: string;
  url: string;
  icon?: string;
};

export type UsefulLinksFile = {
  links: UsefulLink[];
};

export type MetalPlaceConfig = {
  id?: number;
  festival_day?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  label?: string;
  test_override_day?: number | null;
  updated_by?: string;
  updated_at?: string;
};

export type LiveBandTestConfig = {
  id?: number;
  band_id?: string | null;
  enabled?: boolean;
  updated_by?: string;
  updated_at?: string;
};

export type AlertContext = {
  currentTime: string;
  festivalDay: number;
  triggeringUserId: string;
  crewPicks: {
    userId: string;
    displayName: string;
    picks: {
      bandId: string;
      bandName: string;
      stage: string;
      startTime: string;
      endTime: string;
    }[];
  }[];
  fullSchedule: Band[];
};
