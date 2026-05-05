import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Get build version: timestamp in hex for compact, monotonically increasing identifier.
// Hex format is smaller than decimal and can be converted back:
//   1746993000 (decimal) = 6797c5a8 (hex)
// To decode: parseInt('6797c5a8', 16) = 1746993000 (seconds since unix epoch)
const getPatch = (): string => {
  // Use current timestamp in seconds, convert to hex for compact representation
  const timestampSeconds = Math.floor(Date.now() / 1000);
  const hexPatch = timestampSeconds.toString(16);
  console.log(`[vite-config] Build timestamp: ${timestampSeconds} (hex: ${hexPatch})`);
  return hexPatch;
};

const commitCount = getPatch();
console.log(`[vite-config] Final PATCH version: ${commitCount}`);

export default defineConfig({
  define: {
    'import.meta.env.VITE_COMMIT_COUNT': JSON.stringify(commitCount),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Viralatas Metaleiros',
        short_name: 'Viralatas',
        description: 'Festival companion for Viralatas Metaleiros at Wacken',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
            },
          },
          {
            // Wacken band thumbnails — cross-origin, allow opaque (status 0) responses
            urlPattern: /^https:\/\/www\.wacken\.com\/fileadmin\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'band-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
