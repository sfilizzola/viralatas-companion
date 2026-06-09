// src/hooks/usePresenceAutoSync.ts
import { useEffect } from 'react';
import type { MetalPlaceConfig } from '../types';
import type { LivePlanStatus } from '../services/livePreview';
import { presenceService } from '../services/presenceService';

interface UsePresenceAutoSyncParams {
  userId: string | null;
  metalPlaceConfig: MetalPlaceConfig | null;
  isCamping: boolean;
  myRawPlanStatus: LivePlanStatus;
  isMetalPlaceWindowActive: boolean;
}

export function usePresenceAutoSync({
  userId,
  metalPlaceConfig,
  isCamping,
  myRawPlanStatus,
  isMetalPlaceWindowActive,
}: UsePresenceAutoSyncParams): void {
  useEffect(() => {
    if (!metalPlaceConfig || !userId) return;
    presenceService.validateAndAutoCheckout(metalPlaceConfig, userId).catch(() => {});
  }, [metalPlaceConfig, userId, isMetalPlaceWindowActive]);

  useEffect(() => {
    if (!userId) return;
    presenceService
      .autoClearCampingOnCurrentBand(userId, isCamping, myRawPlanStatus)
      .catch(() => {});
  }, [userId, isCamping, myRawPlanStatus]);
}
