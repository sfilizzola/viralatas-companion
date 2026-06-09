import type { LivePlanStatus, PresenceLocation } from './livePreview';
import type { MetalPlaceConfig, UserPresence } from '../types';
import {
  isMetalPlaceWindowActive,
  resolvePresenceToggle,
  shouldAutoClearCamping,
  shouldAutoCheckout,
  type PresenceToggleContext,
} from './presencePolicy';
import { presenceRepository } from '../repositories/presence';
import { loadUserPresence } from '../lib/db';
import { supabase } from '../lib/supabase';
import { now } from './time';

export type { PresenceToggleContext };

/**
 * Write camping status and, on first entry, record a location visit.
 * All paths that set camping go through here so tracking is never missed.
 */
async function setCampingStatus(userId: string, isCamping: boolean): Promise<void> {
  const { entered } = await presenceRepository.setCampingStatus(userId, isCamping);
  if (entered) await presenceRepository.incrementLocationVisit('camping');
}

/**
 * Write metal-place status and, on first entry, record a location visit.
 * All paths that set metal-place go through here so tracking is never missed.
 */
async function setMetalPlaceStatus(userId: string, isAtMetalPlace: boolean): Promise<void> {
  const { entered } = await presenceRepository.setMetalPlaceStatus(userId, isAtMetalPlace);
  if (entered) await presenceRepository.incrementLocationVisit('metal_place');
}

async function applyPresenceToggle(
  userId: string,
  nextValue: PresenceLocation,
  context: PresenceToggleContext,
): Promise<void> {
  const decision = resolvePresenceToggle(nextValue, context);
  if (decision.setMetalPlace !== null) await setMetalPlaceStatus(userId, decision.setMetalPlace);
  if (decision.setCamping !== null) await setCampingStatus(userId, decision.setCamping);
}

async function autoClearCampingOnCurrentBand(
  userId: string,
  isCamping: boolean,
  myRawPlanStatus: LivePlanStatus,
): Promise<void> {
  if (!shouldAutoClearCamping(isCamping, myRawPlanStatus)) return;
  await setCampingStatus(userId, false);
}

async function validateAndAutoCheckout(
  config: MetalPlaceConfig | null,
  userId: string | null,
): Promise<void> {
  if (!userId || !config) return;
  // Fast path: window is active — skip the IDB read entirely
  if (isMetalPlaceWindowActive(config, now())) return;

  try {
    const presence = await loadUserPresence(userId);
    if (shouldAutoCheckout(config, now(), presence ?? null)) {
      await setMetalPlaceStatus(userId, false);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'InvalidStateError') {
      console.debug('[Metal Place] Skipping auto-checkout due to DB connection closing', error);
      return;
    }
    throw error;
  }
}

async function autoCheckoutAllUsers(): Promise<void> {
  try {
    const { data, error } = await supabase.from('user_presence').select('*');
    if (error || !data) return;

    const usersAtMetalPlace = (data as UserPresence[]).filter((p) => p.is_at_metal_place);

    for (const presence of usersAtMetalPlace) {
      try {
        await setMetalPlaceStatus(presence.user_id, false);
      } catch (err) {
        if (err instanceof Error && err.name !== 'InvalidStateError') {
          console.error(`Failed to checkout user ${presence.user_id}:`, err);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'InvalidStateError') {
      console.debug('[Metal Place] Auto-checkout skipped due to DB connection closing');
      return;
    }
    throw error;
  }
}

export const presenceService = {
  setCampingStatus,
  setMetalPlaceStatus,
  applyPresenceToggle,
  autoClearCampingOnCurrentBand,
  validateAndAutoCheckout,
  autoCheckoutAllUsers,
};
