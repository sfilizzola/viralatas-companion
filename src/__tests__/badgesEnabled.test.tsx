import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { useContext, useEffect } from 'react';

const mocks = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockLimit = vi.fn(() => ({ single: mockSingle }));
  const mockEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  const mockSelect = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }));
  return { mockFrom, mockSingle, mockLimit, mockEq, mockUpdate, mockSelect };
});

vi.mock('../lib/supabase', () => ({
  supabase: { from: mocks.mockFrom },
}));

// No useActiveFestival mock on purpose: badges are a global flag, so the
// provider must work without any festival context in the tree.
import {
  BadgesEnabledContext,
  BadgesEnabledProvider,
  useBadgesEnabled,
  useRefreshBadgesEnabled,
  useSetBadgesEnabled,
} from '../contexts/BadgesEnabledContext';

type SingleResult = { data: { badges_enabled: boolean } | null; error: { message: string } | null };

type Snapshot = { badgesEnabled: boolean; loading: boolean };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Crosses a macrotask boundary, which drains every microtask queued by an
// already-resolved promise chain. Only used after an explicit resolve(), where
// the work to flush is guaranteed to be pending — never as a guess that a fetch
// will have finished by the time the timer fires.
async function flushResolvedChain() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function last<T>(values: T[]): T {
  return values[values.length - 1];
}

// Reads the raw Context so tests can observe `loading`, which is the provider's
// own "fetch finished" signal.
function Probe({ onSnapshot }: { onSnapshot: (snapshot: Snapshot) => void }) {
  const { badgesEnabled, loading } = useContext(BadgesEnabledContext);
  useEffect(() => {
    onSnapshot({ badgesEnabled, loading });
  }, [onSnapshot, badgesEnabled, loading]);
  return null;
}

function ProbePublicHook({ onValue }: { onValue: (value: boolean) => void }) {
  const value = useBadgesEnabled();
  useEffect(() => {
    onValue(value);
  }, [onValue, value]);
  return null;
}

function ProbeRefresh({ refReceiver }: { refReceiver: (fn: () => Promise<void>) => void }) {
  const refresh = useRefreshBadgesEnabled();
  useEffect(() => {
    refReceiver(refresh);
  }, [refReceiver, refresh]);
  return null;
}

function ProbeSet({ refReceiver }: { refReceiver: (fn: (value: boolean) => void) => void }) {
  const setEnabled = useSetBadgesEnabled();
  useEffect(() => {
    refReceiver(setEnabled);
  }, [refReceiver, setEnabled]);
  return null;
}

