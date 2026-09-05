import { useMemo } from 'react';
import {
  buildPackPickActivity,
  festivalCountdown,
  newestAnnouncedBands,
  sortGoingMembers,
  type FestivalCountdown,
  type PackPickActivityItem,
} from '../services/planningNow';
import type { Band, CrewUser } from '../types';
import type { Festival } from '../types/festival';
import { useActiveFestival } from './useActiveFestival';
import { useAllPicks } from './useAllPicks';
import { useAuth } from './useAuth';
import { useBands } from './useBands';
import { useNow } from './useNow';
import { useCrewUsersCache } from './useSocialSnapshotSpecs';

/** Planning has no timed UI — the clock only needs to move the countdown. */
const PLANNING_TICK_MS = 60_000;

export type PlanningNowData = {
  festival: Festival | null;
  /** Full Active Festival Band pack — the Band modal resolves rows by id. */
  bands: Band[];
  /** Whole cached roster, sorted; members with zero Picks included. */
  members: CrewUser[];
  newestBands: Band[];
  activity: PackPickActivityItem[];
  countdown: FestivalCountdown;
  now: Date;
  loading: boolean;
};

const TBA: FestivalCountdown = { kind: 'tba' };
const EMPTY_BANDS: Band[] = [];
const EMPTY_MEMBERS: CrewUser[] = [];

/**
 * Scope Bands/Picks to the Active Festival id, not the catalog row.
 * No active id → empty (do not leak a mixed or leftover pack).
 * Legacy rows with null/omitted `festival_id` stay only while an id is active.
 */
function scopedToFestival<T extends { festival_id?: string | null }>(
  rows: T[],
  festivalId: string | null,
): T[] {
  if (!festivalId) return [];
  return rows.filter((row) => row.festival_id == null || row.festival_id === festivalId);
}

/**
 * IndexedDB-only data for the `/now` planning tree (Phase 50). Composes cached
 * Bands, Picks, and the `crew_users` roster; mounts no live-plan, presence, or
 * radar logic and never reads Supabase.
 */
export function usePlanningNowData(): PlanningNowData {
  const { festival, activeFestivalId, ready } = useActiveFestival();
  const { session } = useAuth();
  const { bands: packedBands, loading: bandsLoading } = useBands();
  const packedPicks = useAllPicks();
  const crewUsers = useCrewUsersCache();
  const now = useNow(PLANNING_TICK_MS);

  const currentUserId = session?.user?.id ?? null;
  const loading =
    !ready || bandsLoading || packedPicks === undefined || crewUsers === undefined;

  const bands = useMemo(
    () => scopedToFestival(packedBands, activeFestivalId),
    [packedBands, activeFestivalId],
  );

  const picks = useMemo(
    () => scopedToFestival(packedPicks ?? [], activeFestivalId),
    [packedPicks, activeFestivalId],
  );

  const members = useMemo(() => {
    if (!activeFestivalId) return EMPTY_MEMBERS;
    return sortGoingMembers(crewUsers ?? []);
  }, [activeFestivalId, crewUsers]);

  const newestBands = useMemo(
    () => (activeFestivalId ? newestAnnouncedBands(bands) : EMPTY_BANDS),
    [activeFestivalId, bands],
  );

  const activity = useMemo(
    () =>
      activeFestivalId
        ? buildPackPickActivity(picks, members, bands, currentUserId)
        : [],
    [activeFestivalId, picks, members, bands, currentUserId],
  );

  const countdown = useMemo(
    () => (festival ? festivalCountdown(festival.starts_at, festival.timezone, now) : TBA),
    [festival, now],
  );

  return useMemo(
    () => ({
      festival,
      bands,
      members,
      newestBands,
      activity,
      countdown,
      now,
      loading,
    }),
    [festival, bands, members, newestBands, activity, countdown, now, loading],
  );
}
