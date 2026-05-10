import { useMemo } from 'react';
import type { Band } from '../types';

export type OverlapSeverity = 'hard' | 'soft';

export type OverlapEntry = {
  band: Band;
  severity: OverlapSeverity;
};

const HARD_CONFLICT_THRESHOLD_MS = 600_000; // 10 minutes

export function computeBandOverlaps(bands: Band[]): Map<string, OverlapEntry[]> {
  const conflicts = new Map<string, OverlapEntry[]>();
  for (let i = 0; i < bands.length; i++) {
    const a = bands[i];
    const aStart = new Date(a.start_time).getTime();
    const aEnd = new Date(a.end_time).getTime();
    for (let j = i + 1; j < bands.length; j++) {
      const b = bands[j];
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

export function useBandConflicts(bands: Band[]): Map<string, OverlapEntry[]> {
  return useMemo(() => computeBandOverlaps(bands), [bands]);
}

// Alias for backwards compatibility during transition
export const computeBandConflicts = computeBandOverlaps;
