import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      updateUser: vi.fn().mockReturnValue({ catch: vi.fn() }),
    },
  },
}));

vi.mock('../lib/db', () => ({
  saveUserPresence: vi.fn().mockResolvedValue(undefined),
  loadUserPresence: vi.fn().mockResolvedValue(undefined),
  enqueueOfflinePresence: vi.fn().mockResolvedValue(undefined),
  loadOfflinePresenceQueue: vi.fn().mockResolvedValue([]),
  removeFromOfflinePresenceQueue: vi.fn().mockResolvedValue(undefined),
  replaceUserPresence: vi.fn().mockResolvedValue(undefined),
  saveMetalPlaceConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/time', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/time')>();
  return {
    ...actual,
    now: vi.fn(),
  };
});

import { supabase } from '../lib/supabase';
import * as db from '../lib/db';
import { now } from '../services/time';
import { presenceRepository } from '../repositories/presence';
import { presenceService } from '../services/presenceService';
import type { MetalPlaceConfig, UserPresence } from '../types';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null } } as any);
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    writable: true,
    configurable: true,
  });
});

describe('presenceRepository.setCampingStatus', () => {
  it('saves to IDB and upserts to Supabase when online', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ upsert: mockUpsert } as any);
    vi.mocked(db.loadUserPresence).mockResolvedValue(undefined);

    await presenceRepository.setCampingStatus('user1', true);

    expect(db.saveUserPresence).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', is_camping: true }),
    );
    expect(supabase.from).toHaveBeenCalledWith('user_presence');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', is_camping: true }),
    );
    expect(db.enqueueOfflinePresence).not.toHaveBeenCalled();
  });

  it('saves to IDB and queues offline when navigator.onLine is false', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    vi.mocked(db.loadUserPresence).mockResolvedValue(undefined);

    await presenceRepository.setCampingStatus('user1', true);

    expect(db.saveUserPresence).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', is_camping: true }),
    );
    expect(db.enqueueOfflinePresence).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', is_camping: true }),
    );
    // No Supabase table call when offline
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('preserves existing is_at_metal_place when setting is_camping to false', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ upsert: mockUpsert } as any);
    const existing: UserPresence = {
      user_id: 'user1',
      is_camping: true,
      is_at_metal_place: false,
      updated_at: '2026-07-29T10:00:00Z',
    };
    vi.mocked(db.loadUserPresence).mockResolvedValue(existing);

    await presenceRepository.setCampingStatus('user1', false);

    expect(db.saveUserPresence).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', is_camping: false, is_at_metal_place: false }),
    );
  });

  it('returns entered:true when transitioning from not-camping to camping', async () => {
    vi.mocked(supabase.from).mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) } as any);
    vi.mocked(db.loadUserPresence).mockResolvedValue(undefined); // was not camping

    const result = await presenceRepository.setCampingStatus('user1', true);

    expect(result.entered).toBe(true);
  });

  it('returns entered:false when already camping', async () => {
    vi.mocked(supabase.from).mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) } as any);
    vi.mocked(db.loadUserPresence).mockResolvedValue({
      user_id: 'user1', is_camping: true, is_at_metal_place: false, updated_at: '2026-07-29T10:00:00Z',
    });

    const result = await presenceRepository.setCampingStatus('user1', true);

    expect(result.entered).toBe(false);
  });

  it('returns entered:false when setting camping to false', async () => {
    vi.mocked(supabase.from).mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) } as any);
    vi.mocked(db.loadUserPresence).mockResolvedValue(undefined);

    const result = await presenceRepository.setCampingStatus('user1', false);

    expect(result.entered).toBe(false);
  });

  it('does not call incrementLocationVisit (visit tracking moved to service layer)', async () => {
    vi.mocked(supabase.from).mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) } as any);
    vi.mocked(db.loadUserPresence).mockResolvedValue(undefined);

    await presenceRepository.setCampingStatus('user1', true);

    // getUser is the first call in incrementLocationVisit — it must NOT be called from the repo
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });
});

// isMetalPlaceWindowActive pure-function tests live in presencePolicy.test.ts

