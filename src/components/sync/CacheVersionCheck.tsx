import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { bandsRepository } from '../../repositories';

export function CacheVersionCheck() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      bandsRepository.checkAndApplyCacheVersion().catch(() => {});
    }
  }, [userId]);

  return null;
}
