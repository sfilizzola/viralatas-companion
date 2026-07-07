import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  clearPwaInstallHintDismissForTests,
  dismissPwaInstallHint,
  isPwaInstallHintDismissed,
  PWA_INSTALL_HINT_DISMISS_KEY,
} from '../lib/pwaInstallDismiss';

const localStorageStore = vi.hoisted(() => new Map<string, string>());

describe('pwaInstallDismiss', () => {
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
    clearPwaInstallHintDismissForTests();
  });

  it('uses viralatas:pwa-install-hint-dismissed key', () => {
    expect(PWA_INSTALL_HINT_DISMISS_KEY).toBe('viralatas:pwa-install-hint-dismissed');
  });

  it('isPwaInstallHintDismissed returns false initially', () => {
    expect(isPwaInstallHintDismissed()).toBe(false);
  });

  it('dismissPwaInstallHint persists dismiss state', () => {
    dismissPwaInstallHint();
    expect(isPwaInstallHintDismissed()).toBe(true);
    expect(localStorage.getItem(PWA_INSTALL_HINT_DISMISS_KEY)).toBe('1');
  });
});
