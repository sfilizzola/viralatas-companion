import { useMemo } from 'react';
import { useBands } from './useBands';
import { useNow } from './useNow';
import {
  buildStageScheduleSnapshot,
  type StageScheduleEntry,
} from '../services/stageSchedule';
import { useActiveFestival } from './useActiveFestival';

export function useStageSchedule(): StageScheduleEntry[] {
  const { bands } = useBands();
  const { festival } = useActiveFestival();
  const now = useNow(30_000);
  return useMemo(
    () => buildStageScheduleSnapshot(bands ?? [], now, festival),
    [bands, now, festival],
  );
}
