import type { CrewUser, UserPick } from '../types';

export type BandAttendee = CrewUser & {
  label: string;
};

export type AttendeeMap = Record<string, BandAttendee[]>;

function fallbackName(userId: string) {
  return `Vira-lata ${userId.slice(0, 4).toUpperCase()}`;
}

export function computeAttendees(picks: UserPick[], crewUsers: CrewUser[]): AttendeeMap {
  const usersById = new Map(crewUsers.map((user) => [user.id, user]));
  const attendeesByBand: AttendeeMap = {};

  for (const pick of picks) {
    const user = usersById.get(pick.user_id) ?? {
      id: pick.user_id,
      display_name: null,
      avatar_url: null,
    };
    const label = user.display_name?.trim() || fallbackName(user.id);

    attendeesByBand[pick.band_id] ??= [];
    attendeesByBand[pick.band_id].push({ ...user, label });
  }

  for (const attendees of Object.values(attendeesByBand)) {
    attendees.sort((a, b) => a.label.localeCompare(b.label));
  }

  return attendeesByBand;
}
