import { useEffect, useState } from 'react';
import {
  CREW_USERS_CHANGED_EVENT,
  PICKS_CHANGED_EVENT,
  loadAllUserPicks,
  loadCrewUsers,
} from '../lib/db';
import { usersRepository } from '../repositories';
import { computeAttendees } from '../services/attendees';
import type { AttendeeMap, BandAttendee } from '../services/attendees';

export type { BandAttendee };

export function useBandAttendees(): AttendeeMap {
  const [attendees, setAttendees] = useState<AttendeeMap>({});

  useEffect(() => {
    let active = true;

    async function refreshFromCache() {
      const [picks, users] = await Promise.all([loadAllUserPicks(), loadCrewUsers()]);
      if (active) setAttendees(computeAttendees(picks, users));
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
