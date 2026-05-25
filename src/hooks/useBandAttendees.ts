import { useEffect, useMemo, useState } from 'react';
import { CREW_USERS_CHANGED_EVENT, loadCrewUsers } from '../lib/db';
import { computeAttendees } from '../services/attendees';
import type { AttendeeMap, BandAttendee } from '../services/attendees';
import type { CrewUser } from '../types';
import { useAllPicks } from './useAllPicks';

export type { BandAttendee };

export function useBandAttendees(): AttendeeMap {
  const allPicks = useAllPicks();
  const [crewUsers, setCrewUsers] = useState<CrewUser[]>([]);

  useEffect(() => {
    let active = true;

    async function refreshCrewUsers() {
      const users = await loadCrewUsers();
      if (active) setCrewUsers(users);
    }

    refreshCrewUsers();
    window.addEventListener(CREW_USERS_CHANGED_EVENT, refreshCrewUsers);

    return () => {
      active = false;
      window.removeEventListener(CREW_USERS_CHANGED_EVENT, refreshCrewUsers);
    };
  }, []);

  return useMemo(
    () => computeAttendees(allPicks ?? [], crewUsers),
    [allPicks, crewUsers],
  );
}
