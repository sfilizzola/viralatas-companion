import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Band, CrewUser, UserPick } from '../types';
import type { Festival } from '../types/festival';

type PlanningHookState = {
  festival: Festival | null;
  activeFestivalId: string | null;
  ready: boolean;
  userId: string | null;
  bands: Band[];
  bandsLoading: boolean;
  picks: UserPick[] | undefined;
  crewUsers: CrewUser[] | undefined;
  now: Date;
};

const mocks = vi.hoisted(() => {
  const box = {
    state: {} as PlanningHookState,
    refresh: vi.fn(),
    useNow: vi.fn(() => box.state.now),
  };
  return box;
});

vi.mock('../hooks/useActiveFestival', () => ({
  useActiveFestival: () => ({
    festival: mocks.state.festival,
    activeFestivalId: mocks.state.activeFestivalId,
    ready: mocks.state.ready,
  }),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    session: mocks.state.userId ? { user: { id: mocks.state.userId } } : null,
  }),
}));

vi.mock('../hooks/useBands', () => ({
  useBands: () => ({
    bands: mocks.state.bands,
    loading: mocks.state.bandsLoading,
    refresh: mocks.refresh,
  }),
}));

vi.mock('../hooks/useAllPicks', () => ({
  useAllPicks: () => mocks.state.picks,
}));

vi.mock('../hooks/useSocialSnapshotSpecs', () => ({
  useCrewUsersCache: () => mocks.state.crewUsers,
}));

vi.mock('../hooks/useNow', () => ({
  useNow: mocks.useNow,
}));

/**
 * Planning reads must come from the mocked IndexedDB-backed hooks only. These
 * factories throw the moment the hook's import graph reaches the network or the
 * database directly, so an accidental dependency fails the file, not one case.
 */
vi.mock('../lib/supabase', () => {
  throw new Error('usePlanningNowData must not import the Supabase client');
});

vi.mock('../repositories', () => {
  throw new Error('usePlanningNowData must not import repositories');
});

vi.mock('../lib/db', () => {
  throw new Error('usePlanningNowData must not import IndexedDB loaders directly');
});

import { usePlanningNowData } from '../hooks/usePlanningNowData';

const FESTIVAL_ID = 'fest-1';
const OTHER_FESTIVAL_ID = 'fest-2';
const NOW = new Date('2027-07-25T12:00:00.000Z');

const FESTIVAL: Festival = {
  id: FESTIVAL_ID,
  slug: 'wacken-2027',
  name: 'Wacken Open Air 2027',
  timezone: 'Europe/Berlin',
  starts_at: '2027-07-28T00:00:00+02:00',
  ends_at: '2027-07-31T23:00:00+02:00',
  features: { running_order: false },
  cache_version: '1',
};

function band(
  id: string,
  name: string,
  createdAt: string,
  festivalId: string = FESTIVAL_ID,
): Band {
  return {
    id,
    festival_id: festivalId,
    slot_id: null,
    name,
    stage: null,
    start_time: null,
    end_time: null,
    image_url: null,
    genre: null,
    category: 'band',
    created_at: createdAt,
  };
}

function member(id: string, displayName: string | null): CrewUser {
  return {
    id,
    display_name: displayName,
    avatar_url: null,
    wacken_arrival_day: null,
    is_friend: false,
  };
}

function pick(
  userId: string,
  bandId: string,
  createdAt: string,
  festivalId: string | null | undefined = FESTIVAL_ID,
): UserPick {
  const row: UserPick = {
    user_id: userId,
    band_id: bandId,
    festival_id: festivalId ?? FESTIVAL_ID,
    created_at: createdAt,
  };
  if (festivalId === undefined) {
    delete (row as { festival_id?: string }).festival_id;
  } else if (festivalId === null) {
    (row as { festival_id: string | null }).festival_id = null;
  }
  return row;
}

const PACK_BANDS = [
  band('old-1', 'Old One', '2026-01-01T00:00:00.000Z'),
  band('old-2', 'Old Two', '2026-02-01T00:00:00.000Z'),
  band('new-1', 'New One', '2026-03-01T00:00:00.000Z'),
  band('new-2', 'New Two', '2026-04-01T00:00:00.000Z'),
  band('new-3', 'New Three', '2026-05-01T00:00:00.000Z'),
  band('other-band', 'Other Festival Band', '2026-12-01T00:00:00.000Z', OTHER_FESTIVAL_ID),
];

// `rafa` has zero Picks and must still appear on the roster.
const PACK_CREW = [
  member('self', 'Sergio'),
  member('rafa', 'Rafa'),
  member('luiz', 'Luiz'),
  member('ana', 'Ana'),
];

