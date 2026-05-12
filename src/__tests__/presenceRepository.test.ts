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

vi.mock('../services/time', () => ({
  now: vi.fn(),
}));

import { supabase } from '../lib/supabase';
import * as db from '../lib/db';
import { now } from '../services/time';
import { presenceRepository } from '../repositories/presence';
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
});

describe('presenceRepository.isTimeWithinMetalPlaceWindow', () => {
  it('returns true when current Berlin wall-clock time is within the configured window', () => {
    // test_override_day skips festival-day matching so only time range is checked
    const config: MetalPlaceConfig = {
      festival_day: 1,
      test_override_day: 1,
      start_time: '14:00',
      end_time: '18:00',
    };
    // 15:00 CEST (Berlin summer) = 13:00 UTC — inside [14:00, 18:00)
    const withinWindow = new Date('2026-07-29T13:00:00Z');
    expect(presenceRepository.isTimeWithinMetalPlaceWindow(config, withinWindow)).toBe(true);
  });

  it('returns false when current Berlin wall-clock time is outside the configured window', () => {
    const config: MetalPlaceConfig = {
      festival_day: 1,
      test_override_day: 1,
      start_time: '14:00',
      end_time: '18:00',
    };
    // 12:00 CEST = 10:00 UTC — before 14:00
    const outsideWindow = new Date('2026-07-29T10:00:00Z');
    expect(presenceRepository.isTimeWithinMetalPlaceWindow(config, outsideWindow)).toBe(false);
  });

  it('returns false when config is null', () => {
    expect(presenceRepository.isTimeWithinMetalPlaceWindow(null, new Date())).toBe(false);
  });

  it('returns false when start_time or end_time is missing', () => {
    const config: MetalPlaceConfig = {
      festival_day: 1,
      test_override_day: 1,
      start_time: undefined,
      end_time: '18:00',
    };
    expect(presenceRepository.isTimeWithinMetalPlaceWindow(config, new Date())).toBe(false);
  });

  it('returns false when current festival day does not match configured day (no test_override)', () => {
    const config: MetalPlaceConfig = {
      festival_day: 1,
      test_override_day: null,
      start_time: '14:00',
      end_time: '18:00',
    };
    // Current time is well after Day 1 (2026-07-29), so day won't match
    const futureDay = new Date('2026-07-30T13:00:00Z'); // Day 2, 15:00 CEST
    expect(presenceRepository.isTimeWithinMetalPlaceWindow(config, futureDay)).toBe(false);
  });
});

describe('presenceRepository.validateAndAutoCheckout', () => {
  it('sets is_at_metal_place to false and syncs when time is outside the metal-place window', async () => {
    const config: MetalPlaceConfig = {
      festival_day: 1,
      test_override_day: 1,
      start_time: '14:00',
      end_time: '18:00',
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

    await presenceRepository.validateAndAutoCheckout(config, userId);

    expect(db.saveUserPresence).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: userId, is_at_metal_place: false }),
    );
  });

  it('does nothing when time is within the metal-place window', async () => {
    const config: MetalPlaceConfig = {
      festival_day: 1,
      test_override_day: 1,
      start_time: '14:00',
      end_time: '18:00',
    };

    // 15:00 CEST = 13:00 UTC — within window
    vi.mocked(now).mockReturnValue(new Date('2026-07-29T13:00:00Z'));

    await presenceRepository.validateAndAutoCheckout(config, 'user1');

    expect(db.saveUserPresence).not.toHaveBeenCalled();
    expect(db.loadUserPresence).not.toHaveBeenCalled();
  });

  it('does nothing when userId is null', async () => {
    const config: MetalPlaceConfig = {
      festival_day: 1,
      test_override_day: 1,
      start_time: '14:00',
      end_time: '18:00',
    };

    await presenceRepository.validateAndAutoCheckout(config, null);

    expect(db.saveUserPresence).not.toHaveBeenCalled();
  });

  it('does nothing when user is not at metal place', async () => {
    const config: MetalPlaceConfig = {
      festival_day: 1,
      test_override_day: 1,
      start_time: '14:00',
      end_time: '18:00',
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

    await presenceRepository.validateAndAutoCheckout(config, 'user1');

    expect(db.saveUserPresence).not.toHaveBeenCalled();
  });
});
