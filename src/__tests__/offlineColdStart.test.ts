import swSrc from '../workers/sw.ts?raw';
import viteConfigSrc from '../../vite.config.ts?raw';
import { describe, it, expect } from 'vitest';

describe('offline cold start — SW shell contract', () => {
  it('sw.ts skips waiting, claims clients, and adds SPA navigation fallback', () => {
    expect(swSrc).toContain('skipWaiting');
    expect(swSrc).toContain('clients.claim');
    expect(swSrc).toContain('NavigationRoute');
    expect(swSrc).toContain('createHandlerBoundToURL');
    expect(swSrc).toContain('/index.html');
    expect(swSrc).toMatch(/denylist:\s*\[/);
  });

  it('vite.config.ts registers the service worker inline (not on window.load)', () => {
    expect(viteConfigSrc).toContain("injectRegister: 'inline'");
  });
});
