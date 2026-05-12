import { EMPTY_FILTERS, type BandFilterValue } from '../components/bandFilterValue';

const FILTERS_STORAGE_KEY = 'vlt:filters:schedule';

export function loadStoredFilters(): BandFilterValue {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return EMPTY_FILTERS;
    const parsed = JSON.parse(raw) as Partial<BandFilterValue>;
    return {
      query: '',
      day: typeof parsed.day === 'string' ? parsed.day : null,
      stage: Array.isArray(parsed.stage) ? parsed.stage.filter((s) => typeof s === 'string') : [],
      genre: typeof parsed.genre === 'string' ? parsed.genre : null,
      upcoming: typeof parsed.upcoming === 'boolean' ? parsed.upcoming : false,
    };
  } catch {
    return EMPTY_FILTERS;
  }
}

export function saveStoredFilters(filters: BandFilterValue) {
  try {
    const { query: _q, ...persisted } = filters;
    void _q;
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    /* localStorage unavailable; silently skip */
  }
}
