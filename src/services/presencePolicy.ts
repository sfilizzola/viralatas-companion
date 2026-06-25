import type { LivePlanStatus, PresenceLocation } from './livePreview';
import type { MetalPlaceConfig, UserPresence } from '../types';
import { findActiveMetalPlaceWindow } from './metalPlaceValidation';

export type PresenceDecision = {
  setCamping: boolean | null;    // null = no change
  setMetalPlace: boolean | null; // null = no change
};

export type PresenceToggleContext = {
  myRawPlanStatus: LivePlanStatus;
  isAtMetalPlace: boolean;
  isCamping: boolean;
};

/**
 * Returns true when any Metal Place window is currently active for the given
 * config and wall-clock time (CEST / Europe/Berlin).
 *
 * False when config is null, has zero windows, or no slot matches day + [start, end).
 */
export function isMetalPlaceWindowActive(
  config: MetalPlaceConfig | null,
  nowDate: Date,
): boolean {
  if (!config?.windows?.length) {
    return false;
  }

  return findActiveMetalPlaceWindow(config.windows, nowDate) !== null;
}

/**
 * Resolves what camping / metal-place state changes a presence toggle should
 * produce. Returns a PresenceDecision where null means "no change to that flag".
 *
 * The service layer executes the decision; no I/O happens here.
 */
export function resolvePresenceToggle(
  nextValue: PresenceLocation,
  context: PresenceToggleContext,
): PresenceDecision {
  if (nextValue === 'camping') {
    // Camping is blocked while a band is currently playing (auto-cleared instead).
    if (context.myRawPlanStatus === 'current') {
      return { setCamping: false, setMetalPlace: null };
    }
    return { setCamping: true, setMetalPlace: null };
  }
  if (nextValue === 'metal_place') {
    return { setCamping: null, setMetalPlace: true };
  }
  // 'auto' — clear any explicit location flags
  return {
    setCamping: context.isCamping ? false : null,
    setMetalPlace: context.isAtMetalPlace ? false : null,
  };
}

/**
 * Returns true when camping should be auto-cleared because the user now has a
 * current band.
 */
export function shouldAutoClearCamping(
  isCamping: boolean,
  planStatus: LivePlanStatus,
): boolean {
  return isCamping && planStatus === 'current';
}

/**
 * Returns true when a user should be automatically checked out of Metal Place.
 * Requires a non-null config; without it we cannot determine window state and
 * should never trigger a checkout.
 */
export function shouldAutoCheckout(
  config: MetalPlaceConfig | null,
  nowDate: Date,
  presence: UserPresence | null,
): boolean {
  if (!config) return false;
  if (!presence?.is_at_metal_place) return false;
  return !isMetalPlaceWindowActive(config, nowDate);
}