describe('presenceService.applyPresenceToggle', () => {
  const baseContext = {
    myRawPlanStatus: 'empty' as const,
    isAtMetalPlace: false,
    isCamping: false,
  };

  it('blocks camping when myRawPlanStatus is current (sets false, never true)', async () => {
    vi.mocked(db.loadUserPresence).mockResolvedValue(undefined);

    await presenceService.applyPresenceToggle('user1', 'camping', {
      ...baseContext,
      myRawPlanStatus: 'current',
    });

    expect(db.saveUserPresence).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', is_camping: false }),
    );
    expect(db.saveUserPresence).not.toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', is_camping: true }),
    );
  });

  it('sets camping true when not on a current band', async () => {
    vi.mocked(db.loadUserPresence).mockResolvedValue(undefined);

    await presenceService.applyPresenceToggle('user1', 'camping', baseContext);

    expect(db.saveUserPresence).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', is_camping: true }),
    );
  });

  it('sets metal place true for metal_place toggle', async () => {
    vi.mocked(db.loadUserPresence).mockResolvedValue(undefined);

    await presenceService.applyPresenceToggle('user1', 'metal_place', baseContext);

    expect(db.saveUserPresence).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', is_at_metal_place: true }),
    );
  });

  it('clears MP and camping flags on auto when both are active', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ upsert: mockUpsert } as any);
    vi.mocked(db.loadUserPresence).mockResolvedValue({
      user_id: 'user1',
      is_camping: true,
      is_at_metal_place: true,
      updated_at: '2026-07-29T10:00:00Z',
    });

    await presenceService.applyPresenceToggle('user1', 'auto', {
      ...baseContext,
      isCamping: true,
      isAtMetalPlace: true,
    });

    expect(db.saveUserPresence).toHaveBeenCalledTimes(2);
    expect(db.saveUserPresence).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', is_at_metal_place: false }),
    );
    expect(db.saveUserPresence).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', is_camping: false }),
    );
  });
});

describe('presenceService.autoClearCampingOnCurrentBand', () => {
  it('clears camping when is_camping and user has a current band', async () => {
    vi.mocked(db.loadUserPresence).mockResolvedValue({
      user_id: 'user1',
      is_camping: true,
      is_at_metal_place: false,
      updated_at: '2026-07-29T10:00:00Z',
    });

    await presenceService.autoClearCampingOnCurrentBand('user1', true, 'current');

    expect(db.saveUserPresence).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user1', is_camping: false }),
    );
  });

  it('does nothing when not camping', async () => {
    await presenceService.autoClearCampingOnCurrentBand('user1', false, 'current');

    expect(db.saveUserPresence).not.toHaveBeenCalled();
  });

  it('does nothing when plan status is not current', async () => {
    await presenceService.autoClearCampingOnCurrentBand('user1', true, 'next');

    expect(db.saveUserPresence).not.toHaveBeenCalled();
  });
});

