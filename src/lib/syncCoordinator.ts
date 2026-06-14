import {
  announcementsRepository,
  duckRepository,
  missedRepository,
  picksRepository,
  presenceRepository,
  ratingsRepository,
  reactionsRepository,
  usersRepository,
} from '../repositories';

/**
 * Single reconnect contract: flush all offline queues, pull remote crew data,
 * return total flushed item count (for sync toast).
 */
export async function runReconnectSync(userId: string): Promise<number> {
  const [picksFlushed, presenceFlushed, announcementsFlushed, duckFlushed, , ratingsFlushed] =
    await Promise.all([
      picksRepository.flushOfflineQueue(),
      presenceRepository.flushOfflineQueue(),
      announcementsRepository.flushOfflineQueue(),
      duckRepository.flushOfflineQueue(),
      missedRepository.flushOfflineQueue(),
      ratingsRepository.flushOfflineQueue(),
    ]);
  const reactionsFlushed = await reactionsRepository.flushOfflineQueue();

  await announcementsRepository.sync();
  await reactionsRepository.syncFromRemote();
  await Promise.all([
    picksRepository.syncCrewFromRemote(),
    usersRepository.syncCrew(),
    presenceRepository.syncCrewFromRemote(),
    missedRepository.syncFromRemote(userId),
    ratingsRepository.syncCrewFromRemote(),
  ]);

  return (
    picksFlushed +
    presenceFlushed +
    announcementsFlushed +
    duckFlushed +
    ratingsFlushed +
    reactionsFlushed
  );
}
