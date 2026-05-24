import { useCallback, useMemo, useState } from 'react';
import type { Band, UserMissedBand } from '../types';
import type { BandAttendee } from './useBandAttendees';
import type { OverlapEntry } from './useBandConflicts';

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
    await toggleMissed(activeBand.id);
  }, [activeBand, toggleMissed]);

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
  ]);

  return {
    activeBand,
    openBand,
    closeBand,
    modalProps,
  };
}
