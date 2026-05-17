import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { useEffect } from 'react';

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

import { getDuckEnabled, setDuckEnabled } from '../lib/appSettings';
import {
  DuckEnabledProvider,
  useDuckEnabled,
  useRefreshDuckEnabled,
} from '../contexts/DuckEnabledContext';

describe('Duck killswitch — appSettings helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDuckEnabled()', () => {
    it('returns true when the row reports duck_enabled = true', async () => {
      mocks.mockSingle.mockResolvedValueOnce({
        data: { duck_enabled: true },
        error: null,
      });
      await expect(getDuckEnabled()).resolves.toBe(true);
      expect(mocks.mockFrom).toHaveBeenCalledWith('app_settings');
      expect(mocks.mockSelect).toHaveBeenCalledWith('duck_enabled');
    });

    it('returns false when the row reports duck_enabled = false', async () => {
      mocks.mockSingle.mockResolvedValueOnce({
        data: { duck_enabled: false },
        error: null,
      });
      await expect(getDuckEnabled()).resolves.toBe(false);
    });

    it('defaults to true when Supabase returns an error (offline-first principle)', async () => {
      mocks.mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'network error' },
      });
      await expect(getDuckEnabled()).resolves.toBe(true);
    });

    it('defaults to true when Supabase throws', async () => {
      mocks.mockSingle.mockRejectedValueOnce(new Error('boom'));
      await expect(getDuckEnabled()).resolves.toBe(true);
    });

    it('defaults to true when the column is null on the returned row', async () => {
      mocks.mockSingle.mockResolvedValueOnce({
        data: { duck_enabled: null },
        error: null,
      });
      await expect(getDuckEnabled()).resolves.toBe(true);
    });
  });

  describe('setDuckEnabled()', () => {
    it('updates the duck_enabled column with the new value and a fresh updated_at', async () => {
      mocks.mockSingle.mockResolvedValueOnce({
        data: { id: 'app-settings-row-id' },
        error: null,
      });

      await expect(setDuckEnabled(false)).resolves.toBe(true);

      expect(mocks.mockUpdate).toHaveBeenCalledTimes(1);
      const firstCall = mocks.mockUpdate.mock.calls[0] as unknown as [
        { duck_enabled: boolean; updated_at: string },
      ];
      const updatePayload = firstCall[0];
      expect(updatePayload.duck_enabled).toBe(false);
      expect(typeof updatePayload.updated_at).toBe('string');
      expect(new Date(updatePayload.updated_at).toString()).not.toBe('Invalid Date');
      expect(mocks.mockEq).toHaveBeenCalledWith('id', 'app-settings-row-id');
    });

    it('throws when the row lookup fails (no orphan UPDATE without a target id)', async () => {
      mocks.mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'row not found' },
      });

      await expect(setDuckEnabled(true)).rejects.toBeTruthy();
      expect(mocks.mockUpdate).not.toHaveBeenCalled();
    });

    it('throws when the UPDATE itself fails', async () => {
      mocks.mockSingle.mockResolvedValueOnce({
        data: { id: 'app-settings-row-id' },
        error: null,
      });
      mocks.mockEq.mockResolvedValueOnce({ error: { message: 'rls denied' } });

      await expect(setDuckEnabled(true)).rejects.toBeTruthy();
    });
  });
});

function ProbeDuckEnabled({ onValue }: { onValue: (value: boolean) => void }) {
  const value = useDuckEnabled();
  useEffect(() => {
    onValue(value);
  }, [onValue, value]);
  return null;
}

function ProbeRefresh({ refReceiver }: { refReceiver: (fn: () => Promise<void>) => void }) {
  const refresh = useRefreshDuckEnabled();
  useEffect(() => {
    refReceiver(refresh);
  }, [refReceiver, refresh]);
  return null;
}

describe('Duck killswitch — DuckEnabledProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes true while loading and after the first fetch resolves true', async () => {
    mocks.mockSingle.mockResolvedValueOnce({
      data: { duck_enabled: true },
      error: null,
    });

    const observed: boolean[] = [];

    render(
      <DuckEnabledProvider>
        <ProbeDuckEnabled onValue={(v) => observed.push(v)} />
      </DuckEnabledProvider>,
    );

    // The Context defaults to true while the initial fetch is in flight,
    // and stays true after it resolves true. No "false-on-mount" flash.
    await waitFor(() => {
      expect(observed[observed.length - 1]).toBe(true);
    });
    expect(observed.every((v) => v === true)).toBe(true);
  });

  it('flips to false after the initial fetch resolves false', async () => {
    mocks.mockSingle.mockResolvedValueOnce({
      data: { duck_enabled: false },
      error: null,
    });

    const observed: boolean[] = [];

    render(
      <DuckEnabledProvider>
        <ProbeDuckEnabled onValue={(v) => observed.push(v)} />
      </DuckEnabledProvider>,
    );

    await waitFor(() => {
      expect(observed[observed.length - 1]).toBe(false);
    });
  });

  it('keeps the duck enabled (true) if the initial fetch fails', async () => {
    mocks.mockSingle.mockRejectedValueOnce(new Error('offline'));

    const observed: boolean[] = [];

    render(
      <DuckEnabledProvider>
        <ProbeDuckEnabled onValue={(v) => observed.push(v)} />
      </DuckEnabledProvider>,
    );

    // We can't easily await a state that didn't change, but a microtask
    // is enough to let the failed fetch settle.
    await new Promise((r) => setTimeout(r, 0));

    expect(observed.every((v) => v === true)).toBe(true);
  });

  it('refresh() picks up an admin toggle within the same session', async () => {
    // Initial fetch returns true; refresh-after-toggle returns false.
    mocks.mockSingle
      .mockResolvedValueOnce({ data: { duck_enabled: true }, error: null })
      .mockResolvedValueOnce({ data: { duck_enabled: false }, error: null });

    const observed: boolean[] = [];
    let refresh: () => Promise<void> = async () => {};

    render(
      <DuckEnabledProvider>
        <ProbeDuckEnabled onValue={(v) => observed.push(v)} />
        <ProbeRefresh refReceiver={(fn) => { refresh = fn; }} />
      </DuckEnabledProvider>,
    );

    await waitFor(() => {
      expect(observed[observed.length - 1]).toBe(true);
    });

    await act(async () => {
      await refresh();
    });

    await waitFor(() => {
      expect(observed[observed.length - 1]).toBe(false);
    });
  });
});
