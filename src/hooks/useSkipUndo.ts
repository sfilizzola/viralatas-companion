// src/hooks/useSkipUndo.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LivePlan } from '../services/livePreview';
import { loadUserPicks } from '../lib/db';
import { WEAK_SKIP_UNDO_MS, recordCommittedSkip } from '../services/weakSkips';
import { usePickActions } from './usePickActions';

export function useSkipUndo(
  myPlan: LivePlan,
  userId: string | null,
): {
  undoState: { bandId: string; bandName: string } | null;
  handleSkip: () => Promise<void>;
  handleUndo: () => Promise<void>;
} {
  const { unpickBand, pickBand } = usePickActions(userId);
  const [undoState, setUndoState] = useState<{ bandId: string; bandName: string } | null>(null);
  const [undoTimerId, setUndoTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const pendingWeakSkipRef = useRef<{ bandId: string } | null>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerId) clearTimeout(undoTimerId);
    };
  }, [undoTimerId]);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, []);

  const commitWeakSkip = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      const userPicks = await loadUserPicks(userId);
      if (userPicks.some((pick) => pick.band_id === bandId)) return;
      await recordCommittedSkip(userId, bandId);
    },
    [userId],
  );

  const clearSkipTimers = useCallback(() => {
    if (undoTimerId) clearTimeout(undoTimerId);
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = null;
    setUndoTimerId(null);
  }, [undoTimerId]);

  const handleSkip = useCallback(async () => {
    if (!myPlan.band || !userId) return;
    const bandId = myPlan.band.id;
    const bandName = myPlan.band.name;

    if (pendingWeakSkipRef.current) {
      await commitWeakSkip(pendingWeakSkipRef.current.bandId);
      pendingWeakSkipRef.current = null;
    }

    clearSkipTimers();
    await unpickBand(bandId);
    pendingWeakSkipRef.current = { bandId };
    setUndoState({ bandId, bandName });

    const nextUndoTimerId = setTimeout(() => {
      setUndoState(null);
    }, WEAK_SKIP_UNDO_MS);
    setUndoTimerId(nextUndoTimerId);

    commitTimerRef.current = setTimeout(() => {
      void commitWeakSkip(bandId).finally(() => {
        pendingWeakSkipRef.current = null;
        commitTimerRef.current = null;
      });
    }, WEAK_SKIP_UNDO_MS);
  }, [myPlan, userId, clearSkipTimers, unpickBand, commitWeakSkip]);

  const handleUndo = useCallback(async () => {
    if (!undoState || !userId) return;
    clearSkipTimers();
    pendingWeakSkipRef.current = null;
    await pickBand(undoState.bandId);
    setUndoState(null);
  }, [undoState, userId, clearSkipTimers, pickBand]);

  return { undoState, handleSkip, handleUndo };
}
