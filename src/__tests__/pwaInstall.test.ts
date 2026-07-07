import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  isAndroidDevice,
  isIosDevice,
  isMobileDevice,
  isStandalonePwa,
} from '../lib/pwaInstall';

describe('pwaInstall detection', () => {
  const originalUserAgent = navigator.userAgent;
  const originalPlatform = navigator.platform;
  const originalMaxTouchPoints = navigator.maxTouchPoints;

  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: originalPlatform,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: originalMaxTouchPoints,
    });
    vi.unstubAllGlobals();
  });

  function setUserAgent(ua: string) {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: ua,
    });
  }

  it('detects iPhone user agent', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    expect(isIosDevice()).toBe(true);
    expect(isAndroidDevice()).toBe(false);
    expect(isMobileDevice()).toBe(true);
  });

  it('detects Android user agent', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8)');
    expect(isAndroidDevice()).toBe(true);
    expect(isIosDevice()).toBe(false);
    expect(isMobileDevice()).toBe(true);
  });

  it('detects standalone display mode', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(isStandalonePwa()).toBe(true);
  });

  it('detects iOS standalone navigator flag', () => {
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: true,
    });
    expect(isStandalonePwa()).toBe(true);
    delete (navigator as Navigator & { standalone?: boolean }).standalone;
  });
});
