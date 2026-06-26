import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

import { resetDbConnectionForTests } from '../lib/db';
import {
  CAMP_LOCATION_CHANGED_EVENT,
  clearCampLocationCache,
  loadCampLocation,
  saveCampLocation,
} from '../lib/db';

const sampleLocation = () => ({ lat: 54.037809, lng: 9.368845 });

describe('camp_location IndexedDB store', () => {
  beforeEach(async () => {
    await resetDbConnectionForTests();
    await deleteViralatasDatabase();
  });

  it('saveCampLocation / loadCampLocation round-trip', async () => {
    const location = sampleLocation();
    await saveCampLocation(location);
    expect(await loadCampLocation()).toEqual(location);
  });

  it('clearCampLocationCache removes stored location', async () => {
    await saveCampLocation(sampleLocation());
    await clearCampLocationCache();
    expect(await loadCampLocation()).toBeNull();
  });

  it('fires CAMP_LOCATION_CHANGED_EVENT after saveCampLocation', async () => {
    const handler = vi.fn();
    window.addEventListener(CAMP_LOCATION_CHANGED_EVENT, handler);
    await saveCampLocation(sampleLocation());
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener(CAMP_LOCATION_CHANGED_EVENT, handler);
  });
});