describe('presenceService.validateAndAutoCheckout', () => {
  it('sets is_at_metal_place to false and syncs when time is outside the metal-place window', async () => {
    const config: MetalPlaceConfig = {
      windows: [
        { id: 'window-1', festival_day: 1, start_time: '14:00', end_time: '18:00' },
      ],
    };
    const userId = 'user1';
    const existingPresence: UserPresence = {
      user_id: userId,
      is_camping: false,
      is_at_metal_place: true,
      updated_at: '2026-07-29T13:00:00Z',
    };

    // 12:00 CEST = 10:00 UTC — before 14:00, outside window
    vi.mocked(now).mockReturnValue(new Date('2026-07-29T10:00:00Z'));
    vi.mocked(db.loadUserPresence).mockResolvedValue(existingPresence);

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ upsert: mockUpsert } as any);

    await presenceService.validateAndAutoCheckout(config, userId);

    expect(db.saveUserPresence).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: userId, is_at_metal_place: false }),
    );
  });

  it('does nothing when time is within the metal-place window', async () => {
    const config: MetalPlaceConfig = {
      windows: [
        { id: 'window-1', festival_day: 1, start_time: '14:00', end_time: '18:00' },
      ],
    };

    // 15:00 CEST = 13:00 UTC — within window
    vi.mocked(now).mockReturnValue(new Date('2026-07-29T13:00:00Z'));

    await presenceService.validateAndAutoCheckout(config, 'user1');

    expect(db.saveUserPresence).not.toHaveBeenCalled();
    expect(db.loadUserPresence).not.toHaveBeenCalled();
  });

  it('does nothing when userId is null', async () => {
    const config: MetalPlaceConfig = {
      windows: [
        { id: 'window-1', festival_day: 1, start_time: '14:00', end_time: '18:00' },
      ],
    };

    await presenceService.validateAndAutoCheckout(config, null);

    expect(db.saveUserPresence).not.toHaveBeenCalled();
  });

  it('does nothing when user is not at metal place', async () => {
    const config: MetalPlaceConfig = {
      windows: [
        { id: 'window-1', festival_day: 1, start_time: '14:00', end_time: '18:00' },
      ],
    };
    const notAtMetalPlace: UserPresence = {
      user_id: 'user1',
      is_camping: true,
      is_at_metal_place: false,
      updated_at: '2026-07-29T13:00:00Z',
    };

    // Outside window
    vi.mocked(now).mockReturnValue(new Date('2026-07-29T10:00:00Z'));
    vi.mocked(db.loadUserPresence).mockResolvedValue(notAtMetalPlace);

    await presenceService.validateAndAutoCheckout(config, 'user1');

    expect(db.saveUserPresence).not.toHaveBeenCalled();
  });
});

// ─── presenceService location-visit tracking ────────────────────────────────

describe('presenceService.setCampingStatus — location visit tracking', () => {
  const mockUser = { user_metadata: { location_visits: {} } };

  it('calls incrementLocationVisit(camping) on first entry', async () => {
    vi.mocked(supabase.from).mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) } as any);
    vi.mocked(db.loadUserPresence).mockResolvedValue(undefined); // was not camping
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser } } as any);

    await presenceService.setCampingStatus('user1', true);

    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.auth.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ data: { location_visits: { camping: 1 } } }),
    );
  });

  it('does NOT call incrementLocationVisit when already camping', async () => {
    vi.mocked(supabase.from).mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) } as any);
    vi.mocked(db.loadUserPresence).mockResolvedValue({
      user_id: 'user1', is_camping: true, is_at_metal_place: false, updated_at: '2026-07-29T10:00:00Z',
    });

    await presenceService.setCampingStatus('user1', true);

    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('does NOT call incrementLocationVisit when setting camping to false', async () => {
    vi.mocked(supabase.from).mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) } as any);
    vi.mocked(db.loadUserPresence).mockResolvedValue(undefined);

    await presenceService.setCampingStatus('user1', false);

    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });
});

describe('presenceService.setMetalPlaceStatus — location visit tracking', () => {
  const mockUser = { user_metadata: { location_visits: {} } };

  it('calls incrementLocationVisit(metal_place) on first entry', async () => {
    vi.mocked(supabase.from).mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) } as any);
    vi.mocked(db.loadUserPresence).mockResolvedValue(undefined); // was not at metal place
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser } } as any);

    await presenceService.setMetalPlaceStatus('user1', true);

    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.auth.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ data: { location_visits: { metal_place: 1 } } }),
    );
  });

  it('does NOT call incrementLocationVisit when already at metal place', async () => {
    vi.mocked(supabase.from).mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) } as any);
    vi.mocked(db.loadUserPresence).mockResolvedValue({
      user_id: 'user1', is_camping: false, is_at_metal_place: true, updated_at: '2026-07-29T10:00:00Z',
    });

    await presenceService.setMetalPlaceStatus('user1', true);

    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('does NOT call incrementLocationVisit when setting metal place to false (checkout)', async () => {
    vi.mocked(supabase.from).mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) } as any);
    vi.mocked(db.loadUserPresence).mockResolvedValue(undefined);

    await presenceService.setMetalPlaceStatus('user1', false);

    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });
});
