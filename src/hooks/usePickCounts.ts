import { useMemo } from 'react';
import { useAllPicks } from './useAllPicks';
import type { UserPick } from '../types';

export function countPicks(picks: UserPick[]) {
  const map: Record<string, number> = {};
  for (const pick of picks) {
    map[pick.band_id] = (map[pick.band_id] ?? 0) + 1;
  }
  return map;
}

export function usePickCounts(): Record<string, number> {
  const allPicks = useAllPicks();
  return useMemo(() => countPicks(allPicks ?? []), [allPicks]);
}
