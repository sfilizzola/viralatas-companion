export type UserRole = 'normal' | 'manager' | 'godlike';

export type User = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  preferred_language: 'br' | 'en';
  is_test_user: boolean;
  role: UserRole;
  created_at: string;
};

export type CrewUser = Pick<User, 'id' | 'display_name' | 'avatar_url'>;

export type Band = {
  id: string;
  name: string;
  stage: string;
  start_time: string;
  end_time: string;
  image_url: string | null;
  genre: string | null;
};

export type UserPick = {
  user_id: string;
  band_id: string;
  created_at: string;
};

export type UserPresence = {
  user_id: string;
  is_camping: boolean;
  updated_at: string;
};

export type Announcement = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
};

export type BlockedPoster = {
  user_id: string;
  blocked_by: string;
  blocked_at: string;
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
