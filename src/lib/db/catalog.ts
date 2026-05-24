import type { Band, CrewUser } from '../../types';
import { getDB } from './connection';
import { BANDS_CHANGED_EVENT, CREW_USERS_CHANGED_EVENT } from './events';

function emitBandsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BANDS_CHANGED_EVENT));
  }
}

function emitCrewUsersChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CREW_USERS_CHANGED_EVENT));
  }
}

export async function saveBands(bands: Band[]) {
  const db = await getDB();
  const tx = db.transaction('bands', 'readwrite');
  await Promise.all(bands.map((b) => tx.store.put(b)));
  await tx.done;
  emitBandsChanged();
}

export async function loadBands(): Promise<Band[]> {
  const db = await getDB();
  return db.getAll('bands');
}

export async function saveCrewUsers(users: CrewUser[]) {
  const db = await getDB();
  const tx = db.transaction('crew_users', 'readwrite');
  await tx.store.clear();
  await Promise.all(users.map((user) => tx.store.put(user)));
  await tx.done;
  emitCrewUsersChanged();
}

export async function loadCrewUsers(): Promise<CrewUser[]> {
  const db = await getDB();
  return db.getAll('crew_users');
}
