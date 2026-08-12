import { getActiveFestivalId, setActiveFestivalId } from './db';
import { supabase } from './supabase';
import {
  announcementsRepository,
  bandsRepository,
  duckRepository,
  missedRepository,
  picksRepository,
  presenceRepository,
  ratingsRepository,
  reactionsRepository,
  usersRepository,
} from '../repositories';

async function resolveActiveFestivalId(userId: string): Promise<string | null> {
  let festivalId = await getActiveFestivalId();
  if (festivalId) return festivalId;

  const { data, error } = await supabase
    .from('users')
    .select('active_festival_id')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data?.active_festival_id) return null;

  festivalId = data.active_festival_id;
  await setActiveFestivalId(festivalId);
  return festivalId;
}

/**
 * Single reconnect contract: flush all offline queues, pull remote crew data,
 * return total flushed item count (for sync toast).
 */
export async function runReconnectSync(userId: string): Promise<number> {
  const festivalId = await resolveActiveFestivalId(userId);
  const festivalArg = festivalId ?? undefined;

  const [picksFlushed, presenceFlushed, announcementsFlushed, duckFlushed, , ratingsFlushed] =
    await Promise.all([
      picksRepository.flushOfflineQueue(festivalArg),
      presenceRepository.flushOfflineQueue(),
      announcementsRepository.flushOfflineQueue(festivalArg),
      duckRepository.flushOfflineQueue(),
      missedRepository.flushOfflineQueue(),
      ratingsRepository.flushOfflineQueue(),
    ]);
  const reactionsFlushed = await reactionsRepository.flushOfflineQueue();

  await announcementsRepository.sync(festivalArg);
  await reactionsRepository.syncFromRemote(festivalArg);
  await Promise.all([
    bandsRepository.sync(festivalArg),
    picksRepository.syncCrewFromRemote(festivalArg),
    usersRepository.syncCrew(festivalArg),
    presenceRepository.syncCrewFromRemote(),
    missedRepository.syncFromRemote(userId, festivalArg),
    ratingsRepository.syncCrewFromRemote(festivalArg),
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