describe('BadgesEnabledProvider — fail-hidden killswitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stays false while loading and after the first fetch resolves false', async () => {
    mocks.mockSingle.mockResolvedValueOnce({
      data: { badges_enabled: false },
      error: null,
    });

    const snapshots: Snapshot[] = [];

    render(
      <BadgesEnabledProvider>
        <Probe onSnapshot={(s) => snapshots.push(s)} />
      </BadgesEnabledProvider>,
    );

    // The provider clears `loading` only from the fetch callback, so this waits
    // for the fetch to actually complete rather than for an arbitrary delay.
    await waitFor(() => {
      expect(last(snapshots).loading).toBe(false);
    });

    // Fail-hidden: no "true flash" at any point, before or after completion.
    expect(snapshots.every((s) => s.badgesEnabled === false)).toBe(true);
    expect(snapshots[0]).toEqual({ badgesEnabled: false, loading: true });
    expect(mocks.mockFrom).toHaveBeenCalledWith('app_settings');
    expect(mocks.mockSelect).toHaveBeenCalledWith('badges_enabled');
  });

  it('flips to true after the initial fetch resolves true', async () => {
    mocks.mockSingle.mockResolvedValueOnce({
      data: { badges_enabled: true },
      error: null,
    });

    const observed: boolean[] = [];

    render(
      <BadgesEnabledProvider>
        <ProbePublicHook onValue={(v) => observed.push(v)} />
      </BadgesEnabledProvider>,
    );

    await waitFor(() => {
      expect(last(observed)).toBe(true);
    });

    // First observed value is still the fail-hidden default.
    expect(observed[0]).toBe(false);
  });

  it('remains false when the initial fetch fails', async () => {
    mocks.mockSingle.mockRejectedValueOnce(new Error('offline'));

    const snapshots: Snapshot[] = [];

    render(
      <BadgesEnabledProvider>
        <Probe onSnapshot={(s) => snapshots.push(s)} />
      </BadgesEnabledProvider>,
    );

    // Waits for the failed fetch to settle: `loading` flips only once the
    // provider has handled the failure.
    await waitFor(() => {
      expect(last(snapshots).loading).toBe(false);
    });

    expect(snapshots.every((s) => s.badgesEnabled === false)).toBe(true);
  });

  it('refresh() picks up an admin toggle from false to true within the same session', async () => {
    mocks.mockSingle
      .mockResolvedValueOnce({ data: { badges_enabled: false }, error: null })
      .mockResolvedValueOnce({ data: { badges_enabled: true }, error: null });

    const snapshots: Snapshot[] = [];
    let refresh: () => Promise<void> = async () => {};

    render(
      <BadgesEnabledProvider>
        <Probe onSnapshot={(s) => snapshots.push(s)} />
        <ProbeRefresh refReceiver={(fn) => { refresh = fn; }} />
      </BadgesEnabledProvider>,
    );

    await waitFor(() => {
      expect(last(snapshots).loading).toBe(false);
    });
    expect(last(snapshots).badgesEnabled).toBe(false);

    await act(async () => {
      await refresh();
    });

    await waitFor(() => {
      expect(last(snapshots).badgesEnabled).toBe(true);
    });
  });

  it('keeps a refresh result authoritative when a slower initial fetch resolves afterwards', async () => {
    const initial = deferred<SingleResult>();
    const refreshed = deferred<SingleResult>();
    mocks.mockSingle
      .mockImplementationOnce(() => initial.promise)
      .mockImplementationOnce(() => refreshed.promise);

    const snapshots: Snapshot[] = [];
    let refresh: () => Promise<void> = async () => {};

    render(
      <BadgesEnabledProvider>
        <Probe onSnapshot={(s) => snapshots.push(s)} />
        <ProbeRefresh refReceiver={(fn) => { refresh = fn; }} />
      </BadgesEnabledProvider>,
    );

    // Initial fetch is still in flight, so the fail-hidden default holds.
    expect(last(snapshots)).toEqual({ badgesEnabled: false, loading: true });

    // The refresh claims a newer request id and wins the race.
    await act(async () => {
      const refreshDone = refresh();
      refreshed.resolve({ data: { badges_enabled: true }, error: null });
      await refreshDone;
    });

    expect(last(snapshots)).toEqual({ badgesEnabled: true, loading: false });

    // The stale initial fetch now resolves false and must not clobber it.
    initial.resolve({ data: { badges_enabled: false }, error: null });
    await flushResolvedChain();

    expect(last(snapshots)).toEqual({ badgesEnabled: true, loading: false });
    expect(mocks.mockSingle).toHaveBeenCalledTimes(2);
  });

  it('keeps a confirmed local value authoritative over an older failed read', async () => {
    const initial = deferred<SingleResult>();
    mocks.mockSingle.mockImplementationOnce(() => initial.promise);

    const snapshots: Snapshot[] = [];
    let setEnabled: (value: boolean) => void = () => {};

    render(
      <BadgesEnabledProvider>
        <Probe onSnapshot={(s) => snapshots.push(s)} />
        <ProbeSet refReceiver={(fn) => { setEnabled = fn; }} />
      </BadgesEnabledProvider>,
    );

    act(() => {
      setEnabled(true);
    });
    expect(last(snapshots)).toEqual({ badgesEnabled: true, loading: false });

    initial.resolve({ data: null, error: { message: 'offline' } });
    await flushResolvedChain();

    expect(last(snapshots)).toEqual({ badgesEnabled: true, loading: false });
    expect(mocks.mockSingle).toHaveBeenCalledTimes(1);
  });
});
