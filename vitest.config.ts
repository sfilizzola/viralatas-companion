import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        'src/lib/db/**': {
          lines: 95,
          branches: 55,
          functions: 95,
          statements: 95,
        },
        'src/components/**': {
          lines: 80,
          branches: 75,
          functions: 80,
          statements: 80,
        },
        'src/ui/**': {
          lines: 80,
          branches: 75,
          functions: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
