import { describe, expect, it } from 'vitest';
import type { Band, UserBandRating } from '../types';
import { buildRatingStatsSnapshot, type RatingStatsInput } from '../services/ratingStats';

const NOW = new Date('2026-08-10T00:00:00.000Z');

function band(partial: Partial<Band> & Pick<Band, 'id'>): Band {
  return {
    slot_id: 'FAS1',
    name: `Band ${partial.id}`,
    stage: 'Faster',
    start_time: '2026-07-28T10:00:00.000Z',
    end_time: '2026-07-28T11:00:00.000Z',
    image_url: null,
    genre: 'Heavy Metal',
    category: 'band',
    ...partial,
  };
}

function rating(
  userId: string,
  bandId: string,
  score: 1 | 2 | 3 | 4 | 5,
): UserBandRating {
  return { user_id: userId, band_id: bandId, score, rated_at: '2026-07-28T12:00:00.000Z' };
}

function input(overrides: Partial<RatingStatsInput> = {}): RatingStatsInput {
  return {
    ratings: [],
    bands: [],
    userId: 'u1',
    pickedBandIds: new Set(),
    seenBandIds: new Set(),
    missedBandIds: new Set(),
    allPickCounts: new Map(),
    now: NOW,
    ...overrides,
  };
}

describe('buildRatingStatsSnapshot', () => {
  it('hasCrewRatings false when no ratings exist', () => {
    const snap = buildRatingStatsSnapshot(input());
    expect(snap.hasCrewRatings).toBe(false);
    expect(snap.crewTopRated).toBeNull();
    expect(snap.crewLowestPick).toBeNull();
  });

  it('computes personal stats for eligible user ratings only', () => {
    const bands = [
      band({ id: 'b1', name: 'Alpha', end_time: '2026-07-28T11:00:00.000Z' }),
      band({ id: 'b2', name: 'Beta', end_time: '2026-07-29T11:00:00.000Z' }),
      band({ id: 'b3', name: 'Ceremony', category: 'ceremony' }),
    ];
    const snap = buildRatingStatsSnapshot(
      input({
        bands,
        ratings: [
          rating('u1', 'b1', 4),
          rating('u1', 'b2', 5),
          rating('u1', 'b3', 5),
          rating('u2', 'b1', 3),
        ],
        pickedBandIds: new Set(['b1', 'b2', 'b3']),
        seenBandIds: new Set(['b1', 'b2']),
        allPickCounts: new Map([
          ['b1', 2],
          ['b2', 2],
        ]),
      }),
    );

    expect(snap.bandsRatedCount).toBe(2);
    expect(snap.userRatingAvg).toBe(4.5);
    expect(snap.ratedPctOfSeen).toBe(100);
    expect(snap.userRatingsByBandId.get('b3')).toBeUndefined();
  });

  it('ratedPctOfSeen is 0 when user has no seen bands', () => {
    const snap = buildRatingStatsSnapshot(
      input({
        bands: [band({ id: 'b1' })],
        ratings: [rating('u1', 'b1', 5)],
        pickedBandIds: new Set(['b1']),
        seenBandIds: new Set(),
      }),
    );
    expect(snap.ratedPctOfSeen).toBe(0);
  });

  it('crew top rated picks highest avg; tie breaks on earlier start_time', () => {
    const bands = [
      band({
        id: 'b1',
        name: 'Later Tie',
        start_time: '2026-07-29T10:00:00.000Z',
        end_time: '2026-07-29T11:00:00.000Z',
      }),
      band({
        id: 'b2',
        name: 'Earlier Tie',
        start_time: '2026-07-28T10:00:00.000Z',
        end_time: '2026-07-28T11:00:00.000Z',
      }),
    ];
    const snap = buildRatingStatsSnapshot(
      input({
        bands,
        ratings: [rating('u1', 'b1', 5), rating('u2', 'b1', 5), rating('u1', 'b2', 5), rating('u2', 'b2', 5)],
        allPickCounts: new Map([
          ['b1', 2],
          ['b2', 2],
        ]),
      }),
    );

    expect(snap.crewTopRated?.name).toBe('Earlier Tie');
    expect(snap.crewTopRated?.avg).toBe(5);
  });

  it('crew lowest hidden when fewer than 2 distinct qualifying bands', () => {
    const bands = [band({ id: 'b1', name: 'Only One' })];
    const snap = buildRatingStatsSnapshot(
      input({
        bands,
        ratings: [rating('u1', 'b1', 2), rating('u2', 'b1', 2)],
        allPickCounts: new Map([['b1', 2]]),
      }),
    );

    expect(snap.crewTopRated?.name).toBe('Only One');
    expect(snap.crewLowestPick).toBeNull();
  });

  it('crew lowest excludes bands with fewer than 2 crew picks', () => {
    const bands = [
      band({ id: 'b1', name: 'Low Solo', start_time: '2026-07-28T10:00:00.000Z' }),
      band({ id: 'b2', name: 'Low Crew A', start_time: '2026-07-29T10:00:00.000Z' }),
      band({ id: 'b3', name: 'Low Crew B', start_time: '2026-07-30T10:00:00.000Z' }),
    ];
    const snap = buildRatingStatsSnapshot(
      input({
        bands,
        ratings: [
          rating('u1', 'b1', 1),
          rating('u1', 'b2', 2),
          rating('u2', 'b2', 2),
          rating('u1', 'b3', 3),
          rating('u2', 'b3', 3),
        ],
        allPickCounts: new Map([
          ['b1', 1],
          ['b2', 2],
          ['b3', 2],
        ]),
      }),
    );

    expect(snap.crewLowestPick?.name).toBe('Low Crew A');
  });

  it('excludes bands that have not ended at now()', () => {
    const futureEnd = '2026-08-15T11:00:00.000Z';
    const bands = [band({ id: 'b1', name: 'Future', end_time: futureEnd })];
    const snap = buildRatingStatsSnapshot(
      input({
        bands,
        ratings: [rating('u1', 'b1', 5)],
        allPickCounts: new Map([['b1', 2]]),
      }),
    );

    expect(snap.crewTopRated).toBeNull();
    expect(snap.crewLowestPick).toBeNull();
  });

  it('userTopScore prefers earliest 5★ over lower scores', () => {
    const bands = [
      band({
        id: 'b1',
        name: 'Four Star',
        start_time: '2026-07-28T10:00:00.000Z',
      }),
      band({
        id: 'b2',
        name: 'Five Star Later',
        start_time: '2026-07-29T10:00:00.000Z',
      }),
      band({
        id: 'b3',
        name: 'Five Star First',
        start_time: '2026-07-27T10:00:00.000Z',
      }),
    ];
    const snap = buildRatingStatsSnapshot(
      input({
        bands,
        ratings: [
          rating('u1', 'b1', 4),
          rating('u1', 'b2', 5),
          rating('u1', 'b3', 5),
        ],
        pickedBandIds: new Set(['b1', 'b2', 'b3']),
        seenBandIds: new Set(['b1', 'b2', 'b3']),
      }),
    );

    expect(snap.userTopScore).toEqual({ bandId: 'b3', name: 'Five Star First', score: 5 });
  });

  it('userTopScore falls back to best score when no 5★ exists', () => {
    const bands = [
      band({ id: 'b1', name: 'Three', start_time: '2026-07-28T10:00:00.000Z' }),
      band({ id: 'b2', name: 'Four First', start_time: '2026-07-27T10:00:00.000Z' }),
    ];
    const snap = buildRatingStatsSnapshot(
      input({
        bands,
        ratings: [rating('u1', 'b1', 3), rating('u1', 'b2', 4)],
        pickedBandIds: new Set(['b1', 'b2']),
        seenBandIds: new Set(['b1', 'b2']),
      }),
    );

    expect(snap.userTopScore?.score).toBe(4);
    expect(snap.userTopScore?.name).toBe('Four First');
  });

  it('userTopScore null when user has zero eligible ratings', () => {
    const snap = buildRatingStatsSnapshot(
      input({
        bands: [band({ id: 'b1' })],
        ratings: [rating('u2', 'b1', 5)],
        allPickCounts: new Map([['b1', 2]]),
      }),
    );
    expect(snap.userTopScore).toBeNull();
    expect(snap.bandsRatedCount).toBe(0);
  });
});
