import type { LivePlanStatus, PresenceLocation } from './livePreview';
import type { MetalPlaceConfig, UserPresence } from '../types';
import { getFestivalDay } from './time';

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
 * Returns true when the Metal Place window is currently active for the given
 * config and wall-clock time (CEST / Europe/Berlin).
 *
 * False when config is null, incomplete, or the current festival day does not
 * match (unless test_override_day bypasses the day check).
 */
export function isMetalPlaceWindowActive(
  config: MetalPlaceConfig | null,
  nowDate: Date,
): boolean {
  if (!config?.start_time || !config?.end_time) {
    return false;
  }

  const isTestMode = config.test_override_day !== null && config.test_override_day !== undefined;

  if (!isTestMode) {
    if (config.festival_day === null || config.festival_day === undefined) {
      return false;
    }
    const currentFestivalDay = getFestivalDay(nowDate);
    if (currentFestivalDay !== config.festival_day) {
      return false;
    }
  }

  const [startHour, startMin] = config.start_time.split(':').map(Number);
  const [endHour, endMin] = config.end_time.split(':').map(Number);

  const wallClock = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Berlin',
  }).format(nowDate);
  const [nowHourStr, nowMinStr] = wallClock.split(':');
  const nowTotalMinutes = Number.parseInt(nowHourStr, 10) * 60 + Number.parseInt(nowMinStr, 10);

  const startTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = endHour * 60 + endMin;

  return nowTotalMinutes >= startTotalMinutes && nowTotalMinutes < endTotalMinutes;
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
