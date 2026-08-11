import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockDelete = vi.fn();
  const mockUpdate = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockSingle = vi.fn();
  const mockFrom = vi.fn();

  const mockClearActiveFestivalPack = vi.fn().mockResolvedValue(undefined);
  const mockSetActiveFestivalId = vi.fn().mockResolvedValue(undefined);
  const mockSetActiveFestivalCacheVersion = vi.fn().mockResolvedValue(undefined);
  const mockGetActiveFestivalId = vi.fn().mockResolvedValue(null);
  const mockClearActiveFestivalId = vi.fn().mockResolvedValue(undefined);
  const mockSaveFestivalCatalog = vi.fn().mockResolvedValue(undefined);
  const mockSaveFestivalMemberships = vi.fn().mockResolvedValue(undefined);

  const mockBandsSync = vi.fn().mockResolvedValue(undefined);
  const mockPicksSync = vi.fn().mockResolvedValue(undefined);
  const mockAnnouncementsSync = vi.fn().mockResolvedValue(undefined);
  const mockReactionsSync = vi.fn().mockResolvedValue(undefined);
  const mockMissedSync = vi.fn().mockResolvedValue(undefined);
  const mockRatingsSync = vi.fn().mockResolvedValue(undefined);
  const mockUsersSync = vi.fn().mockResolvedValue(undefined);

  return {
    mockEq,
    mockSelect,
    mockInsert,
    mockDelete,
    mockUpdate,
    mockMaybeSingle,
    mockSingle,
    mockFrom,
    mockClearActiveFestivalPack,
    mockSetActiveFestivalId,
    mockSetActiveFestivalCacheVersion,
    mockGetActiveFestivalId,
    mockClearActiveFestivalId,
    mockSaveFestivalCatalog,
    mockSaveFestivalMemberships,
    mockBandsSync,
    mockPicksSync,
    mockAnnouncementsSync,
    mockReactionsSync,
    mockMissedSync,
    mockRatingsSync,
    mockUsersSync,
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: { from: mocks.mockFrom },
}));

vi.mock('../lib/db/festivals', () => ({
  clearActiveFestivalPack: mocks.mockClearActiveFestivalPack,
  setActiveFestivalId: mocks.mockSetActiveFestivalId,
  setActiveFestivalCacheVersion: mocks.mockSetActiveFestivalCacheVersion,
  getActiveFestivalId: mocks.mockGetActiveFestivalId,
  clearActiveFestivalId: mocks.mockClearActiveFestivalId,
  saveFestivalCatalog: mocks.mockSaveFestivalCatalog,
  saveFestivalMemberships: mocks.mockSaveFestivalMemberships,
}));

vi.mock('../repositories/bands', () => ({
  bandsRepository: { sync: mocks.mockBandsSync },
}));

vi.mock('../repositories/picks', () => ({
  picksRepository: { syncCrewFromRemote: mocks.mockPicksSync },
}));

vi.mock('../repositories/announcements', () => ({
  announcementsRepository: { sync: mocks.mockAnnouncementsSync },
}));

vi.mock('../repositories/reactions', () => ({
  reactionsRepository: { syncFromRemote: mocks.mockReactionsSync },
}));

vi.mock('../repositories/missed', () => ({
  missedRepository: { syncFromRemote: mocks.mockMissedSync },
}));

vi.mock('../repositories/ratings', () => ({
  ratingsRepository: { syncCrewFromRemote: mocks.mockRatingsSync },
}));

vi.mock('../repositories/users', () => ({
  usersRepository: { syncCrew: mocks.mockUsersSync },
}));

import { festivalsRepository } from '../repositories/festivals';
import type { Festival, FestivalMembership } from '../types';

const FESTIVAL_ID = 'fest-1';
const USER_ID = 'user-1';

const FESTIVAL: Festival = {
  id: FESTIVAL_ID,
  slug: 'wacken-2026',
  name: 'Wacken Open Air 2026',
  timezone: 'Europe/Berlin',
  starts_at: '2026-07-27T00:00:00+02:00',
  ends_at: '2026-08-02T03:00:00+02:00',
  features: { metal_place: true },
  cache_version: 'cv-42',
};

const MEMBERSHIP: FestivalMembership = {
  user_id: USER_ID,
  festival_id: FESTIVAL_ID,
  opted_in_at: '2026-08-01T12:00:00Z',
};

