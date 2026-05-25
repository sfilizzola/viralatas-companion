import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { runReconnectSync } from '../../lib/syncCoordinator';
import { emitSyncComplete } from './emitSyncComplete';

export function ReconnectSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    async function reconnect() {
      try {
        const flushed = await runReconnectSync(userId);
        if (flushed > 0) emitSyncComplete();
      } catch {
        // Swallow offline / transient errors; queues retry on next reconnect.
      }
    }

    reconnect();

    function handleOnline() {
      reconnect();
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId]);

  return null;
}
