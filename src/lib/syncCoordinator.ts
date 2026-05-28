import {
  announcementsRepository,
  duckRepository,
  missedRepository,
  picksRepository,
  presenceRepository,
  ratingsRepository,
  usersRepository,
} from '../repositories';

/**
 * Single reconnect contract: flush all offline queues, pull remote crew data,
 * return total flushed item count (for sync toast).
 */
export async function runReconnectSync(userId: string): Promise<number> {
  const [picksFlushed, presenceFlushed, announcementsFlushed, duckFlushed, , ratingsFlushed] = await Promise.all([
    picksRepository.flushOfflineQueue(),
    presenceRepository.flushOfflineQueue(),
    announcementsRepository.flushOfflineQueue(),
    duckRepository.flushOfflineQueue(),
    missedRepository.flushOfflineQueue(),
    ratingsRepository.flushOfflineQueue(),
  ]);

  await Promise.all([
    picksRepository.syncCrewFromRemote(),
    usersRepository.syncCrew(),
    presenceRepository.syncCrewFromRemote(),
    announcementsRepository.sync(),
    missedRepository.syncFromRemote(userId),
    ratingsRepository.syncCrewFromRemote(),
  ]);

  return picksFlushed + presenceFlushed + announcementsFlushed + duckFlushed + ratingsFlushed;
}