function chainResolved(result: unknown) {
  const thenable = Promise.resolve(result);
  return {
    select: mocks.mockSelect,
    insert: mocks.mockInsert,
    delete: mocks.mockDelete,
    update: mocks.mockUpdate,
    eq: mocks.mockEq,
    maybeSingle: mocks.mockMaybeSingle,
    single: mocks.mockSingle,
    then: thenable.then.bind(thenable),
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.mockClearActiveFestivalPack.mockResolvedValue(undefined);
  mocks.mockSetActiveFestivalId.mockResolvedValue(undefined);
  mocks.mockSetActiveFestivalCacheVersion.mockResolvedValue(undefined);
  mocks.mockGetActiveFestivalId.mockResolvedValue(null);
  mocks.mockClearActiveFestivalId.mockResolvedValue(undefined);
  mocks.mockSaveFestivalCatalog.mockResolvedValue(undefined);
  mocks.mockSaveFestivalMemberships.mockResolvedValue(undefined);
  mocks.mockBandsSync.mockResolvedValue(undefined);
  mocks.mockPicksSync.mockResolvedValue(undefined);
  mocks.mockAnnouncementsSync.mockResolvedValue(undefined);
  mocks.mockReactionsSync.mockResolvedValue(undefined);
  mocks.mockMissedSync.mockResolvedValue(undefined);
  mocks.mockRatingsSync.mockResolvedValue(undefined);
  mocks.mockUsersSync.mockResolvedValue(undefined);

  // Default thenable chain: each .eq returns the same chain; terminal methods resolve.
  const chain: Record<string, unknown> = {};
  chain.select = mocks.mockSelect.mockReturnValue(chain);
  chain.insert = mocks.mockInsert.mockReturnValue(chain);
  chain.delete = mocks.mockDelete.mockReturnValue(chain);
  chain.update = mocks.mockUpdate.mockReturnValue(chain);
  chain.eq = mocks.mockEq.mockReturnValue(chain);
  chain.maybeSingle = mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  chain.single = mocks.mockSingle.mockResolvedValue({ data: null, error: null });
  Object.assign(chain, {
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve, reject),
  });

  mocks.mockFrom.mockImplementation(() => chain);
});

describe('festivalsRepository.syncCatalog', () => {
  it('maps festivals select rows to Festival[]', async () => {
    const remoteRow = {
      ...FESTIVAL,
      created_at: '2026-01-01T00:00:00Z',
      features: { metal_place: true, duck: false },
    };
    const select = vi.fn().mockResolvedValue({ data: [remoteRow], error: null });
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'festivals') return { select };
      return chainResolved({ data: null, error: null });
    });

    const result = await festivalsRepository.syncCatalog();

    expect(mocks.mockFrom).toHaveBeenCalledWith('festivals');
    expect(select).toHaveBeenCalledWith('*');
    expect(result).toEqual([
      {
        id: FESTIVAL_ID,
        slug: 'wacken-2026',
        name: 'Wacken Open Air 2026',
        timezone: 'Europe/Berlin',
        starts_at: '2026-07-27T00:00:00+02:00',
        ends_at: '2026-08-02T03:00:00+02:00',
        features: { metal_place: true, duck: false },
        cache_version: 'cv-42',
      },
    ]);
    expect(mocks.mockSaveFestivalCatalog).toHaveBeenCalledWith(result);
  });
});

describe('festivalsRepository.syncMyMemberships', () => {
  it('returns memberships for the given userId', async () => {
    const eq = vi.fn().mockResolvedValue({ data: [MEMBERSHIP], error: null });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'festival_memberships') return { select };
      return chainResolved({ data: null, error: null });
    });

    const result = await festivalsRepository.syncMyMemberships(USER_ID);

    expect(mocks.mockFrom).toHaveBeenCalledWith('festival_memberships');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(result).toEqual([MEMBERSHIP]);
    expect(mocks.mockSaveFestivalMemberships).toHaveBeenCalledWith([MEMBERSHIP]);
  });
});

describe('festivalsRepository.optIn', () => {
  it('inserts membership for the user and festival', async () => {
    const insertChain = chainResolved({ data: null, error: null });
    mocks.mockInsert.mockReturnValue(insertChain);
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'festival_memberships') {
        return { insert: mocks.mockInsert };
      }
      return chainResolved({ data: null, error: null });
    });

    await festivalsRepository.optIn(USER_ID, FESTIVAL_ID);

    expect(mocks.mockFrom).toHaveBeenCalledWith('festival_memberships');
    expect(mocks.mockInsert).toHaveBeenCalledWith({
      user_id: USER_ID,
      festival_id: FESTIVAL_ID,
    });
  });
});

