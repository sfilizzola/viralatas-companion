import type { Festival, FestivalFeatureKey } from '../types/festival';

export function hasFestivalFeature(
  festival: Festival | null | undefined,
  key: FestivalFeatureKey,
): boolean {
  return festival?.features?.[key] === true;
}
