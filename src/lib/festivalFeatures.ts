import type { Festival, FestivalFeatureKey } from '../types/festival';

export function hasFestivalFeature(
  festival: Festival | null | undefined,
  key: FestivalFeatureKey,
): boolean {
  return festival?.features?.[key] === true;
}

export function canShowMap(f: Festival | null | undefined) {
  return hasFestivalFeature(f, 'map');
}

export function canShowMetalPlace(f: Festival | null | undefined) {
  return hasFestivalFeature(f, 'metal_place');
}

export function canShowDuck(f: Festival | null | undefined) {
  return hasFestivalFeature(f, 'duck');
}

export function canShowCamp(f: Festival | null | undefined) {
  return hasFestivalFeature(f, 'camp');
}

export function canShowWrap(f: Festival | null | undefined) {
  return hasFestivalFeature(f, 'wrap');
}

export function canShowRemoteLineup(f: Festival | null | undefined) {
  return hasFestivalFeature(f, 'remote_lineup');
}

export function hasRunningOrder(f: Festival | null | undefined) {
  return hasFestivalFeature(f, 'running_order');
}

export function canShowPresence(f: Festival | null | undefined) {
  return canShowCamp(f) || canShowMetalPlace(f);
}
