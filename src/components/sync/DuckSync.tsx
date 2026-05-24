import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { duckRepository } from '../../repositories';

export function DuckSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    function handleOnline() {
      duckRepository.flushOfflineDucks().catch(() => {});
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId]);

  return null;
}
