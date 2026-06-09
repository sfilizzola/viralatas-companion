import { describe, it, expect } from 'vitest';
import {
  isMetalPlaceWindowActive,
  resolvePresenceToggle,
  shouldAutoClearCamping,
  shouldAutoCheckout,
} from '../services/presencePolicy';
import type { MetalPlaceConfig, UserPresence } from '../types';

// All tests use plain Date objects — no IDB, no Supabase mocks needed.

const BASE_CONFIG: MetalPlaceConfig = {
  festival_day: 1,
  test_override_day: 1, // skip festival-day check so only time range matters
  start_time: '14:00',
  end_time: '18:00',
};

// 15:00 CEST (Berlin summer) = 13:00 UTC — inside [14:00, 18:00)
const INSIDE_WINDOW = new Date('2026-07-29T13:00:00Z');
// 12:00 CEST = 10:00 UTC — before 14:00
const BEFORE_WINDOW = new Date('2026-07-29T10:00:00Z');
// 19:00 CEST = 17:00 UTC — after 18:00
const AFTER_WINDOW = new Date('2026-07-29T17:00:00Z');

// ─── isMetalPlaceWindowActive ────────────────────────────────────────────────

describe('isMetalPlaceWindowActive', () => {
  it('returns true when wall-clock time is inside the configured window', () => {
    expect(isMetalPlaceWindowActive(BASE_CONFIG, INSIDE_WINDOW)).toBe(true);
  });

  it('returns false when wall-clock time is before the window starts', () => {
    expect(isMetalPlaceWindowActive(BASE_CONFIG, BEFORE_WINDOW)).toBe(false);
  });

  it('returns false when wall-clock time is after the window ends', () => {
    expect(isMetalPlaceWindowActive(BASE_CONFIG, AFTER_WINDOW)).toBe(false);
  });

  it('returns false when config is null', () => {
    expect(isMetalPlaceWindowActive(null, INSIDE_WINDOW)).toBe(false);
  });

  it('returns false when start_time is missing', () => {
    const config: MetalPlaceConfig = { ...BASE_CONFIG, start_time: undefined };
    expect(isMetalPlaceWindowActive(config, INSIDE_WINDOW)).toBe(false);
  });

  it('returns false when end_time is missing', () => {
    const config: MetalPlaceConfig = { ...BASE_CONFIG, end_time: undefined };
    expect(isMetalPlaceWindowActive(config, INSIDE_WINDOW)).toBe(false);
  });

  it('returns false when festival_day is null and no test_override_day', () => {
    const config: MetalPlaceConfig = {
      festival_day: null,
      test_override_day: null,
      start_time: '14:00',
      end_time: '18:00',
    };
    expect(isMetalPlaceWindowActive(config, INSIDE_WINDOW)).toBe(false);
  });

  it('returns false when current festival day does not match (no test_override)', () => {
    const config: MetalPlaceConfig = {
      festival_day: 1,        // Day 1 = 2026-07-29
      test_override_day: null,
      start_time: '14:00',
      end_time: '18:00',
    };
    // 15:00 CEST on Day 2 (2026-07-30) — day mismatch
    const day2 = new Date('2026-07-30T13:00:00Z');
    expect(isMetalPlaceWindowActive(config, day2)).toBe(false);
  });

  it('returns true on the correct festival day without test_override', () => {
    const config: MetalPlaceConfig = {
      festival_day: 1,
      test_override_day: null,
      start_time: '14:00',
      end_time: '18:00',
    };
    // Day 1 = 2026-07-29, 15:00 CEST = 13:00 UTC
    expect(isMetalPlaceWindowActive(config, INSIDE_WINDOW)).toBe(true);
  });

  it('test_override_day bypasses festival-day matching', () => {
    const config: MetalPlaceConfig = {
      festival_day: 99, // unreachable day
      test_override_day: 1,
      start_time: '14:00',
      end_time: '18:00',
    };
    expect(isMetalPlaceWindowActive(config, INSIDE_WINDOW)).toBe(true);
  });

  it('returns false exactly at window end time (exclusive upper bound)', () => {
    // 18:00 CEST = 16:00 UTC — exactly at end, should be false
    const atEnd = new Date('2026-07-29T16:00:00Z');
    expect(isMetalPlaceWindowActive(BASE_CONFIG, atEnd)).toBe(false);
  });

  it('returns true exactly at window start time (inclusive lower bound)', () => {
    // 14:00 CEST = 12:00 UTC — exactly at start, should be true
    const atStart = new Date('2026-07-29T12:00:00Z');
    expect(isMetalPlaceWindowActive(BASE_CONFIG, atStart)).toBe(true);
  });
});

// ─── resolvePresenceToggle ───────────────────────────────────────────────────

