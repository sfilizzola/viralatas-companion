import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db', () => ({
  loadCacheVersion: vi.fn(),
  saveCacheVersion: vi.fn(),
  wipeAllLocalData: vi.fn(),
  saveBands: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../repositories/picks', () => ({
  picksRepository: { syncCrewFromRemote: vi.fn() },
}));

vi.mock('../repositories/users', () => ({
  usersRepository: { syncCrew: vi.fn() },
}));

vi.mock('../repositories/presence', () => ({
  presenceRepository: { syncCrewFromRemote: vi.fn() },
}));

vi.mock('../repositories/announcements', () => ({
  announcementsRepository: { sync: vi.fn() },
}));

import { bandsRepository } from '../repositories/bands';
import { loadCacheVersion, saveCacheVersion, wipeAllLocalData, saveBands } from '../lib/db';
import { supabase } from '../lib/supabase';
import { picksRepository } from '../repositories/picks';
import { usersRepository } from '../repositories/users';
import { presenceRepository } from '../repositories/presence';
import { announcementsRepository } from '../repositories/announcements';

function mockAppConfigResponse(version: string | null) {
  const single = vi.fn().mockResolvedValue({ data: version !== null ? { value: version } : null });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  vi.mocked(supabase.from).mockReturnValue({ select } as ReturnType<typeof supabase.from>);
}

function mockBandsResponse(bands: unknown[] | null, error: Error | null = null) {
  const order = vi.fn().mockResolvedValue({ data: bands, error });
  const select = vi.fn().mockReturnValue({ order });
  vi.mocked(supabase.from).mockReturnValue({ select } as ReturnType<typeof supabase.from>);
}

describe('bandsRepository.sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveBands).mockResolvedValue(undefined);
  });

  it('fetches bands from Supabase and saves to IndexedDB', async () => {
    const bands = [{ id: '1', name: 'Test Band' }];
    mockBandsResponse(bands);

    await bandsRepository.sync();

    expect(supabase.from).toHaveBeenCalledWith('bands');
    expect(saveBands).toHaveBeenCalledWith(bands);
  });

  it('throws when Supabase returns an error', async () => {
    mockBandsResponse(null, new Error('network error'));

    await expect(bandsRepository.sync()).rejects.toThrow('network error');
    expect(saveBands).not.toHaveBeenCalled();
  });

  it('does not call saveBands when response is empty', async () => {
    mockBandsResponse([]);

    await bandsRepository.sync();

    expect(saveBands).not.toHaveBeenCalled();
  });
});

describe('bandsRepository.checkAndApplyCacheVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(wipeAllLocalData).mockResolvedValue(undefined);
    vi.mocked(saveCacheVersion).mockResolvedValue(undefined);
    vi.spyOn(bandsRepository, 'sync').mockResolvedValue(undefined);
    vi.mocked(picksRepository.syncCrewFromRemote).mockResolvedValue(undefined);
    vi.mocked(usersRepository.syncCrew).mockResolvedValue(undefined);
    vi.mocked(presenceRepository.syncCrewFromRemote).mockResolvedValue(undefined);
    vi.mocked(announcementsRepository.sync).mockResolvedValue(undefined);
  });

  it('does nothing when remote version matches local version', async () => {
    mockAppConfigResponse('v42');
    vi.mocked(loadCacheVersion).mockResolvedValue('v42');

    await bandsRepository.checkAndApplyCacheVersion();

    expect(wipeAllLocalData).not.toHaveBeenCalled();
    expect(saveCacheVersion).not.toHaveBeenCalled();
    expect(bandsRepository.sync).not.toHaveBeenCalled();
    expect(picksRepository.syncCrewFromRemote).not.toHaveBeenCalled();
    expect(usersRepository.syncCrew).not.toHaveBeenCalled();
    expect(presenceRepository.syncCrewFromRemote).not.toHaveBeenCalled();
    expect(announcementsRepository.sync).not.toHaveBeenCalled();
  });

  it('wipes IDB, saves new version, and triggers all re-syncs when versions differ', async () => {
    mockAppConfigResponse('v99');
    vi.mocked(loadCacheVersion).mockResolvedValue('v1');

    await bandsRepository.checkAndApplyCacheVersion();

    expect(wipeAllLocalData).toHaveBeenCalledOnce();
    expect(saveCacheVersion).toHaveBeenCalledWith('v99');
    expect(bandsRepository.sync).toHaveBeenCalledOnce();
    expect(picksRepository.syncCrewFromRemote).toHaveBeenCalledOnce();
    expect(usersRepository.syncCrew).toHaveBeenCalledOnce();
    expect(presenceRepository.syncCrewFromRemote).toHaveBeenCalledOnce();
    expect(announcementsRepository.sync).toHaveBeenCalledOnce();
  });

  it('does nothing when app_config returns no data', async () => {
    mockAppConfigResponse(null);
    vi.mocked(loadCacheVersion).mockResolvedValue('v1');

    await bandsRepository.checkAndApplyCacheVersion();

    expect(wipeAllLocalData).not.toHaveBeenCalled();
    expect(saveCacheVersion).not.toHaveBeenCalled();
  });
});
