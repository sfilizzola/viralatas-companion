import { describe, it, expect } from 'vitest';
import { bandDay, formatTime } from '../services/bandTime';
import type { Band } from '../types';

function makeBand(overrides: Partial<Band> = {}): Band {
  return {
    id: 'b1',
    name: 'Test Band',
    stage: 'Faster',
    start_time: '2026-07-29T12:00:00Z',
    end_time: '2026-07-29T13:00:00Z',
    image_url: null,
    genre: null,
    category: 'band',
    ...overrides,
  };
}

describe('bandDay', () => {
  it('returns the CEST calendar date for a midday band (14:00 CEST)', () => {
    // 12:00 UTC = 14:00 CEST on July 29 → hour 14, not < 4 → stays July 29
    expect(bandDay(makeBand({ start_time: '2026-07-29T12:00:00Z' }))).toBe('2026-07-29');
  });

  it('rolls back to previous day when CEST hour is 2 (00:00 UTC → 02:00 CEST)', () => {
    // 00:00 UTC on July 30 = 02:00 CEST → hour 2 < 4 → rolls back to July 29
    expect(bandDay(makeBand({ start_time: '2026-07-30T00:00:00Z' }))).toBe('2026-07-29');
  });

  it('rolls back at CEST midnight (22:00 UTC previous day = 00:00 CEST)', () => {
    // 22:00 UTC on July 29 = 00:00 CEST on July 30 → hour 0 < 4 → rolls back to July 29
    expect(bandDay(makeBand({ start_time: '2026-07-29T22:00:00Z' }))).toBe('2026-07-29');
  });

  it('rolls back at 03:59 CEST but not at 04:00 CEST (the boundary)', () => {
    // 01:59 UTC on July 30 = 03:59 CEST → hour 3 < 4 → rolls back to July 29
    expect(bandDay(makeBand({ start_time: '2026-07-30T01:59:00Z' }))).toBe('2026-07-29');

    // 02:00 UTC on July 30 = 04:00 CEST → hour 4, NOT < 4 → stays July 30
    expect(bandDay(makeBand({ start_time: '2026-07-30T02:00:00Z' }))).toBe('2026-07-30');
  });

  it('maps to Day 1 (2026-07-29) for bands at 14:00 CEST on July 29', () => {
    expect(bandDay(makeBand({ start_time: '2026-07-29T12:00:00Z' }))).toBe('2026-07-29');
  });

  it('maps to Day 2 (2026-07-30) for bands at 14:00 CEST on July 30', () => {
    expect(bandDay(makeBand({ start_time: '2026-07-30T12:00:00Z' }))).toBe('2026-07-30');
  });

  it('maps to Day 3 (2026-07-31) for bands at 14:00 CEST on July 31', () => {
    expect(bandDay(makeBand({ start_time: '2026-07-31T12:00:00Z' }))).toBe('2026-07-31');
  });

  it('maps to Day 4 (2026-08-01) for bands at 14:00 CEST on August 1', () => {
    expect(bandDay(makeBand({ start_time: '2026-08-01T12:00:00Z' }))).toBe('2026-08-01');
  });

  it('handles a time outside the festival range (still returns a valid CEST date)', () => {
    // bandDay does not validate the festival window; it always returns the adjusted CEST date
    expect(bandDay(makeBand({ start_time: '2026-06-01T10:00:00Z' }))).toBe('2026-06-01');
  });
});

describe('formatTime', () => {
  it('formats a normal afternoon time in CEST', () => {
    // 14:00 UTC = 16:00 CEST
    expect(formatTime('2026-07-29T14:00:00Z')).toBe('16:00');
  });

  it('pads single-digit CEST hours with a leading zero', () => {
    // 07:05 UTC = 09:05 CEST
    expect(formatTime('2026-07-29T07:05:00Z')).toBe('09:05');
  });

  it('pads single-digit minutes with a leading zero', () => {
    // 12:05 UTC = 14:05 CEST → minutes "05"
    expect(formatTime('2026-07-29T12:05:00Z')).toBe('14:05');
  });

  it('handles late-night times correctly (23:59 CEST)', () => {
    // 21:59 UTC = 23:59 CEST
    expect(formatTime('2026-07-29T21:59:00Z')).toBe('23:59');
  });

  it('handles midnight crossover (22:00 UTC = 00:00 CEST next day)', () => {
    // 22:00 UTC July 29 = 00:00 CEST July 30 → "00:00"
    expect(formatTime('2026-07-29T22:00:00Z')).toBe('00:00');
  });
});
