import { useMemo } from 'react';
import type { Band } from '../types';
import type { Festival } from '../types/festival';
import { timedBands, type TimedBand } from '../services/timedBand';

export type OverlapSeverity = 'hard' | 'soft';

export type OverlapEntry = {
  band: TimedBand;
  severity: OverlapSeverity;
};

const HARD_CONFLICT_THRESHOLD_MS = 900_000; // 15 minutes

export function computeBandOverlaps(
  bands: Band[],
  festival?: Festival | null,
): Map<string, OverlapEntry[]> {
  const usable = timedBands(bands, festival ?? null);
  const conflicts = new Map<string, OverlapEntry[]>();
  for (let i = 0; i < usable.length; i++) {
    const a = usable[i];
    if (a.category === 'ceremony') continue;
    const aStart = new Date(a.start_time).getTime();
    const aEnd = new Date(a.end_time).getTime();
    for (let j = i + 1; j < usable.length; j++) {
      const b = usable[j];
      if (b.category === 'ceremony') continue;
      if (a.stage === b.stage) continue;
      const bStart = new Date(b.start_time).getTime();
      const bEnd = new Date(b.end_time).getTime();
      if (aStart < bEnd && bStart < aEnd) {
        const overlapStart = Math.max(aStart, bStart);
        const overlapEnd = Math.min(aEnd, bEnd);
        const durationMs = overlapEnd - overlapStart;
        const severity: OverlapSeverity = durationMs > HARD_CONFLICT_THRESHOLD_MS ? 'hard' : 'soft';

        const aList = conflicts.get(a.id) ?? [];
        aList.push({ band: b, severity });
        conflicts.set(a.id, aList);
        const bList = conflicts.get(b.id) ?? [];
        bList.push({ band: a, severity });
        conflicts.set(b.id, bList);
      }
    }
  }
  return conflicts;
}

export function useBandConflicts(
  bands: Band[],
  festival: Festival | null | undefined,
): Map<string, OverlapEntry[]> {
  return useMemo(() => computeBandOverlaps(bands, festival), [bands, festival]);
}

// Alias for backwards compatibility during transition
export const computeBandConflicts = computeBandOverlaps;
