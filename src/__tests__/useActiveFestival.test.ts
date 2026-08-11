import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import type { Festival, FestivalMembership } from '../types';

const USER_ID = 'user-1';
const FESTIVAL_ID = 'fest-1';

const FESTIVAL: Festival = {
  id: FESTIVAL_ID,
  slug: 'wacken-2026',
  name: 'Wacken Open Air 2026',
  timezone: 'Europe/Berlin',
  starts_at: '2026-07-27T00:00:00+02:00',
  ends_at: '2026-08-02T03:00:00+02:00',
  features: { metal_place: true, map: true },
  cache_version: '1',
};

const MEMBERSHIP: FestivalMembership = {
  user_id: USER_ID,
  festival_id: FESTIVAL_ID,
  opted_in_at: '2026-08-01T12:00:00Z',
};

const mocks = vi.hoisted(() => ({
  syncCatalog: vi.fn(),
  syncMyMemberships: vi.fn(),
  optIn: vi.fn(),
  optOut: vi.fn(),
  setActiveFestival: vi.fn(),
  getActiveFestivalId: vi.fn(),
  clearActiveFestivalId: vi.fn(),
  loadFestivalCatalog: vi.fn(),
  loadFestivalMemberships: vi.fn(),
  fetchServerActiveFestivalId: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock('../repositories/festivals', () => ({
  festivalsRepository: {
    syncCatalog: mocks.syncCatalog,
    syncMyMemberships: mocks.syncMyMemberships,
    optIn: mocks.optIn,
    optOut: mocks.optOut,
    setActiveFestival: mocks.setActiveFestival,
    fetchServerActiveFestivalId: mocks.fetchServerActiveFestivalId,
  },
}));

vi.mock('../lib/db/festivals', () => ({
  getActiveFestivalId: mocks.getActiveFestivalId,
  clearActiveFestivalId: mocks.clearActiveFestivalId,
  loadFestivalCatalog: mocks.loadFestivalCatalog,
  loadFestivalMemberships: mocks.loadFestivalMemberships,
}));

import { ActiveFestivalProvider } from '../components/festival/ActiveFestivalProvider';
import { useActiveFestival } from '../hooks/useActiveFestival';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(ActiveFestivalProvider, null, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });

  mocks.useAuth.mockReturnValue({
    user: { id: USER_ID },
    session: { user: { id: USER_ID } },
    loading: false,
    hadIdbSession: true,
    sessionExpired: false,
  });

  mocks.getActiveFestivalId.mockResolvedValue(FESTIVAL_ID);
  mocks.clearActiveFestivalId.mockResolvedValue(undefined);
  mocks.loadFestivalCatalog.mockResolvedValue([]);
  mocks.loadFestivalMemberships.mockResolvedValue([]);
  mocks.syncCatalog.mockResolvedValue([FESTIVAL]);
  mocks.syncMyMemberships.mockResolvedValue([MEMBERSHIP]);
  mocks.fetchServerActiveFestivalId.mockResolvedValue(FESTIVAL_ID);
  mocks.optIn.mockResolvedValue(undefined);
  mocks.optOut.mockResolvedValue(undefined);
  mocks.setActiveFestival.mockResolvedValue(undefined);
});

describe('useActiveFestival', () => {
  it('exposes ready + festival after mocked sync', async () => {
    const { result } = renderHook(() => useActiveFestival(), { wrapper });

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });

    expect(result.current.festival).toEqual(FESTIVAL);
    expect(result.current.features).toEqual(FESTIVAL.features);
    expect(result.current.activeFestivalId).toBe(FESTIVAL_ID);
    expect(result.current.memberships).toEqual([MEMBERSHIP]);
    expect(result.current.catalog).toEqual([FESTIVAL]);
    expect(mocks.syncCatalog).toHaveBeenCalled();
    expect(mocks.syncMyMemberships).toHaveBeenCalledWith(USER_ID);
  });

  it('optIn updates memberships', async () => {
    const secondMembership: FestivalMembership = {
      user_id: USER_ID,
      festival_id: 'fest-2',
      opted_in_at: '2026-08-02T12:00:00Z',
    };

    mocks.syncMyMemberships
      .mockResolvedValueOnce([MEMBERSHIP])
      .mockResolvedValueOnce([MEMBERSHIP, secondMembership]);

    const { result } = renderHook(() => useActiveFestival(), { wrapper });

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.memberships).toEqual([MEMBERSHIP]);

    await act(async () => {
      await result.current.optIn('fest-2');
    });

    expect(mocks.optIn).toHaveBeenCalledWith(USER_ID, 'fest-2');
    await waitFor(() => {
      expect(result.current.memberships).toEqual([MEMBERSHIP, secondMembership]);
    });
  });

  it('reconciles server active_festival_id via full pack switch when online', async () => {
    mocks.getActiveFestivalId.mockResolvedValue('local-fest');
    mocks.fetchServerActiveFestivalId.mockResolvedValue(FESTIVAL_ID);

    const { result } = renderHook(() => useActiveFestival(), { wrapper });

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });

    expect(mocks.setActiveFestival).toHaveBeenCalledWith(USER_ID, FESTIVAL_ID);
    expect(result.current.activeFestivalId).toBe(FESTIVAL_ID);
    expect(result.current.festival).toEqual(FESTIVAL);
  });

  it('offline hydrate keeps ready + memberships from IDB when sync fails', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    mocks.loadFestivalCatalog.mockResolvedValue([FESTIVAL]);
    mocks.loadFestivalMemberships.mockResolvedValue([MEMBERSHIP]);
    mocks.syncCatalog.mockRejectedValue(new Error('offline'));
    mocks.syncMyMemberships.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useActiveFestival(), { wrapper });

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });

    expect(result.current.catalog).toEqual([FESTIVAL]);
    expect(result.current.memberships).toEqual([MEMBERSHIP]);
    expect(result.current.activeFestivalId).toBe(FESTIVAL_ID);
    expect(result.current.festival).toEqual(FESTIVAL);
    expect(mocks.fetchServerActiveFestivalId).not.toHaveBeenCalled();
    expect(mocks.setActiveFestival).not.toHaveBeenCalled();
  });
});