describe('festivalsRepository.optOut', () => {
  it('deletes membership only — never deletes picks or announcements', async () => {
    const deleteChain = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
    mocks.mockDelete.mockReturnValue(deleteChain);
    mocks.mockGetActiveFestivalId.mockResolvedValue('other-fest');

    const tablesTouched: string[] = [];
    mocks.mockFrom.mockImplementation((table: string) => {
      tablesTouched.push(table);
      if (table === 'festival_memberships') {
        return { delete: mocks.mockDelete };
      }
      if (table === 'users') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return chainResolved({ data: null, error: null });
    });

    await festivalsRepository.optOut(USER_ID, FESTIVAL_ID);

    expect(tablesTouched).toContain('festival_memberships');
    expect(tablesTouched).not.toContain('user_picks');
    expect(tablesTouched).not.toContain('announcements');
    expect(mocks.mockDelete).toHaveBeenCalled();
  });

  it('clears active festival when leaving the Active Festival', async () => {
    mocks.mockGetActiveFestivalId.mockResolvedValue(FESTIVAL_ID);

    const userUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const deleteEq2 = vi.fn().mockResolvedValue({ error: null });
    const deleteEq1 = vi.fn().mockReturnValue({ eq: deleteEq2 });
    mocks.mockDelete.mockReturnValue({ eq: deleteEq1 });

    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'festival_memberships') {
        return { delete: mocks.mockDelete };
      }
      if (table === 'users') {
        return { update: userUpdate };
      }
      return chainResolved({ data: null, error: null });
    });

    await festivalsRepository.optOut(USER_ID, FESTIVAL_ID);

    expect(mocks.mockClearActiveFestivalId).toHaveBeenCalled();
    expect(userUpdate).toHaveBeenCalledWith({ active_festival_id: null });
  });
});

describe('festivalsRepository.setActiveFestival', () => {
  it('rejects when the user is not a member', async () => {
    mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const membershipChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mocks.mockMaybeSingle,
          }),
        }),
      }),
    };
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'festival_memberships') return membershipChain;
      return chainResolved({ data: null, error: null });
    });

    await expect(
      festivalsRepository.setActiveFestival(USER_ID, FESTIVAL_ID),
    ).rejects.toThrow(/member/i);

    expect(mocks.mockClearActiveFestivalPack).not.toHaveBeenCalled();
    expect(mocks.mockBandsSync).not.toHaveBeenCalled();
  });

  it('clears pack, updates active festival, and loads pack on success', async () => {
    mocks.mockMaybeSingle.mockResolvedValue({ data: MEMBERSHIP, error: null });
    mocks.mockSingle.mockResolvedValue({ data: FESTIVAL, error: null });

    const userUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const userUpdate = vi.fn().mockReturnValue({ eq: userUpdateEq });

    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'festival_memberships') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: mocks.mockMaybeSingle,
              }),
            }),
          }),
        };
      }
      if (table === 'festivals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mocks.mockSingle,
            }),
          }),
        };
      }
      if (table === 'users') {
        return { update: userUpdate };
      }
      return chainResolved({ data: null, error: null });
    });

    await festivalsRepository.setActiveFestival(USER_ID, FESTIVAL_ID);

    expect(mocks.mockClearActiveFestivalPack).toHaveBeenCalled();
    expect(userUpdate).toHaveBeenCalledWith({ active_festival_id: FESTIVAL_ID });
    expect(userUpdateEq).toHaveBeenCalledWith('id', USER_ID);
    expect(mocks.mockSetActiveFestivalId).toHaveBeenCalledWith(FESTIVAL_ID);
    expect(mocks.mockSetActiveFestivalCacheVersion).toHaveBeenCalledWith('cv-42');
    expect(mocks.mockBandsSync).toHaveBeenCalledWith(FESTIVAL_ID);
    expect(mocks.mockPicksSync).toHaveBeenCalledWith(FESTIVAL_ID);
    expect(mocks.mockAnnouncementsSync).toHaveBeenCalledWith(FESTIVAL_ID);
    expect(mocks.mockReactionsSync).toHaveBeenCalledWith(FESTIVAL_ID);
    expect(mocks.mockMissedSync).toHaveBeenCalledWith(USER_ID, FESTIVAL_ID);
    expect(mocks.mockRatingsSync).toHaveBeenCalledWith(FESTIVAL_ID);
    expect(mocks.mockUsersSync).toHaveBeenCalledWith(FESTIVAL_ID);
  });
});

describe('festivalsRepository.loadActivePack', () => {
  it('calls scoped syncs for the festival pack', async () => {
    await festivalsRepository.loadActivePack(USER_ID, FESTIVAL_ID);

    expect(mocks.mockBandsSync).toHaveBeenCalledWith(FESTIVAL_ID);
    expect(mocks.mockPicksSync).toHaveBeenCalledWith(FESTIVAL_ID);
    expect(mocks.mockAnnouncementsSync).toHaveBeenCalledWith(FESTIVAL_ID);
    expect(mocks.mockReactionsSync).toHaveBeenCalledWith(FESTIVAL_ID);
    expect(mocks.mockMissedSync).toHaveBeenCalledWith(USER_ID, FESTIVAL_ID);
    expect(mocks.mockRatingsSync).toHaveBeenCalledWith(FESTIVAL_ID);
    expect(mocks.mockUsersSync).toHaveBeenCalledWith(FESTIVAL_ID);
  });
});
