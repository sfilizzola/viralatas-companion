import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';
import {
  DEFAULT_METAL_PLACE_CONFIG,
  SCENARIO_NOW,
  scenarioBand,
  scenarioPick,
  scenarioPresence,
  scenarioUser,
} from './fixtures/liveNowScenarios';

installFakeIndexedDB();

const localStorageStore = vi.hoisted(() => new Map<string, string>());

const {
  userId,
  setCampingStatus,
  setMetalPlaceStatus,
  applyPresenceToggle,
  autoClearCampingOnCurrentBand,
  validateAndAutoCheckout,
  isTimeWithinMetalPlaceWindow,
} = vi.hoisted(() => {
  const setCampingStatus = vi.fn().mockResolvedValue(undefined);
  const setMetalPlaceStatus = vi.fn().mockResolvedValue(undefined);
  const applyPresenceToggle = vi.fn(
    async (
      uid: string,
      nextValue: 'auto' | 'camping' | 'metal_place',
      ctx: {
        myRawPlanStatus: string;
        isAtMetalPlace: boolean;
        isCamping: boolean;
      },
    ) => {
      if (nextValue === 'camping') {
        if (ctx.myRawPlanStatus === 'current') {
          await setCampingStatus(uid, false);
          return;
        }
        await setCampingStatus(uid, true);
        return;
      }
      if (nextValue === 'metal_place') {
        await setMetalPlaceStatus(uid, true);
        return;
      }
      if (ctx.isAtMetalPlace) await setMetalPlaceStatus(uid, false);
      if (ctx.isCamping) await setCampingStatus(uid, false);
    },
  );
  const autoClearCampingOnCurrentBand = vi.fn(
    async (uid: string, isCamping: boolean, myRawPlanStatus: string) => {
      if (isCamping && myRawPlanStatus === 'current') {
        await setCampingStatus(uid, false);
      }
    },
  );
  return {
    userId: 'user-now-data',
    setCampingStatus,
    setMetalPlaceStatus,
    applyPresenceToggle,
    autoClearCampingOnCurrentBand,
    validateAndAutoCheckout: vi.fn().mockResolvedValue(undefined),
    isTimeWithinMetalPlaceWindow: vi.fn().mockReturnValue(true),
  };
});

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (localStorageStore.has(key) ? localStorageStore.get(key)! : null),
      setItem: (key: string, value: string) => {
        localStorageStore.set(key, String(value));
      },
      removeItem: (key: string) => {
        localStorageStore.delete(key);
      },
      clear: () => localStorageStore.clear(),
      key: (i: number) => Array.from(localStorageStore.keys())[i] ?? null,
      get length() {
        return localStorageStore.size;
      },
    },
  });
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('../lib/realtimeSync', () => ({
  subscribePostgresChanges: vi.fn(() => () => {}),
}));

vi.mock('../services/liveBandTest', () => ({
  syncLiveBandTestConfig: vi.fn().mockResolvedValue(undefined),
}));

const recordCommittedSkip = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../services/weakSkips', () => ({
  WEAK_SKIP_UNDO_MS: 10,
  recordCommittedSkip,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: userId } },
    user: {
      id: userId,
      user_metadata: { display_name: 'Test User' },
      email: 'test@test.com',
    },
    loading: false,
  }),
}));

