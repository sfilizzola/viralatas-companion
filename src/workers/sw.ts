/// <reference lib="webworker" />

import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// vite-plugin-pwa injects the precache manifest here at build time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
precacheAndRoute((self as any).__WB_MANIFEST ?? []);

// Explicit SPA navigation fallback — serve precached index.html for all routes
const navigationHandler = createHandlerBoundToURL('/index.html');
registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [/^\/api\//],
  }),
);

// Activate new SW immediately; take control of open clients on cold start
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// NetworkFirst for all Supabase API calls
registerRoute(
  ({ url }) => /\.supabase\.co/.test(url.hostname),
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

// CacheFirst for Wacken band thumbnails — allow opaque responses (status 0)
registerRoute(
  ({ url }) =>
    url.hostname === 'www.wacken.com' && url.pathname.startsWith('/fileadmin/'),
  new CacheFirst({
    cacheName: 'band-images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Push event: show a system notification with the rubber-duck icon
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let title = '🦆 Viralatas';
  let body = '🦆';

  try {
    const data = event.data.json() as { title?: string; body?: string };
    title = data.title ?? title;
    body = data.body ?? body;
  } catch {
    body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/rubber-duck.png',
      badge: '/rubber-duck.png',
      tag: 'duck-quack',
    }),
  );
});

// Notification click: focus existing window or open /now
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow('/now');
      }),
  );
});
