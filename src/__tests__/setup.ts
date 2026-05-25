import { vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { resetIdbSubscriptionsForTests } from '../hooks/useIdbSubscription';

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
  configurable: true,
});

// Mock environment variables
Object.assign(import.meta.env, {
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
});

beforeEach(() => {
  resetIdbSubscriptionsForTests();
});
