import { useEffect, useState } from 'react';
import {
  CREW_USERS_CHANGED_EVENT,
  PICKS_CHANGED_EVENT,
  loadAllUserPicks,
  loadCrewUsers,
} from '../lib/db';
import { usersRepository } from '../repositories';
import type { CrewUser, UserPick } from '../types';

export type BandAttendee = CrewUser & {
  label: string;
};

function fallbackName(userId: string) {
  return `Vira-lata ${userId.slice(0, 4).toUpperCase()}`;
}

function mapAttendees(picks: UserPick[], users: CrewUser[]) {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const attendeesByBand: Record<string, BandAttendee[]> = {};

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

export function useBandAttendees(): Record<string, BandAttendee[]> {
  const [attendees, setAttendees] = useState<Record<string, BandAttendee[]>>({});

  useEffect(() => {
    let active = true;

    async function refreshFromCache() {
      const [picks, users] = await Promise.all([loadAllUserPicks(), loadCrewUsers()]);
      if (active) setAttendees(mapAttendees(picks, users));
    }

    refreshFromCache();
    usersRepository.syncCrew().catch(() => {});

    window.addEventListener(PICKS_CHANGED_EVENT, refreshFromCache);
    window.addEventListener(CREW_USERS_CHANGED_EVENT, refreshFromCache);

    return () => {
      active = false;
      window.removeEventListener(PICKS_CHANGED_EVENT, refreshFromCache);
      window.removeEventListener(CREW_USERS_CHANGED_EVENT, refreshFromCache);
    };
  }, []);

  return attendees;
}
