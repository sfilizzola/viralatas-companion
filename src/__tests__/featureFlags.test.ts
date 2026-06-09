// src/__tests__/featureFlags.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { featureFlags } from '../lib/featureFlags';

describe('featureFlags.get()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the stored value when the row resolves successfully', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: { duck_enabled: true }, error: null });
    await expect(featureFlags.get('duck_enabled')).resolves.toBe(true);
    expect(mocks.mockFrom).toHaveBeenCalledWith('app_settings');
    expect(mocks.mockSelect).toHaveBeenCalledWith('duck_enabled');
  });

  it('returns false when the stored value is false', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: { duck_enabled: false }, error: null });
    await expect(featureFlags.get('duck_enabled')).resolves.toBe(false);
  });

  it('returns FLAG_DEFAULT (true) for duck_enabled when Supabase errors', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'network' } });
    await expect(featureFlags.get('duck_enabled')).resolves.toBe(true);
  });

  it('returns FLAG_DEFAULT (false) for moshsplit_enabled when Supabase errors', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'network' } });
    await expect(featureFlags.get('moshsplit_enabled')).resolves.toBe(false);
  });

  it('returns FLAG_DEFAULT (true) for duck_enabled when Supabase throws', async () => {
    mocks.mockSingle.mockRejectedValueOnce(new Error('offline'));
    await expect(featureFlags.get('duck_enabled')).resolves.toBe(true);
  });

  it('returns FLAG_DEFAULT when the column is null', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: { duck_enabled: null }, error: null });
    await expect(featureFlags.get('duck_enabled')).resolves.toBe(true);
  });
});

describe('featureFlags.set()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the row id then updates the correct column + updated_at', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: { id: 'settings-row-id' }, error: null });

    await featureFlags.set('duck_enabled', false);

    expect(mocks.mockUpdate).toHaveBeenCalledTimes(1);
    const payload = (mocks.mockUpdate.mock.calls[0] as [Record<string, unknown>])[0];
    expect(payload.duck_enabled).toBe(false);
    expect(typeof payload.updated_at).toBe('string');
    expect(new Date(payload.updated_at as string).toString()).not.toBe('Invalid Date');
    expect(mocks.mockEq).toHaveBeenCalledWith('id', 'settings-row-id');
  });

  it('throws when the row lookup fails (no orphan UPDATE)', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
    await expect(featureFlags.set('duck_enabled', true)).rejects.toBeTruthy();
    expect(mocks.mockUpdate).not.toHaveBeenCalled();
  });

  it('throws when the UPDATE itself fails', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: { id: 'settings-row-id' }, error: null });
    mocks.mockEq.mockResolvedValueOnce({ error: { message: 'rls denied' } });
    await expect(featureFlags.set('duck_enabled', true)).rejects.toBeTruthy();
  });
});

describe('featureFlags.getAll()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all flag values from a single fetch', async () => {
    mocks.mockSingle.mockResolvedValueOnce({
      data: {
        registration_enabled: true,
        duck_enabled: false,
        playlist_testing: true,
        moshsplit_enabled: true,
      },
      error: null,
    });

    const result = await featureFlags.getAll();

    expect(result).toEqual({
      registration_enabled: true,
      duck_enabled: false,
      playlist_testing: true,
      moshsplit_enabled: true,
    });
    expect(mocks.mockFrom).toHaveBeenCalledTimes(1);
  });

  it('returns all FLAG_DEFAULTS when Supabase errors', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'network' } });
    const result = await featureFlags.getAll();
    expect(result).toEqual({
      registration_enabled: true,
      duck_enabled: true,
      playlist_testing: true,
      moshsplit_enabled: false,
    });
  });

  it('applies per-flag defaults for any null columns', async () => {
    mocks.mockSingle.mockResolvedValueOnce({
      data: {
        registration_enabled: true,
        duck_enabled: null,
        playlist_testing: null,
        moshsplit_enabled: null,
      },
      error: null,
    });
    const result = await featureFlags.getAll();
    expect(result.duck_enabled).toBe(true);       // null → default true
    expect(result.playlist_testing).toBe(true);   // null → default true
    expect(result.moshsplit_enabled).toBe(false);  // null → default false
  });
});
