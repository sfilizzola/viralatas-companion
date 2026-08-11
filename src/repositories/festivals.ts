import {
  clearActiveFestivalId,
  clearActiveFestivalPack,
  getActiveFestivalId,
  setActiveFestivalCacheVersion,
  setActiveFestivalId,
} from '../lib/db/festivals';
import { supabase } from '../lib/supabase';
import type { Festival, FestivalMembership } from '../types';
import { announcementsRepository } from './announcements';
import { bandsRepository } from './bands';
import { missedRepository } from './missed';
import { picksRepository } from './picks';
import { ratingsRepository } from './ratings';
import { reactionsRepository } from './reactions';
import { usersRepository } from './users';

function asFestival(row: Record<string, unknown>): Festival {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    timezone: row.timezone as string,
    starts_at: row.starts_at as string,
    ends_at: row.ends_at as string,
    features: (row.features ?? {}) as Festival['features'],
    cache_version: row.cache_version as string,
  };
}

async function syncCatalog(): Promise<Festival[]> {
  const { data, error } = await supabase.from('festivals').select('*');
  if (error) throw error;
  return (data ?? []).map((row) => asFestival(row as Record<string, unknown>));
}

async function syncMyMemberships(userId: string): Promise<FestivalMembership[]> {
  const { data, error } = await supabase
    .from('festival_memberships')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as FestivalMembership[];
}

async function optIn(userId: string, festivalId: string): Promise<void> {
  const { error } = await supabase.from('festival_memberships').insert({
    user_id: userId,
    festival_id: festivalId,
  });
  if (error) throw error;
}

async function optOut(userId: string, festivalId: string): Promise<void> {
  const { error } = await supabase
    .from('festival_memberships')
    .delete()
    .eq('user_id', userId)
    .eq('festival_id', festivalId);
  if (error) throw error;

  const activeId = await getActiveFestivalId();
  if (activeId === festivalId) {
    await clearActiveFestivalId();
    const { error: userError } = await supabase
      .from('users')
      .update({ active_festival_id: null })
      .eq('id', userId);
    if (userError) throw userError;
  }
}

async function loadActivePack(userId: string, festivalId: string): Promise<void> {
  await Promise.all([
    bandsRepository.sync(festivalId),
    picksRepository.syncCrewFromRemote(festivalId),
    announcementsRepository.sync(festivalId),
    reactionsRepository.syncFromRemote(festivalId),
    missedRepository.syncFromRemote(userId),
    ratingsRepository.syncCrewFromRemote(festivalId),
    usersRepository.syncCrew(festivalId),
  ]);
}

async function setActiveFestival(userId: string, festivalId: string): Promise<void> {
  const { data: membership, error: membershipError } = await supabase
    .from('festival_memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('festival_id', festivalId)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) {
    throw new Error('Not a festival member');
  }

  await clearActiveFestivalPack();

  const { error: userError } = await supabase
    .from('users')
    .update({ active_festival_id: festivalId })
    .eq('id', userId);
  if (userError) throw userError;

  const { data: festival, error: festivalError } = await supabase
    .from('festivals')
    .select('*')
    .eq('id', festivalId)
    .single();
  if (festivalError) throw festivalError;

  const cacheVersion = (festival as { cache_version?: string } | null)?.cache_version ?? '1';
  await setActiveFestivalId(festivalId);
  await setActiveFestivalCacheVersion(cacheVersion);
  await loadActivePack(userId, festivalId);
}

export const festivalsRepository = {
  syncCatalog,
  syncMyMemberships,
  optIn,
  optOut,
  setActiveFestival,
  loadActivePack,
};
