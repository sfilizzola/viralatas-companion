import { useEffect } from 'react';
import { getActiveFestivalId } from '../../lib/db';
import {
  announcementsRepository,
  missedRepository,
  picksRepository,
  presenceRepository,
  ratingsRepository,
  reactionsRepository,
  usersRepository,
} from '../../repositories';
import { subscribeToLiveBandTestConfigRealtime } from '../../services/liveBandTest';

/**
 * Mounts all Supabase Realtime → IndexedDB subscriptions once at app level.
 * Hooks react via window events only; they do not own Realtime channels.
 */
export function RealtimeSync() {
  useEffect(() => {
    let cancelled = false;
    let unsubscribers: Array<() => void> = [];

    void (async () => {
      const festivalId = (await getActiveFestivalId()) ?? undefined;
      if (cancelled) return;

      unsubscribers = [
        picksRepository.subscribeToRealtime(festivalId),
        announcementsRepository.subscribeToRealtime(festivalId),
        presenceRepository.subscribeToRealtime(),
        presenceRepository.subscribeToMetalPlaceConfigRealtime(),
        subscribeToLiveBandTestConfigRealtime(),
        missedRepository.subscribeToRealtime(),
        ratingsRepository.subscribeToRealtime(),
        reactionsRepository.subscribeToRealtime(),
        usersRepository.subscribeToRealtime(),
      ];

      if (cancelled) {
        for (const unsubscribe of unsubscribers) {
          unsubscribe();
        }
        unsubscribers = [];
      }
    })();

    return () => {
      cancelled = true;
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, []);

  return null;
}
