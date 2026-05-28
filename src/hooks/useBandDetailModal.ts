import { useCallback, useMemo, useState } from 'react';
import type { Band, BandRatingScore, UserMissedBand } from '../types';
import type { BandAttendee } from './useBandAttendees';
import type { OverlapEntry } from './useBandConflicts';
import { canRateBand } from '../services/bandRatings';

export type BandDetailModalProps = {
  band: Band;
  attendees: BandAttendee[];
  isPicked: boolean;
  onTogglePick: () => void;
  onClose: () => void;
  isBandEnded: boolean;
  hidePick: boolean;
  missedUserIds: Set<string>;
  isMissed: boolean;
  onToggleMissed: () => void;
  conflictBands: Band[];
  overlapBands: Band[];
  canRate: boolean;
  userScore: BandRatingScore | null;
  onRate: (score: BandRatingScore | null) => void;
};

type UseBandDetailModalParams = {
  bands: Band[];
  pickedIds: Set<string>;
  togglePick: (bandId: string) => Promise<void>;
  allMissed: UserMissedBand[];
  missedBandIds: Set<string>;
  toggleMissed: (bandId: string) => Promise<void>;
  attendeesByBand: Record<string, BandAttendee[]>;
  currentNow: Date;
  conflicts: Map<string, OverlapEntry[]>;
  userRatingByBand: Record<string, BandRatingScore>;
  toggleRating: (bandId: string, score: BandRatingScore) => Promise<void>;
  clearRating: (bandId: string) => Promise<void>;
};

function bandsForConflict(
  conflicts: Map<string, OverlapEntry[]>,
  bandId: string,
  severity: OverlapEntry['severity'],
): Band[] {
  return conflicts.get(bandId)?.filter((e) => e.severity === severity).map((e) => e.band) ?? [];
}

export function useBandDetailModal({
  bands,
  pickedIds,
  togglePick,
  allMissed,
  missedBandIds,
  toggleMissed,
  attendeesByBand,
  currentNow,
  conflicts,
  userRatingByBand,
  toggleRating,
  clearRating,
}: UseBandDetailModalParams) {
  const [activeBandId, setActiveBandId] = useState<string | null>(null);

  const activeBand = useMemo(
    () => (activeBandId ? bands.find((band) => band.id === activeBandId) ?? null : null),
    [activeBandId, bands],
  );

  const missedUserIds = useMemo<Set<string>>(() => {
    if (!activeBand) return new Set();
    return new Set(
      allMissed.filter((missed) => missed.band_id === activeBand.id).map((missed) => missed.user_id),
    );
  }, [allMissed, activeBand]);

  const isMissed = useMemo(
    () => !!(activeBand && missedBandIds.has(activeBand.id)),
    [missedBandIds, activeBand],
  );

  const isBandEnded = useMemo(
    () => !!activeBand && new Date(activeBand.end_time) < currentNow,
    [activeBand, currentNow],
  );

  const openBand = useCallback((bandId: string) => {
    setActiveBandId(bandId);
  }, []);

  const closeBand = useCallback(() => {
    setActiveBandId(null);
  }, []);

  const handleTogglePick = useCallback(async () => {
    if (!activeBand) return;
    await togglePick(activeBand.id);
  }, [activeBand, togglePick]);

  const handleToggleMissed = useCallback(async () => {
    if (!activeBand) return;
    const wasMissed = missedBandIds.has(activeBand.id);
    await toggleMissed(activeBand.id);
    if (!wasMissed) {
      void clearRating(activeBand.id);
    }
  }, [activeBand, missedBandIds, toggleMissed, clearRating]);

  const handleRate = useCallback(
    async (score: BandRatingScore | null) => {
      if (!activeBand) return;
      if (score === null) {
        await clearRating(activeBand.id);
      } else {
        await toggleRating(activeBand.id, score);
      }
    },
    [activeBand, clearRating, toggleRating],
  );

  const modalProps = useMemo<BandDetailModalProps | null>(() => {
    if (!activeBand) return null;

    return {
      band: activeBand,
      attendees: attendeesByBand[activeBand.id] ?? [],
      isPicked: pickedIds.has(activeBand.id),
      onTogglePick: handleTogglePick,
      onClose: closeBand,
      isBandEnded,
      hidePick: isBandEnded,
      missedUserIds,
      isMissed,
      onToggleMissed: handleToggleMissed,
      conflictBands: bandsForConflict(conflicts, activeBand.id, 'hard'),
      overlapBands: bandsForConflict(conflicts, activeBand.id, 'soft'),
      canRate: canRateBand({
        band: activeBand,
        now: currentNow,
        isPicked: pickedIds.has(activeBand.id),
        isMissed: missedBandIds.has(activeBand.id),
      }),
      userScore: userRatingByBand[activeBand.id] ?? null,
      onRate: handleRate,
    };
  }, [
    activeBand,
    attendeesByBand,
    pickedIds,
    handleTogglePick,
    closeBand,
    isBandEnded,
    missedUserIds,
    isMissed,
    handleToggleMissed,
    conflicts,
    currentNow,
    missedBandIds,
    userRatingByBand,
    handleRate,
  ]);

  return {
    activeBand,
    openBand,
    closeBand,
    modalProps,
  };
}
