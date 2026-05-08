import { useMemo } from 'react';
import type { Band } from '../types';

export function computeBandConflicts(bands: Band[]): Map<string, Band[]> {
  const conflicts = new Map<string, Band[]>();
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
        const aList = conflicts.get(a.id) ?? [];
        aList.push(b);
        conflicts.set(a.id, aList);
        const bList = conflicts.get(b.id) ?? [];
        bList.push(a);
        conflicts.set(b.id, bList);
      }
    }
  }
  return conflicts;
}

export function useBandConflicts(bands: Band[]): Map<string, Band[]> {
  return useMemo(() => computeBandConflicts(bands), [bands]);
}
