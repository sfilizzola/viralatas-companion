export type User = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

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
