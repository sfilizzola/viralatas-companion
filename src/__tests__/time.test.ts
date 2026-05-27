import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import {
  TIME_OVERRIDE_CHANGED_EVENT,
  TIME_OVERRIDE_STORAGE_KEY,
  FESTIVAL_DAY_1_START,
  FESTIVAL_DAY_1_START_ISO,
  clearTimeOverride,
  getFestivalDay,
  getTimeOverride,
  isFestivalActive,
  isFestivalEnded,
  isTimeOverrideActive,
  now,
  setTimeOverride,
  wackenLocalMidnight,
} from '../services/time';

beforeAll(() => {
  // The shared test setup stubs window.indexedDB but leaves localStorage as the
  // real jsdom Storage. In this project's jsdom build it lacks `.removeItem`,
  // so install a minimal in-memory shim for the duration of these tests.
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    },
  });
});

describe('time override', () => {
  beforeEach(() => {
    localStorage.removeItem(TIME_OVERRIDE_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(TIME_OVERRIDE_STORAGE_KEY);
  });

  it('now() returns real time when no override is set', () => {
    const before = Date.now();
    const result = now().getTime();
    const after = Date.now();

    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });

  it('now() returns the override when set', () => {
    setTimeOverride('2026-07-29T22:00:00Z');

    expect(now().toISOString()).toBe('2026-07-29T22:00:00.000Z');
  });

  it('now() falls back to real time when the stored value is unparseable', () => {
    localStorage.setItem(TIME_OVERRIDE_STORAGE_KEY, 'not-a-date');

    const before = Date.now();
    const result = now().getTime();
    const after = Date.now();

    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });

  it('setTimeOverride persists an ISO string to localStorage', () => {
    setTimeOverride('2026-07-29T22:00:00Z');

    expect(getTimeOverride()).toBe('2026-07-29T22:00:00.000Z');
    expect(isTimeOverrideActive()).toBe(true);
  });

  it('setTimeOverride throws on an invalid date', () => {
    expect(() => setTimeOverride('not-a-date')).toThrow(/Invalid time override/);
    expect(getTimeOverride()).toBeNull();
  });

  it('clearTimeOverride removes the stored override', () => {
    setTimeOverride('2026-07-29T22:00:00Z');
    clearTimeOverride();

    expect(getTimeOverride()).toBeNull();
    expect(isTimeOverrideActive()).toBe(false);
  });

  it('setTimeOverride dispatches the change event', () => {
    const listener = vi.fn();
    window.addEventListener(TIME_OVERRIDE_CHANGED_EVENT, listener);

    setTimeOverride('2026-07-29T22:00:00Z');

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(TIME_OVERRIDE_CHANGED_EVENT, listener);
  });

  it('clearTimeOverride dispatches the change event', () => {
    setTimeOverride('2026-07-29T22:00:00Z');
    const listener = vi.fn();
    window.addEventListener(TIME_OVERRIDE_CHANGED_EVENT, listener);

    clearTimeOverride();

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(TIME_OVERRIDE_CHANGED_EVENT, listener);
  });
});

describe('festival constants', () => {
  it('FESTIVAL_DAY_1_START is midnight CEST on 2026-07-29', () => {
    expect(FESTIVAL_DAY_1_START_ISO).toBe('2026-07-29T00:00:00+02:00');
    expect(FESTIVAL_DAY_1_START.toISOString()).toBe('2026-07-28T22:00:00.000Z');
  });

  it('wackenLocalMidnight returns midnight CEST for a calendar date', () => {
    expect(wackenLocalMidnight('2026-07-30').toISOString()).toBe('2026-07-29T22:00:00.000Z');
  });

  it('isFestivalActive is false before Day 1 midnight CEST and true at/after', () => {
    expect(isFestivalActive(new Date('2026-07-28T21:59:59.999Z'))).toBe(false);
    expect(isFestivalActive(new Date('2026-07-28T22:00:00.000Z'))).toBe(true);
  });

  it('getFestivalDay returns 1-based day from CEST midnight boundaries', () => {
    expect(getFestivalDay(new Date('2026-07-28T22:00:00.000Z'))).toBe(1);
    expect(getFestivalDay(new Date('2026-07-29T21:59:59.999Z'))).toBe(1);
    expect(getFestivalDay(new Date('2026-07-29T22:00:00.000Z'))).toBe(2);
    expect(getFestivalDay(new Date('2026-07-30T13:00:00.000Z'))).toBe(2);
  });
});

describe('isFestivalEnded', () => {
  const bands = [
    { end_time: '2026-08-01T20:00:00+02:00', category: 'band' as const },
    { end_time: '2026-08-01T23:00:00+02:00', category: 'ceremony' as const },
    { end_time: '2026-08-01T22:00:00+02:00', category: 'band' as const },
  ];

  it('is false before the latest non-ceremony band ends', () => {
    expect(isFestivalEnded(new Date('2026-08-01T21:59:59+02:00'), bands)).toBe(false);
  });

  it('is true after the latest non-ceremony band ends (ignores ceremony end)', () => {
    expect(isFestivalEnded(new Date('2026-08-01T22:00:01+02:00'), bands)).toBe(true);
    expect(isFestivalEnded(new Date('2026-08-01T23:30:00+02:00'), bands)).toBe(true);
  });

  it('returns false when bands list is empty or missing', () => {
    expect(isFestivalEnded(new Date(), [])).toBe(false);
    expect(isFestivalEnded(new Date(), undefined)).toBe(false);
  });

  it('returns false when only ceremony bands exist', () => {
    expect(
      isFestivalEnded(new Date('2026-08-02T00:00:00+02:00'), [
        { end_time: '2026-08-01T23:00:00+02:00', category: 'ceremony' },
      ]),
    ).toBe(false);
  });
});
