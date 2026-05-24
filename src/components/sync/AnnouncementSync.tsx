import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { announcementsRepository } from '../../repositories';
import { emitSyncComplete } from './emitSyncComplete';

export function AnnouncementSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    async function syncNow() {
      const flushed = await announcementsRepository.flushPending();
      if (flushed > 0) emitSyncComplete();
      await announcementsRepository.sync();
    }

    syncNow().catch(() => {});

    function handleOnline() {
      syncNow().catch(() => {});
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId]);

  return null;
}
