import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';

const commitCount = (() => {
  try {
    return execSync('git rev-list --count HEAD').toString().trim();
  } catch {
    // Fallback for environments with no git (e.g., shallow clone on some CI systems)
    // If deploy shows 0.9.0, enable "Full git history" in Vercel/Netlify platform settings
    return '0';
  }
})();

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
