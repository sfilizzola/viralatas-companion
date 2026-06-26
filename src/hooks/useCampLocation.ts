import { useEffect, useState } from 'react';
import type { CampLocation } from '../types';
import { CAMP_LOCATION_CHANGED_EVENT, loadCampLocation } from '../lib/db';
import { campLocationRepository } from '../repositories';

export function useCampLocation(): CampLocation | null {
  const [location, setLocation] = useState<CampLocation | null>(null);

  useEffect(() => {
    async function refresh() {
      setLocation(await loadCampLocation());
    }
    refresh();
    campLocationRepository.syncCampLocation().then(setLocation).catch(() => {});
    window.addEventListener(CAMP_LOCATION_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CAMP_LOCATION_CHANGED_EVENT, refresh);
  }, []);

  return location;
}
