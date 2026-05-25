import { useEffect } from 'react';
import {
  announcementsRepository,
  missedRepository,
  picksRepository,
  presenceRepository,
  usersRepository,
} from '../../repositories';
import { subscribeToLiveBandTestConfigRealtime } from '../../services/liveBandTest';

/**
 * Mounts all Supabase Realtime → IndexedDB subscriptions once at app level.
 * Hooks react via window events only; they do not own Realtime channels.
 */
export function RealtimeSync() {
  useEffect(() => {
    const unsubscribers = [
      picksRepository.subscribeToRealtime(),
      announcementsRepository.subscribeToRealtime(),
      presenceRepository.subscribeToRealtime(),
      presenceRepository.subscribeToMetalPlaceConfigRealtime(),
      subscribeToLiveBandTestConfigRealtime(),
      missedRepository.subscribeToRealtime(),
      usersRepository.subscribeToRealtime(),
    ];

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, []);

  return null;
}
