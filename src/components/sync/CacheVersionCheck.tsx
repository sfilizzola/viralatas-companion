import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useActiveFestival } from '../../hooks/useActiveFestival';
import { bandsRepository } from '../../repositories';

export function CacheVersionCheck() {
  const { session } = useAuth();
  const { activeFestivalId } = useActiveFestival();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId && activeFestivalId) {
      bandsRepository.checkAndApplyCacheVersion(userId).catch(() => {});
    }
  }, [userId, activeFestivalId]);

  return null;
}
