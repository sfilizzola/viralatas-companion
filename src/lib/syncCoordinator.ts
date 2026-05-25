import {
  announcementsRepository,
  duckRepository,
  missedRepository,
  picksRepository,
  presenceRepository,
  usersRepository,
} from '../repositories';

/**
 * Single reconnect contract: flush all offline queues, pull remote crew data,
 * return total flushed item count (for sync toast).
 */
export async function runReconnectSync(userId: string): Promise<number> {
  const [picksFlushed, presenceFlushed, announcementsFlushed, duckFlushed] = await Promise.all([
    picksRepository.flushOfflineQueue(),
    presenceRepository.flushOfflineQueue(),
    announcementsRepository.flushPending(),
    duckRepository.flushOfflineDucks(),
    missedRepository.flushOfflineQueue(),
  ]);

  await Promise.all([
    picksRepository.syncCrewFromRemote(),
    usersRepository.syncCrew(),
    presenceRepository.syncCrewFromRemote(),
    announcementsRepository.sync(),
    missedRepository.syncFromRemote(userId),
  ]);

  return picksFlushed + presenceFlushed + announcementsFlushed + duckFlushed;
}
