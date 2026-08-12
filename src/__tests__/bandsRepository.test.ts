import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getActiveFestivalId: vi.fn(),
  getActiveFestivalCacheVersion: vi.fn(),
  setActiveFestivalCacheVersion: vi.fn(),
  clearActiveFestivalPack: vi.fn(),
  saveBands: vi.fn(),
  loadActivePack: vi.fn(),
}));

vi.mock('../lib/db', () => ({
  getActiveFestivalId: mocks.getActiveFestivalId,
  getActiveFestivalCacheVersion: mocks.getActiveFestivalCacheVersion,
  setActiveFestivalCacheVersion: mocks.setActiveFestivalCacheVersion,
  clearActiveFestivalPack: mocks.clearActiveFestivalPack,
  saveBands: mocks.saveBands,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../repositories/festivals', () => ({
  festivalsRepository: {
    loadActivePack: mocks.loadActivePack,
  },
}));

import { bandsRepository } from '../repositories/bands';
import { supabase } from '../lib/supabase';

const FESTIVAL_ID = 'fest-1';
const USER_ID = 'user-1';

function mockFestivalResponse(version: string | null) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({
      data: version !== null ? { id: FESTIVAL_ID, cache_version: version } : null,
      error: null,
    });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  vi.mocked(supabase.from).mockReturnValue({ select } as ReturnType<typeof supabase.from>);
}

function mockBandsResponse(bands: unknown[] | null, error: Error | null = null) {
  const order = vi.fn().mockResolvedValue({ data: bands, error });
  const select = vi.fn().mockReturnValue({ order });
  vi.mocked(supabase.from).mockReturnValue({ select } as ReturnType<typeof supabase.from>);
}

function mockFestivalUpdate() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq });
  vi.mocked(supabase.from).mockReturnValue({ update } as ReturnType<typeof supabase.from>);
  return { update, eq };
}

describe('bandsRepository.sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveBands.mockResolvedValue(undefined);
  });

  it('fetches bands from Supabase and saves to IndexedDB', async () => {
    const bands = [{ id: '1', name: 'Test Band' }];
    mockBandsResponse(bands);

    await bandsRepository.sync();

    expect(supabase.from).toHaveBeenCalledWith('bands');
    expect(mocks.saveBands).toHaveBeenCalledWith(bands);
  });

  it('throws when Supabase returns an error', async () => {
    mockBandsResponse(null, new Error('network error'));

    await expect(bandsRepository.sync()).rejects.toThrow('network error');
    expect(mocks.saveBands).not.toHaveBeenCalled();
  });

  it('does not call saveBands when response is empty', async () => {
    mockBandsResponse([]);

    await bandsRepository.sync();

    expect(mocks.saveBands).not.toHaveBeenCalled();
  });
});

describe('bandsRepository.checkAndApplyCacheVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveFestivalId.mockResolvedValue(FESTIVAL_ID);
    mocks.getActiveFestivalCacheVersion.mockResolvedValue('v1');
    mocks.setActiveFestivalCacheVersion.mockResolvedValue(undefined);
    mocks.clearActiveFestivalPack.mockResolvedValue(undefined);
    mocks.loadActivePack.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('does nothing when remote version matches local version', async () => {
    mockFestivalResponse('v1');

    await bandsRepository.checkAndApplyCacheVersion(USER_ID);

    expect(mocks.clearActiveFestivalPack).not.toHaveBeenCalled();
    expect(mocks.setActiveFestivalCacheVersion).not.toHaveBeenCalled();
    expect(mocks.loadActivePack).not.toHaveBeenCalled();
  });

  it('clears Active Festival pack and reloads on version mismatch', async () => {
    mockFestivalResponse('v99');
    mocks.getActiveFestivalCacheVersion.mockResolvedValue('v1');

    await bandsRepository.checkAndApplyCacheVersion(USER_ID);

    expect(mocks.clearActiveFestivalPack).toHaveBeenCalledOnce();
    expect(mocks.setActiveFestivalCacheVersion).toHaveBeenCalledWith('v99');
    expect(mocks.loadActivePack).toHaveBeenCalledWith(USER_ID, FESTIVAL_ID);
  });

  it('does nothing when festivals returns no row', async () => {
    mockFestivalResponse(null);

    await bandsRepository.checkAndApplyCacheVersion(USER_ID);

    expect(mocks.clearActiveFestivalPack).not.toHaveBeenCalled();
  });

  it('does nothing when there is no active festival', async () => {
    mocks.getActiveFestivalId.mockResolvedValue(null);
    mockFestivalResponse('v99');

    await bandsRepository.checkAndApplyCacheVersion(USER_ID);

    expect(supabase.from).not.toHaveBeenCalled();
    expect(mocks.clearActiveFestivalPack).not.toHaveBeenCalled();
  });

  it('does nothing when navigator.onLine is false', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    mockFestivalResponse('v99');

    await bandsRepository.checkAndApplyCacheVersion(USER_ID);

    expect(supabase.from).not.toHaveBeenCalled();
    expect(mocks.clearActiveFestivalPack).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('stores remote version without wipe when local marker is unset', async () => {
    mockFestivalResponse('v42');
    mocks.getActiveFestivalCacheVersion.mockResolvedValue(null);

    await bandsRepository.checkAndApplyCacheVersion(USER_ID);

    expect(mocks.clearActiveFestivalPack).not.toHaveBeenCalled();
    expect(mocks.setActiveFestivalCacheVersion).toHaveBeenCalledWith('v42');
    expect(mocks.loadActivePack).not.toHaveBeenCalled();
  });
});

describe('bandsRepository.invalidateCacheForAllUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveFestivalId.mockResolvedValue(FESTIVAL_ID);
    mocks.clearActiveFestivalPack.mockResolvedValue(undefined);
    mocks.setActiveFestivalCacheVersion.mockResolvedValue(undefined);
  });

  it('bumps festivals.cache_version for the active festival and clears pack', async () => {
    const { update, eq } = mockFestivalUpdate();

    await bandsRepository.invalidateCacheForAllUsers();

    expect(supabase.from).toHaveBeenCalledWith('festivals');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ cache_version: expect.any(String) }),
    );
    expect(eq).toHaveBeenCalledWith('id', FESTIVAL_ID);
    expect(mocks.clearActiveFestivalPack).toHaveBeenCalledOnce();
    expect(mocks.setActiveFestivalCacheVersion).toHaveBeenCalledWith(expect.any(String));
  });

  it('throws when there is no active festival', async () => {
    mocks.getActiveFestivalId.mockResolvedValue(null);
    await expect(bandsRepository.invalidateCacheForAllUsers()).rejects.toThrow(
      /No active festival/,
    );
  });
});
