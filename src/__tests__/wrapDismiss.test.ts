import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  clearWrapDismissForTests,
  dismissWrapTeaser,
  isWrapDismissed,
  WRAP_DISMISS_KEY,
} from '../lib/wrapDismiss';

const localStorageStore = vi.hoisted(() => new Map<string, string>());

describe('wrapDismiss', () => {
  beforeEach(() => {
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
      },
    });
    localStorageStore.clear();
    clearWrapDismissForTests();
  });

  it('uses viralatas:wrap-dismissed-2026 key', () => {
    expect(WRAP_DISMISS_KEY).toBe('viralatas:wrap-dismissed-2026');
  });

  it('isWrapDismissed returns false initially', () => {
    expect(isWrapDismissed()).toBe(false);
  });

  it('dismissWrapTeaser persists dismiss state', () => {
    dismissWrapTeaser();
    expect(isWrapDismissed()).toBe(true);
    expect(localStorage.getItem(WRAP_DISMISS_KEY)).toBe('1');
  });
});