const PACK_PICKS = [
  pick('luiz', 'other-band', '2026-06-06T00:00:00.000Z', OTHER_FESTIVAL_ID),
  pick('self', 'new-3', '2026-06-05T00:00:00.000Z'),
  pick('leaver', 'new-2', '2026-06-04T00:00:00.000Z'),
  pick('luiz', 'ghost-band', '2026-06-03T00:00:00.000Z'),
  pick('luiz', 'new-2', '2026-06-02T00:00:00.000Z'),
  pick('ana', 'new-1', '2026-06-01T00:00:00.000Z'),
  pick('ana', 'old-1', '2026-05-20T00:00:00.000Z'),
];

const fetchSpy = vi.fn();

beforeEach(() => {
  mocks.useNow.mockClear();
  mocks.state.festival = FESTIVAL;
  mocks.state.activeFestivalId = FESTIVAL_ID;
  mocks.state.ready = true;
  mocks.state.userId = 'self';
  mocks.state.bands = PACK_BANDS;
  mocks.state.bandsLoading = false;
  mocks.state.picks = PACK_PICKS;
  mocks.state.crewUsers = PACK_CREW;
  mocks.state.now = NOW;
  fetchSpy.mockClear();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePlanningNowData', () => {
  it('projects the Active Festival pack into planning data', () => {
    const { result } = renderHook(() => usePlanningNowData());

    expect(result.current.loading).toBe(false);
    expect(result.current.festival).toBe(FESTIVAL);
    expect(result.current.now).toBe(NOW);
    expect(result.current.countdown).toEqual({ kind: 'days', days: 3 });
    expect(result.current.bands.map((row) => row.id)).toEqual([
      'old-1',
      'old-2',
      'new-1',
      'new-2',
      'new-3',
    ]);
    expect(result.current.newestBands.map((row) => row.id)).toEqual(['new-3', 'new-2', 'new-1']);
  });

  it('sorts the full cached roster, including a member with zero Picks', () => {
    const { result } = renderHook(() => usePlanningNowData());

    expect(result.current.members.map((row) => row.id)).toEqual(['ana', 'luiz', 'rafa', 'self']);
  });

  it('keeps only current peer Picks in the activity list', () => {
    const { result } = renderHook(() => usePlanningNowData());

    expect(
      result.current.activity.map((row) => `${row.member.id}:${row.band.id}`),
    ).toEqual(['luiz:new-2', 'ana:new-1', 'ana:old-1']);
    expect(result.current.activity.every((row) => row.member.id !== 'self')).toBe(true);
    expect(result.current.activity.some((row) => row.pick.user_id === 'leaver')).toBe(false);
    expect(result.current.activity.some((row) => row.pick.band_id === 'ghost-band')).toBe(false);
  });

  it('excludes rows another festival owns from bands and activity', () => {
    const { result } = renderHook(() => usePlanningNowData());

    expect(result.current.bands.some((row) => row.id === 'other-band')).toBe(false);
    expect(result.current.newestBands.some((row) => row.id === 'other-band')).toBe(false);
    expect(result.current.activity.some((row) => row.pick.band_id === 'other-band')).toBe(false);
  });

  it('reports loading while Picks are still undefined', () => {
    mocks.state.picks = undefined;

    const { result } = renderHook(() => usePlanningNowData());

    expect(result.current.loading).toBe(true);
    expect(result.current.activity).toEqual([]);
  });

  it('reports loading while the roster cache is still undefined', () => {
    mocks.state.crewUsers = undefined;

    const { result } = renderHook(() => usePlanningNowData());

    expect(result.current.loading).toBe(true);
    expect(result.current.members).toEqual([]);
  });

  it('reports loading while the Band pack is loading', () => {
    mocks.state.bandsLoading = true;

    const { result } = renderHook(() => usePlanningNowData());

    expect(result.current.loading).toBe(true);
  });

  it('reports loading until the Active Festival context is ready', () => {
    mocks.state.ready = false;

    const { result } = renderHook(() => usePlanningNowData());

    expect(result.current.loading).toBe(true);
  });

  it('still filters to the active id when the catalog row is missing', () => {
    mocks.state.festival = null;
    mocks.state.activeFestivalId = FESTIVAL_ID;

    const { result } = renderHook(() => usePlanningNowData());

    expect(result.current.festival).toBeNull();
    expect(result.current.countdown).toEqual({ kind: 'tba' });
    expect(result.current.bands.map((row) => row.id)).toEqual([
      'old-1',
      'old-2',
      'new-1',
      'new-2',
      'new-3',
    ]);
    expect(result.current.newestBands.map((row) => row.id)).toEqual(['new-3', 'new-2', 'new-1']);
    expect(result.current.activity.some((row) => row.pick.band_id === 'other-band')).toBe(false);
    expect(result.current.members.map((row) => row.id)).toEqual(['ana', 'luiz', 'rafa', 'self']);
  });

  it('exposes empty bands, activity, and members when there is no active id', () => {
    mocks.state.festival = null;
    mocks.state.activeFestivalId = null;

    const { result } = renderHook(() => usePlanningNowData());

    expect(result.current.festival).toBeNull();
    expect(result.current.countdown).toEqual({ kind: 'tba' });
    expect(result.current.bands).toEqual([]);
    expect(result.current.newestBands).toEqual([]);
    expect(result.current.activity).toEqual([]);
    expect(result.current.members).toEqual([]);
  });

  it('keeps legacy null or omitted festival_id rows only when an active id exists', () => {
    const legacyNullBand = {
      ...band('legacy-null', 'Legacy Null', '2026-07-01T00:00:00.000Z'),
      festival_id: null,
    } as unknown as Band;
    const legacyOmittedBand = {
      ...band('legacy-omitted', 'Legacy Omitted', '2026-08-01T00:00:00.000Z'),
    };
    delete (legacyOmittedBand as { festival_id?: string }).festival_id;

    mocks.state.bands = [...PACK_BANDS, legacyNullBand, legacyOmittedBand as Band];
    mocks.state.picks = [
      ...PACK_PICKS,
      pick('luiz', 'legacy-null', '2026-06-08T00:00:00.000Z', null),
      pick('ana', 'legacy-omitted', '2026-06-09T00:00:00.000Z', undefined),
    ];

    const { result, rerender } = renderHook(() => usePlanningNowData());

    expect(result.current.bands.map((row) => row.id)).toEqual([
      'old-1',
      'old-2',
      'new-1',
      'new-2',
      'new-3',
      'legacy-null',
      'legacy-omitted',
    ]);
    expect(result.current.newestBands.map((row) => row.id)).toEqual([
      'legacy-omitted',
      'legacy-null',
      'new-3',
    ]);
    expect(result.current.activity.map((row) => `${row.member.id}:${row.band.id}`)).toEqual([
      'ana:legacy-omitted',
      'luiz:legacy-null',
      'luiz:new-2',
    ]);

    mocks.state.festival = null;
    mocks.state.activeFestivalId = null;
    rerender();

    expect(result.current.bands).toEqual([]);
    expect(result.current.newestBands).toEqual([]);
    expect(result.current.activity).toEqual([]);
  });

  it('keeps derived results referentially stable until a source hook changes', () => {
    const { result, rerender } = renderHook(() => usePlanningNowData());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
    expect(result.current.newestBands).toBe(first.newestBands);
    expect(result.current.activity).toBe(first.activity);
    expect(result.current.members).toBe(first.members);
  });

  it('recomputes when the source hooks return new values', () => {
    const { result, rerender } = renderHook(() => usePlanningNowData());

    expect(result.current.newestBands.map((row) => row.id)).toEqual(['new-3', 'new-2', 'new-1']);

    mocks.state.bands = [...PACK_BANDS, band('new-4', 'New Four', '2026-06-01T00:00:00.000Z')];
    mocks.state.picks = [
      pick('rafa', 'new-4', '2026-06-07T00:00:00.000Z'),
      ...PACK_PICKS,
    ];
    mocks.state.crewUsers = [...PACK_CREW, member('bruno', 'Bruno')];
    mocks.state.now = new Date('2027-07-28T04:00:00.000Z');
    rerender();

    expect(result.current.newestBands.map((row) => row.id)).toEqual(['new-4', 'new-3', 'new-2']);
    expect(result.current.activity[0]).toMatchObject({
      member: { id: 'rafa' },
      band: { id: 'new-4' },
    });
    expect(result.current.members.map((row) => row.id)).toEqual([
      'ana',
      'bruno',
      'luiz',
      'rafa',
      'self',
    ]);
    expect(result.current.countdown).toEqual({ kind: 'today' });
  });

  it('does not import repositories, Supabase, or IDB loaders, and does not call fetch', () => {
    const { result } = renderHook(() => usePlanningNowData());

    expect(result.current.loading).toBe(false);
    expect(mocks.useNow).toHaveBeenCalledWith(60_000);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
