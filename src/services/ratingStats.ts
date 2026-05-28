import type { Band, UserBandRating } from '../types';
import {
  canRateBand,
  computeRatingAggregates,
  type BandRatingAggregate,
} from './bandRatings';

export type RatingStatsInput = {
  ratings: UserBandRating[];
  bands: Band[];
  userId: string;
  pickedBandIds: Set<string>;
  seenBandIds: Set<string>;
  missedBandIds: Set<string>;
  allPickCounts: Map<string, number>;
  now: Date;
};

export type RatingHighlight = {
  bandId: string;
  name: string;
  avg: number;
  count: number;
};

export type UserTopScore = {
  bandId: string;
  name: string;
  score: number;
};

export type RatingStatsSnapshot = {
  hasCrewRatings: boolean;
  userRatingsByBandId: Map<string, number>;
  aggregates: Record<string, BandRatingAggregate>;
  bandsRatedCount: number;
  userRatingAvg: number | null;
  ratedPctOfSeen: number;
  crewTopRated: RatingHighlight | null;
  crewLowestPick: RatingHighlight | null;
  userTopScore: UserTopScore | null;
};

function bandsById(bands: Band[]): Map<string, Band> {
  return new Map(bands.map((b) => [b.id, b]));
}

function isEndedHighlightBand(
  band: Band,
  now: Date,
  aggregate: BandRatingAggregate | undefined,
): boolean {
  if (band.category === 'ceremony') return false;
  if (new Date(band.end_time) >= now) return false;
  return aggregate !== undefined && aggregate.count >= 1;
}

function compareByAvgThenStart(
  a: { band: Band; avg: number },
  b: { band: Band; avg: number },
  direction: 'desc' | 'asc',
): number {
  const avgDelta = direction === 'desc' ? b.avg - a.avg : a.avg - b.avg;
  if (avgDelta !== 0) return avgDelta;
  return a.band.start_time.localeCompare(b.band.start_time);
}

function toHighlight(band: Band, aggregate: BandRatingAggregate): RatingHighlight {
  return {
    bandId: band.id,
    name: band.name,
    avg: aggregate.avg,
    count: aggregate.count,
  };
}

export function buildRatingStatsSnapshot(input: RatingStatsInput): RatingStatsSnapshot {
  const {
    ratings,
    bands,
    userId,
    pickedBandIds,
    seenBandIds,
    missedBandIds,
    allPickCounts,
    now,
  } = input;

  const bandMap = bandsById(bands);
  const aggregates = computeRatingAggregates(ratings);
  const hasCrewRatings = ratings.length >= 1;

  const userRatingsByBandId = new Map<string, number>();
  const eligibleUserScores: number[] = [];

  for (const row of ratings) {
    if (row.user_id !== userId) continue;
    const band = bandMap.get(row.band_id);
    if (!band) continue;
    if (
      !canRateBand({
        band,
        now,
        isPicked: pickedBandIds.has(band.id),
        isMissed: missedBandIds.has(band.id),
      })
    ) {
      continue;
    }
    userRatingsByBandId.set(band.id, row.score);
    eligibleUserScores.push(row.score);
  }

  const bandsRatedCount = eligibleUserScores.length;
  const userRatingAvg =
    bandsRatedCount > 0
      ? eligibleUserScores.reduce((sum, s) => sum + s, 0) / bandsRatedCount
      : null;

  const seenCount = seenBandIds.size;
  const ratedPctOfSeen =
    seenCount === 0 ? 0 : Math.round((bandsRatedCount / seenCount) * 100);

  const topCandidates: { band: Band; avg: number; aggregate: BandRatingAggregate }[] = [];
  const lowestCandidates: { band: Band; avg: number; aggregate: BandRatingAggregate }[] = [];

  for (const band of bands) {
    const aggregate = aggregates[band.id];
    if (!isEndedHighlightBand(band, now, aggregate)) continue;

    topCandidates.push({ band, avg: aggregate!.avg, aggregate: aggregate! });

    const pickCount = allPickCounts.get(band.id) ?? 0;
    if (pickCount >= 2) {
      lowestCandidates.push({ band, avg: aggregate!.avg, aggregate: aggregate! });
    }
  }

  topCandidates.sort((a, b) => compareByAvgThenStart(a, b, 'desc'));
  lowestCandidates.sort((a, b) => compareByAvgThenStart(a, b, 'asc'));

  const crewTopRated =
    topCandidates.length > 0
      ? toHighlight(topCandidates[0].band, topCandidates[0].aggregate)
      : null;

  const crewLowestPick =
    lowestCandidates.length >= 2
      ? toHighlight(lowestCandidates[0].band, lowestCandidates[0].aggregate)
      : null;

  let userTopScore: UserTopScore | null = null;
  if (bandsRatedCount > 0) {
    const ratedBands: { band: Band; score: number }[] = [];
    for (const [bandId, score] of userRatingsByBandId) {
      const band = bandMap.get(bandId);
      if (band) ratedBands.push({ band, score });
    }

    const fiveStar = ratedBands
      .filter((r) => r.score === 5)
      .sort((a, b) => a.band.start_time.localeCompare(b.band.start_time));

    const pick =
      fiveStar.length > 0
        ? fiveStar[0]
        : [...ratedBands].sort((a, b) => {
            const scoreDelta = b.score - a.score;
            if (scoreDelta !== 0) return scoreDelta;
            return a.band.start_time.localeCompare(b.band.start_time);
          })[0];

    userTopScore = {
      bandId: pick.band.id,
      name: pick.band.name,
      score: pick.score,
    };
  }

  return {
    hasCrewRatings,
    userRatingsByBandId,
    aggregates,
    bandsRatedCount,
    userRatingAvg,
    ratedPctOfSeen,
    crewTopRated,
    crewLowestPick,
    userTopScore,
  };
}

export function buildRatingStatsInputFromPicks(
  ratings: UserBandRating[],
  bands: Band[],
  userId: string,
  userPickBandIds: string[],
  allPicks: { user_id: string; band_id: string }[],
  missedBandIds: Set<string>,
  now: Date,
): RatingStatsInput {
  const pickedBandIds = new Set(userPickBandIds);
  const seenBandIds = new Set(
    bands
      .filter(
        (b) =>
          pickedBandIds.has(b.id) &&
          b.category !== 'ceremony' &&
          new Date(b.end_time) < now &&
          !missedBandIds.has(b.id),
      )
      .map((b) => b.id),
  );

  const allPickCounts = new Map<string, number>();
  for (const pick of allPicks) {
    allPickCounts.set(pick.band_id, (allPickCounts.get(pick.band_id) ?? 0) + 1);
  }

  return {
    ratings,
    bands,
    userId,
    pickedBandIds,
    seenBandIds,
    missedBandIds,
    allPickCounts,
    now,
  };
}
