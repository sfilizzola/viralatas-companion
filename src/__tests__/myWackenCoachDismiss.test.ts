import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  clearMyWackenCoachDismissForTests,
  dismissMyWackenCoach,
  isMyWackenCoachDismissed,
  MY_WACKEN_COACH_DISMISS_KEY,
} from '../lib/myWackenCoachDismiss';

const localStorageStore = vi.hoisted(() => new Map<string, string>());

describe('myWackenCoachDismiss', () => {
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
    clearMyWackenCoachDismissForTests();
  });

  it('uses viralatas:my-wacken-ended-coach-dismissed key', () => {
    expect(MY_WACKEN_COACH_DISMISS_KEY).toBe('viralatas:my-wacken-ended-coach-dismissed');
  });

  it('isMyWackenCoachDismissed returns false initially', () => {
    expect(isMyWackenCoachDismissed()).toBe(false);
  });

  it('dismissMyWackenCoach persists dismiss state', () => {
    dismissMyWackenCoach();
    expect(isMyWackenCoachDismissed()).toBe(true);
    expect(localStorage.getItem(MY_WACKEN_COACH_DISMISS_KEY)).toBe('1');
  });
});
