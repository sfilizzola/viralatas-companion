import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import {
  TIME_OVERRIDE_CHANGED_EVENT,
  TIME_OVERRIDE_STORAGE_KEY,
  clearTimeOverride,
  getTimeOverride,
  isTimeOverrideActive,
  now,
  setTimeOverride,
} from '../lib/time';

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
