import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';

// Get commit count for version patch number. On Vercel/Netlify with shallow clones,
// we need to unshallow first. If that fails, fall back to timestamp-based monotonic patch.
// Note: VERCEL_GIT_COMMIT_COUNT is not a standard env var; unshallowing is more reliable.
const getPatch = (): string => {
  // For Vercel and Netlify: try to unshallow then count
  if (process.env.VERCEL || process.env.NETLIFY) {
    try {
      execSync('git fetch --unshallow', { stdio: 'ignore' });
    } catch {
      /* already full clone or fetch failed */
    }
  }
  // Try git count (works locally and on full clones)
  try {
    return execSync('git rev-list --count HEAD').toString().trim();
  } catch {
    // Last resort: days since project epoch (monotonically increasing)
    const epoch = new Date('2025-01-01').getTime();
    return String(Math.floor((Date.now() - epoch) / 86_400_000));
  }
};

const commitCount = getPatch();

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
