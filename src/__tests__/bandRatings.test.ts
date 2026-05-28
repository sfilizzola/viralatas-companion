import { describe, it, expect } from 'vitest';
import {
  canRateBand,
  computeRatingAggregates,
  formatRatingAvg,
  sortBandsByRating,
} from '../services/bandRatings';
import type { Band, UserBandRating } from '../types';

const band: Band = {
  id: 'b1',
  slot_id: 'slot-b1',
  name: 'Test',
  stage: 'Faster',
  start_time: '2026-07-29T18:00:00+02:00',
  end_time: '2026-07-29T19:00:00+02:00',
  image_url: null,
  genre: 'Metal',
  category: 'band',
};

describe('canRateBand', () => {
  it('allows when picked, ended, not missed', () => {
    expect(
      canRateBand({
        band,
        now: new Date('2026-07-29T20:00:00+02:00'),
        isPicked: true,
        isMissed: false,
      }),
    ).toBe(true);
  });

  it('denies when not ended', () => {
    expect(
      canRateBand({
        band,
        now: new Date('2026-07-29T18:30:00+02:00'),
        isPicked: true,
        isMissed: false,
      }),
    ).toBe(false);
  });

  it('denies when missed or not picked', () => {
    expect(
      canRateBand({
        band,
        now: new Date('2026-07-29T20:00:00+02:00'),
        isPicked: true,
        isMissed: true,
      }),
    ).toBe(false);
    expect(
      canRateBand({
        band,
        now: new Date('2026-07-29T20:00:00+02:00'),
        isPicked: false,
        isMissed: false,
      }),
    ).toBe(false);
  });

  it('denies ceremony bands', () => {
    expect(
      canRateBand({
        band: { ...band, category: 'ceremony' },
        now: new Date('2026-07-29T20:00:00+02:00'),
        isPicked: true,
        isMissed: false,
      }),
    ).toBe(false);
  });
});

describe('computeRatingAggregates', () => {
  it('averages all raters including multiple users', () => {
    const ratings: UserBandRating[] = [
      { user_id: 'u1', band_id: 'b1', score: 5, rated_at: 't' },
      { user_id: 'u2', band_id: 'b1', score: 3, rated_at: 't' },
    ];
    expect(computeRatingAggregates(ratings).b1).toEqual({ avg: 4, count: 2 });
  });

  it('solo rating avg equals score', () => {
    const ratings: UserBandRating[] = [
      { user_id: 'u1', band_id: 'b1', score: 3, rated_at: 't' },
    ];
    expect(computeRatingAggregates(ratings).b1).toEqual({ avg: 3, count: 1 });
  });
});

describe('formatRatingAvg', () => {
  it('shows one decimal and trims trailing zero', () => {
    expect(formatRatingAvg(4.2)).toBe('4.2');
    expect(formatRatingAvg(3)).toBe('3');
    expect(formatRatingAvg(5)).toBe('5');
  });
});

describe('sortBandsByRating', () => {
  it('sorts by avg desc, count desc, start_time asc', () => {
    const bands = [
      { ...band, id: 'b1', start_time: '2026-07-29T20:00:00+02:00' },
      { ...band, id: 'b2', start_time: '2026-07-29T18:00:00+02:00' },
      { ...band, id: 'b3', start_time: '2026-07-29T19:00:00+02:00' },
    ];
    const aggregates = {
      b1: { avg: 4.5, count: 2 },
      b2: { avg: 4.5, count: 3 },
      b3: { avg: 3, count: 10 },
    };
    const sorted = sortBandsByRating(bands, aggregates);
    expect(sorted.map((b) => b.id)).toEqual(['b2', 'b1', 'b3']);
  });
});
