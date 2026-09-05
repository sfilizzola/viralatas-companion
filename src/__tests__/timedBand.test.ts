import { describe, it, expect } from 'vitest';
import type { Band } from '../types';
import type { Festival } from '../types/festival';
import { hasRunningOrder } from '../lib/festivalFeatures';
import { isTimedBand, normalizeBandName, timedBands } from '../services/timedBand';

const festivalOn: Festival = {
  id: 'f1',
  slug: 'demo-fest-2027',
  name: 'Demo',
  timezone: 'Europe/Berlin',
  starts_at: '2026-01-01T00:00:00Z',
  ends_at: '2026-01-05T00:00:00Z',
  features: { running_order: true },
  cache_version: '1',
};

const festivalOff: Festival = { ...festivalOn, features: {} };

function band(overrides: Partial<Band> = {}): Band {
  return {
    id: 'b1',
    festival_id: 'f1',
    slot_id: 'MAI1',
    name: 'Gojira',
    stage: 'Main',
    start_time: '2026-07-29T18:00:00+02:00',
    end_time: '2026-07-29T19:00:00+02:00',
    image_url: null,
    genre: 'Death Metal',
    category: 'band',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('hasRunningOrder', () => {
  it('is true only when features.running_order === true', () => {
    expect(hasRunningOrder(festivalOn)).toBe(true);
    expect(hasRunningOrder(festivalOff)).toBe(false);
    expect(hasRunningOrder({ ...festivalOn, features: { running_order: false } })).toBe(false);
    expect(hasRunningOrder(null)).toBe(false);
    expect(hasRunningOrder(undefined)).toBe(false);
  });
});

describe('isTimedBand', () => {
  it('is false when the flag is off even if all four slot fields are filled', () => {
    expect(isTimedBand(band(), festivalOff)).toBe(false);
  });

  it('is false when the flag is on but any slot field is missing', () => {
    expect(isTimedBand(band({ slot_id: null }), festivalOn)).toBe(false);
    expect(isTimedBand(band({ stage: null }), festivalOn)).toBe(false);
    expect(isTimedBand(band({ start_time: null }), festivalOn)).toBe(false);
    expect(isTimedBand(band({ end_time: null }), festivalOn)).toBe(false);
  });

  it('is true when the flag is on and all four fields are set', () => {
    expect(isTimedBand(band(), festivalOn)).toBe(true);
  });
});

describe('normalizeBandName', () => {
  it('NFKC, trims, collapses internal space, lowercases', () => {
    expect(normalizeBandName('  Göjira\u00a0  ')).toBe(normalizeBandName('göjira'));
    expect(normalizeBandName('Blind   Guardian')).toBe('blind guardian');
  });
});

describe('timedBands', () => {
  it('filters with isTimedBand', () => {
    const rows = [band({ id: 't' }), band({ id: 'u', start_time: null })];
    expect(timedBands(rows, festivalOn).map((b) => b.id)).toEqual(['t']);
    expect(timedBands(rows, festivalOff)).toEqual([]);
  });
});
