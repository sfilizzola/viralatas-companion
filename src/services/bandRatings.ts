import type { Band, UserBandRating } from '../types';

export type BandRatingAggregate = { avg: number; count: number };

export function canRateBand(input: {
  band: Band;
  now: Date;
  isPicked: boolean;
  isMissed: boolean;
}): boolean {
  if (input.band.category === 'ceremony') return false;
  if (!input.isPicked || input.isMissed) return false;
  return new Date(input.band.end_time) < input.now;
}

/** Display avg for Popular cards — one decimal, trim trailing zero. Sort uses raw avg. */
export function formatRatingAvg(avg: number): string {
  const rounded = Math.round(avg * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function computeRatingAggregates(
  ratings: UserBandRating[],
): Record<string, BandRatingAggregate> {
  const sums: Record<string, { total: number; count: number }> = {};
  for (const row of ratings) {
    const bucket = sums[row.band_id] ?? { total: 0, count: 0 };
    bucket.total += row.score;
    bucket.count += 1;
    sums[row.band_id] = bucket;
  }
  const out: Record<string, BandRatingAggregate> = {};
  for (const [bandId, { total, count }] of Object.entries(sums)) {
    out[bandId] = { avg: total / count, count };
  }
  return out;
}

export function sortBandsByRating<T extends Band>(
  bands: T[],
  aggregates: Record<string, BandRatingAggregate>,
): T[] {
  return [...bands].sort((a, b) => {
    const aggA = aggregates[a.id];
    const aggB = aggregates[b.id];
    if (!aggA && !aggB) return a.start_time.localeCompare(b.start_time);
    if (!aggA) return 1;
    if (!aggB) return -1;
    const avgDelta = aggB.avg - aggA.avg;
    if (avgDelta !== 0) return avgDelta;
    const countDelta = aggB.count - aggA.count;
    if (countDelta !== 0) return countDelta;
    return a.start_time.localeCompare(b.start_time);
  });
}
