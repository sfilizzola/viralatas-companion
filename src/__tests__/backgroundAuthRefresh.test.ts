import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
  },
}));

import {
  BACKGROUND_AUTH_REFRESH_MS,
  refreshAuthSessionInBackground,
  watchOnlineAuthRefresh,
} from '../lib/backgroundAuthRefresh';

describe('refreshAuthSessionInBackground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await refreshAuthSessionInBackground();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it('times out hung getSession without throwing', async () => {
    mocks.getSession.mockReturnValue(new Promise(() => {}));
    const pending = refreshAuthSessionInBackground();
    await vi.advanceTimersByTimeAsync(BACKGROUND_AUTH_REFRESH_MS + 50);
    await expect(pending).resolves.toBeUndefined();
  });
});

describe('watchOnlineAuthRefresh', () => {
  it('calls handler on online event', () => {
    const handler = vi.fn();
    const unwatch = watchOnlineAuthRefresh(handler);
    window.dispatchEvent(new Event('online'));
    expect(handler).toHaveBeenCalledOnce();
    unwatch();
    window.dispatchEvent(new Event('online'));
    expect(handler).toHaveBeenCalledOnce();
  });
});