describe('resolvePresenceToggle', () => {
  const emptyCtx = { myRawPlanStatus: 'empty' as const, isAtMetalPlace: false, isCamping: false };

  it('camping → sets camping true when no current band', () => {
    const d = resolvePresenceToggle('camping', emptyCtx);
    expect(d.setCamping).toBe(true);
    expect(d.setMetalPlace).toBeNull();
  });

  it('camping → sets camping false (blocks) when plan is current', () => {
    const d = resolvePresenceToggle('camping', { ...emptyCtx, myRawPlanStatus: 'current' });
    expect(d.setCamping).toBe(false);
    expect(d.setMetalPlace).toBeNull();
  });

  it('camping → sets camping true when plan is next', () => {
    const d = resolvePresenceToggle('camping', { ...emptyCtx, myRawPlanStatus: 'next' });
    expect(d.setCamping).toBe(true);
    expect(d.setMetalPlace).toBeNull();
  });

  it('camping → sets camping true when plan is lost', () => {
    const d = resolvePresenceToggle('camping', { ...emptyCtx, myRawPlanStatus: 'lost' });
    expect(d.setCamping).toBe(true);
    expect(d.setMetalPlace).toBeNull();
  });

  it('metal_place → sets metal place true, no camping change', () => {
    const d = resolvePresenceToggle('metal_place', emptyCtx);
    expect(d.setMetalPlace).toBe(true);
    expect(d.setCamping).toBeNull();
  });

  it('auto → no changes when neither camping nor at metal place', () => {
    const d = resolvePresenceToggle('auto', emptyCtx);
    expect(d.setCamping).toBeNull();
    expect(d.setMetalPlace).toBeNull();
  });

  it('auto → clears camping when currently camping', () => {
    const d = resolvePresenceToggle('auto', { ...emptyCtx, isCamping: true });
    expect(d.setCamping).toBe(false);
    expect(d.setMetalPlace).toBeNull();
  });

  it('auto → clears metal place when currently at metal place', () => {
    const d = resolvePresenceToggle('auto', { ...emptyCtx, isAtMetalPlace: true });
    expect(d.setMetalPlace).toBe(false);
    expect(d.setCamping).toBeNull();
  });

  it('auto → clears both when both are active', () => {
    const d = resolvePresenceToggle('auto', { ...emptyCtx, isCamping: true, isAtMetalPlace: true });
    expect(d.setCamping).toBe(false);
    expect(d.setMetalPlace).toBe(false);
  });
});

// ─── shouldAutoClearCamping ──────────────────────────────────────────────────

describe('shouldAutoClearCamping', () => {
  it('returns true when camping and plan is current', () => {
    expect(shouldAutoClearCamping(true, 'current')).toBe(true);
  });

  it('returns false when not camping', () => {
    expect(shouldAutoClearCamping(false, 'current')).toBe(false);
  });

  it('returns false when camping but plan is next', () => {
    expect(shouldAutoClearCamping(true, 'next')).toBe(false);
  });

  it('returns false when camping but plan is empty', () => {
    expect(shouldAutoClearCamping(true, 'empty')).toBe(false);
  });

  it('returns false when camping but plan is lost', () => {
    expect(shouldAutoClearCamping(true, 'lost')).toBe(false);
  });
});

// ─── shouldAutoCheckout ──────────────────────────────────────────────────────

describe('shouldAutoCheckout', () => {
  const checkedIn: UserPresence = {
    user_id: 'u1',
    is_camping: false,
    is_at_metal_place: true,
    updated_at: '2026-07-29T13:00:00Z',
  };
  const notCheckedIn: UserPresence = { ...checkedIn, is_at_metal_place: false };

  it('returns true when outside window and user is checked in', () => {
    expect(shouldAutoCheckout(BASE_CONFIG, BEFORE_WINDOW, checkedIn)).toBe(true);
  });

  it('returns false when inside window (do not checkout)', () => {
    expect(shouldAutoCheckout(BASE_CONFIG, INSIDE_WINDOW, checkedIn)).toBe(false);
  });

  it('returns false when outside window but user is not checked in', () => {
    expect(shouldAutoCheckout(BASE_CONFIG, BEFORE_WINDOW, notCheckedIn)).toBe(false);
  });

  it('returns false when config is null (cannot determine window)', () => {
    expect(shouldAutoCheckout(null, BEFORE_WINDOW, checkedIn)).toBe(false);
  });

  it('returns false when presence is null', () => {
    expect(shouldAutoCheckout(BASE_CONFIG, BEFORE_WINDOW, null)).toBe(false);
  });

  it('returns true when after window and user is checked in', () => {
    expect(shouldAutoCheckout(BASE_CONFIG, AFTER_WINDOW, checkedIn)).toBe(true);
  });
});
