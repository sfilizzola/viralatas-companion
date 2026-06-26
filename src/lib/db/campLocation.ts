import type { CampLocation } from '../../types';
import { getDB } from './connection';
import { CAMP_LOCATION_CHANGED_EVENT } from './events';

const CAMP_LOCATION_KEY = 'current';

function emitCampLocationChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CAMP_LOCATION_CHANGED_EVENT));
  }
}

export async function loadCampLocation(): Promise<CampLocation | null> {
  const db = await getDB();
  const value = await db.get('camp_location', CAMP_LOCATION_KEY);
  return value ?? null;
}

export async function saveCampLocation(location: CampLocation): Promise<void> {
  const db = await getDB();
  await db.put('camp_location', location, CAMP_LOCATION_KEY);
  emitCampLocationChanged();
}

export async function clearCampLocationCache(): Promise<void> {
  const db = await getDB();
  await db.delete('camp_location', CAMP_LOCATION_KEY);
  emitCampLocationChanged();
}
