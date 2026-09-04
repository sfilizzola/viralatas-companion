import type { Band } from '../types';
import type { Festival } from '../types/festival';
import { hasRunningOrder } from '../lib/festivalFeatures';

export type TimedBand = Band & {
  slot_id: string;
  stage: string;
  start_time: string;
  end_time: string;
};

export function normalizeBandName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isTimedBand(
  band: Band,
  festival: Festival | null | undefined,
): band is TimedBand {
  return (
    hasRunningOrder(festival) &&
    Boolean(band.slot_id) &&
    Boolean(band.stage) &&
    Boolean(band.start_time) &&
    Boolean(band.end_time)
  );
}

export function timedBands(
  bands: Band[],
  festival: Festival | null | undefined,
): TimedBand[] {
  return bands.filter((band) => isTimedBand(band, festival));
}