vi.mock('../repositories', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../repositories')>();
  return {
    ...actual,
    presenceRepository: {
      ...actual.presenceRepository,
      setCampingStatus,
      setMetalPlaceStatus,
      syncCrewFromRemote: vi.fn().mockResolvedValue(undefined),
      syncMetalPlaceConfig: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock('../services/presenceService', () => ({
  presenceService: {
    applyPresenceToggle,
    autoClearCampingOnCurrentBand,
    validateAndAutoCheckout,
  },
}));

import {
  PRESENCE_CHANGED_EVENT,
  resetDbConnectionForTests,
  saveBands,
  saveCrewUsers,
  saveMetalPlaceConfig,
  saveUserPick,
  saveUserPresence,
} from '../lib/db';
import { clearTimeOverride, setTimeOverride } from '../services/time';
import { useNowData } from '../hooks/useNowData';

const currentBand = scenarioBand(
  'band-current',
  '2026-07-29T18:30:00Z',
  '2026-07-29T21:30:00Z',
  { name: 'Airbourne' },
);

const ceremonyBand = scenarioBand(
  'band-ceremony',
  '2026-07-29T18:30:00Z',
  '2026-07-29T21:30:00Z',
  { name: 'Opening Ceremony', category: 'ceremony' },
);

const duckFreshBand = scenarioBand(
  'band-duck-fresh',
  '2026-07-29T19:50:00Z',
  '2026-07-29T21:30:00Z',
  { name: 'Fresh Duck Band' },
);

const duckStaleBand = scenarioBand(
  'band-duck-stale',
  '2026-07-29T19:45:00Z',
  '2026-07-29T21:30:00Z',
  { name: 'Stale Duck Band' },
);

async function seedBaseScenario(bands = [currentBand]) {
  await saveBands(bands);
  await saveCrewUsers([scenarioUser(userId, 'Test User')]);
  await saveMetalPlaceConfig(DEFAULT_METAL_PLACE_CONFIG);
}

async function waitForNowDataReady() {
  const hook = renderHook(() => useNowData());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(async () => {
  localStorageStore.clear();
  await resetDbConnectionForTests();
  await deleteViralatasDatabase();
  setTimeOverride(SCENARIO_NOW);
  isTimeWithinMetalPlaceWindow.mockReturnValue(true);
  setCampingStatus.mockClear();
  setMetalPlaceStatus.mockClear();
  applyPresenceToggle.mockClear();
  autoClearCampingOnCurrentBand.mockClear();
  validateAndAutoCheckout.mockClear();
  recordCommittedSkip.mockClear();
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
});

afterEach(() => {
  clearTimeOverride();
});

describe('useNowData — handlePresenceChange', () => {
  it('blocks camping when myRawPlan.status is current (sets false, never true)', async () => {
    await seedBaseScenario();
    await saveUserPick(scenarioPick(userId, currentBand.id));
    await saveUserPresence(scenarioPresence(userId, {}));

    const { result } = await waitForNowDataReady();
    expect(result.current.myPlan.status).toBe('current');

    await act(async () => {
      await result.current.handlePresenceChange('camping');
    });

    expect(setCampingStatus).toHaveBeenCalledTimes(1);
    expect(setCampingStatus).toHaveBeenCalledWith(userId, false);
    expect(setCampingStatus).not.toHaveBeenCalledWith(userId, true);
  });

  it('sets camping true when not on a current band', async () => {
    await seedBaseScenario();
    await saveUserPresence(scenarioPresence(userId, {}));

    const { result } = await waitForNowDataReady();
    expect(result.current.myPlan.status).not.toBe('current');

    await act(async () => {
      await result.current.handlePresenceChange('camping');
    });

    expect(setCampingStatus).toHaveBeenCalledWith(userId, true);
  });

  it('sets metal place true for metal_place toggle', async () => {
    await seedBaseScenario();
    await saveUserPresence(scenarioPresence(userId, {}));

    const { result } = await waitForNowDataReady();

    await act(async () => {
      await result.current.handlePresenceChange('metal_place');
    });

    expect(setMetalPlaceStatus).toHaveBeenCalledWith(userId, true);
  });

  it('clears MP and camping flags on auto when both are active', async () => {
    await seedBaseScenario();
    await saveUserPresence(
      scenarioPresence(userId, { is_camping: true, is_at_metal_place: true }),
    );

    const { result } = await waitForNowDataReady();

    await act(async () => {
      await result.current.handlePresenceChange('auto');
    });

    expect(setMetalPlaceStatus).toHaveBeenCalledWith(userId, false);
    expect(setCampingStatus).toHaveBeenCalledWith(userId, false);
  });
});

describe('useNowData — camping auto-clear effect', () => {
  it('clears camping when is_camping and user has a current band', async () => {
    await seedBaseScenario();
    await saveUserPick(scenarioPick(userId, currentBand.id));
    await saveUserPresence(scenarioPresence(userId, { is_camping: true }));

    await waitForNowDataReady();

    await waitFor(() => {
      expect(setCampingStatus).toHaveBeenCalledWith(userId, false);
    });
  });
});

describe('useNowData — validateAndAutoCheckout', () => {
  it('invokes validateAndAutoCheckout when MP window is inactive', async () => {
    isTimeWithinMetalPlaceWindow.mockReturnValue(false);
    await seedBaseScenario();
    await saveUserPresence(scenarioPresence(userId, { is_at_metal_place: true }));

    await waitForNowDataReady();

    await waitFor(() => {
      expect(validateAndAutoCheckout).toHaveBeenCalledWith(
        DEFAULT_METAL_PLACE_CONFIG,
        userId,
      );
    });
  });
});

describe('useNowData — skip and undo', () => {
  it('unpicks current band and sets undoState on skip; undo re-picks within window', async () => {
    await seedBaseScenario();
    await saveUserPick(scenarioPick(userId, currentBand.id));
    await saveUserPresence(scenarioPresence(userId, {}));

    const { result } = await waitForNowDataReady();
    expect(result.current.myPlan.band?.id).toBe(currentBand.id);

    await act(async () => {
      await result.current.handleSkip();
    });

    expect(result.current.undoState).toEqual({
      bandId: currentBand.id,
      bandName: currentBand.name,
    });
    await waitFor(() => {
      expect(result.current.picks.some((pick) => pick.band_id === currentBand.id)).toBe(false);
    });

    await act(async () => {
      await result.current.handleUndo();
    });

    expect(result.current.undoState).toBeNull();
    await waitFor(() => {
      expect(result.current.picks.some((pick) => pick.band_id === currentBand.id)).toBe(true);
    });
  });
});

describe('useNowData — weak skip counter', () => {
  it('records a committed skip after the undo window expires', async () => {
    await seedBaseScenario();
    await saveUserPick(scenarioPick(userId, currentBand.id));
    await saveUserPresence(scenarioPresence(userId, {}));

    const { result } = await waitForNowDataReady();

    await act(async () => {
      await result.current.handleSkip();
    });

    expect(recordCommittedSkip).not.toHaveBeenCalled();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });

    await waitFor(() => {
      expect(recordCommittedSkip).toHaveBeenCalledTimes(1);
    });
    expect(recordCommittedSkip).toHaveBeenCalledWith(userId, currentBand.id);
  });

  it('does not record a skip when undo happens before the commit timer', async () => {
    await seedBaseScenario();
    await saveUserPick(scenarioPick(userId, currentBand.id));
    await saveUserPresence(scenarioPresence(userId, {}));

    const { result } = await waitForNowDataReady();

    await act(async () => {
      await result.current.handleSkip();
    });

    await act(async () => {
      await result.current.handleUndo();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });

    expect(recordCommittedSkip).not.toHaveBeenCalled();
  });

  it('commits the previous skip immediately when a second weak skip starts', async () => {
    const bandA = scenarioBand(
      'band-a',
      '2026-07-29T18:00:00Z',
      '2026-07-29T21:00:00Z',
      { name: 'Grand Magus' },
    );
    const bandB = scenarioBand(
      'band-b',
      '2026-07-29T18:30:00Z',
      '2026-07-29T21:30:00Z',
      { name: 'Airbourne' },
    );
    await seedBaseScenario([bandA, bandB]);
    await saveUserPick(scenarioPick(userId, bandA.id));
    await saveUserPick(scenarioPick(userId, bandB.id));
    await saveUserPresence(scenarioPresence(userId, {}));

    const { result } = await waitForNowDataReady();
    expect(result.current.myPlan.band?.id).toBe(bandB.id);

    await act(async () => {
      await result.current.handleSkip();
    });

    await act(async () => {
      await result.current.handleSkip();
    });

    expect(recordCommittedSkip).toHaveBeenCalledTimes(1);
    expect(recordCommittedSkip).toHaveBeenCalledWith(userId, bandB.id);
  });
});

describe('useNowData — duckBandId gating', () => {
  it('returns null for ceremony current band', async () => {
    await seedBaseScenario([ceremonyBand]);
    await saveUserPick(scenarioPick(userId, ceremonyBand.id));

    const { result } = await waitForNowDataReady();

    expect(result.current.myPlan.status).toBe('current');
    expect(result.current.duckBandId).toBeNull();
  });

  it('returns null after the first 15 minutes of the set', async () => {
    await seedBaseScenario([duckStaleBand]);
    await saveUserPick(scenarioPick(userId, duckStaleBand.id));

    const { result } = await waitForNowDataReady();

    expect(result.current.myPlan.status).toBe('current');
    expect(result.current.duckBandId).toBeNull();
  });

  it('returns band id for a normal current band within the duck window', async () => {
    await seedBaseScenario([duckFreshBand]);
    await saveUserPick(scenarioPick(userId, duckFreshBand.id));

    const { result } = await waitForNowDataReady();

    expect(result.current.myPlan.status).toBe('current');
    expect(result.current.duckBandId).toBe(duckFreshBand.id);
  });
});

describe('useNowData — cache refresh on window events', () => {
  it('reloads presence when PRESENCE_CHANGED_EVENT fires', async () => {
    await seedBaseScenario();
    const loadSpy = vi.spyOn(await import('../lib/db'), 'loadAllUserPresence');

    const { result } = await waitForNowDataReady();
    expect(result.current.presence).toEqual([]);

    await saveUserPresence(scenarioPresence(userId, { is_camping: true }));
    window.dispatchEvent(new Event(PRESENCE_CHANGED_EVENT));

    await waitFor(() => {
      expect(loadSpy).toHaveBeenCalled();
      expect(result.current.presence.some((item) => item.user_id === userId && item.is_camping)).toBe(
        true,
      );
    });

    loadSpy.mockRestore();
  });
});

describe('useNowData — characterization snapshot', () => {
  it('matches key NowData fields for a current-band scenario', async () => {
    await seedBaseScenario();
    await saveUserPick(scenarioPick(userId, currentBand.id));
    await saveUserPresence(scenarioPresence(userId, {}));

    const { result } = await waitForNowDataReady();

    expect({
      userId: result.current.userId,
      loading: result.current.loading,
      myPlanStatus: result.current.myPlan.status,
      myPlanBandId: result.current.myPlan.band?.id ?? null,
      presenceValue: result.current.presenceValue,
      duckBandId: result.current.duckBandId,
      undoState: result.current.undoState,
      isMetalPlaceWindowActive: result.current.isMetalPlaceWindowActive,
      isFriend: result.current.isFriend,
    }).toMatchInlineSnapshot(`
      {
        "duckBandId": null,
        "isFriend": false,
        "isMetalPlaceWindowActive": true,
        "loading": false,
        "myPlanBandId": "band-current",
        "myPlanStatus": "current",
        "presenceValue": "auto",
        "undoState": null,
        "userId": "user-now-data",
      }
    `);
  });
});
