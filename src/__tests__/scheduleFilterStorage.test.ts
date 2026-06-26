import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadStoredFilters, saveStoredFilters } from '../services/scheduleFilterStorage';
import { EMPTY_FILTERS } from '../components/bandFilterValue';
import type { BandFilterValue } from '../components/bandFilterValue';

// jsdom's localStorage may lack removeItem in some builds; install a reliable in-memory shim
// (matches the pattern from time.test.ts)
beforeAll(() => {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => { store.set(key, String(value)); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; },
    },
  });
});

beforeEach(() => {
  localStorage.clear();
});

const STORAGE_KEY = 'vlt:filters:schedule';

describe('loadStoredFilters', () => {
  it('returns EMPTY_FILTERS when nothing is stored', () => {
    expect(loadStoredFilters()).toEqual(EMPTY_FILTERS);
  });

  it('returns EMPTY_FILTERS when stored JSON is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(loadStoredFilters()).toEqual(EMPTY_FILTERS);
  });

  it('always resets query to empty string on load', () => {
    // Even if query was somehow written to storage, it must come back as ''
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      query: 'iron',
      day: '2026-07-29',
      stage: [],
      genre: null,
      upcoming: false,
    }));
    expect(loadStoredFilters().query).toBe('');
  });

  it('falls back to null for day when stored value is not a string', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ day: 42 }));
    expect(loadStoredFilters().day).toBeNull();
  });

  it('falls back to empty array for stage when stored value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stage: 'Faster' }));
    expect(loadStoredFilters().stage).toEqual([]);
  });

  it('filters out non-string items from stored stage array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stage: ['Faster', 42, null, 'Louder'] }));
    expect(loadStoredFilters().stage).toEqual(['Faster', 'Louder']);
  });

  it('falls back to null for genre when stored value is not a string', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ genre: true }));
    expect(loadStoredFilters().genre).toBeNull();
  });

  it('falls back to false for upcoming when stored value is not a boolean', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ upcoming: 'yes' }));
    expect(loadStoredFilters().upcoming).toBe(false);
  });

  it('falls back to null for userId when stored value is not a string', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: 42 }));
    expect(loadStoredFilters().userId).toBeNull();
  });
});

describe('saveStoredFilters + loadStoredFilters round-trip', () => {
  it('persists and reloads all fields correctly (query is cleared)', () => {
    const filters: BandFilterValue = {
      query: 'iron',       // should NOT be persisted
      day: '2026-07-29',
      stage: ['Faster', 'Louder'],
      genre: 'Heavy Metal',
      upcoming: true,
      sortOrder: 'time-asc',
      userId: 'user-abc-123',
    };
    saveStoredFilters(filters);
    const loaded = loadStoredFilters();

    expect(loaded.query).toBe('');             // cleared on load
    expect(loaded.day).toBe('2026-07-29');
    expect(loaded.stage).toEqual(['Faster', 'Louder']);
    expect(loaded.genre).toBe('Heavy Metal');
    expect(loaded.upcoming).toBe(true);
    expect(loaded.userId).toBe('user-abc-123');
  });

  it('does not persist the query field to localStorage', () => {
    saveStoredFilters({ query: 'metallica', day: null, stage: [], genre: null, upcoming: false, sortOrder: 'time-asc', userId: null });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).not.toHaveProperty('query');
  });

  it('persists userId to localStorage', () => {
    saveStoredFilters({
      query: '',
      day: null,
      stage: [],
      genre: null,
      upcoming: false,
      sortOrder: 'time-asc',
      userId: 'user-xyz-789',
    });
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.userId).toBe('user-xyz-789');
  });

  it('overwrites previous saved filters when called again', () => {
    saveStoredFilters({ query: '', day: '2026-07-29', stage: ['Faster'], genre: null, upcoming: false, sortOrder: 'time-asc', userId: null });
    saveStoredFilters({ query: '', day: '2026-07-30', stage: ['Harder'], genre: 'Thrash Metal', upcoming: true, sortOrder: 'time-desc', userId: null });
    const loaded = loadStoredFilters();
    expect(loaded.day).toBe('2026-07-30');
    expect(loaded.stage).toEqual(['Harder']);
    expect(loaded.genre).toBe('Thrash Metal');
    expect(loaded.upcoming).toBe(true);
  });

  it('round-trips EMPTY_FILTERS correctly (all defaults)', () => {
    saveStoredFilters(EMPTY_FILTERS);
    const loaded = loadStoredFilters();
    expect(loaded).toEqual(EMPTY_FILTERS);
  });
});
