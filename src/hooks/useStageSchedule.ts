import { useMemo } from 'react';
import { useBands } from './useBands';
import { useNow } from './useNow';
import {
  buildStageScheduleSnapshot,
  type StageScheduleEntry,
} from '../services/stageSchedule';

export function useStageSchedule(): StageScheduleEntry[] {
  const { bands } = useBands();
  const now = useNow();
  return useMemo(
    () => buildStageScheduleSnapshot(bands ?? [], now),
    [bands, now],
  );
}
