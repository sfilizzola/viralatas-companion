import type { BadgeBand, BadgeContext } from './types.ts';
import { buildBadgeContext } from './engine.ts';

export type ServerBand = BadgeBand & { id: string };

export type ServerUserPick = {
  user_id: string;
  band_id: string;
};

export type ServerMissedBand = {
  user_id: string;
  band_id: string;
};

export type ServerPresence = {
  user_id: string;
  is_camping: boolean;
  is_at_metal_place?: boolean;
};

export type ServerCrewUser = {
  id: string;
  display_name: string | null;
  is_friend?: boolean | null;
};

export type ServerUserRow = {
  id: string;
  special_badges: string[] | null;
  wacken_years: number[] | null;
  country: string | null;
  wacken_arrival_day: string | null;
  is_friend?: boolean | null;
};

export type ServerAuthMetadata = Record<string, unknown>;

type BulkData = {
  bands: ServerBand[];
  picks: ServerUserPick[];
  missed: ServerMissedBand[];
  presence: ServerPresence[];
  crewUsers: ServerCrewUser[];
};

function findLivePlan(
  bands: ServerBand[],
  pickedBandIds: Set<string>,
  at: Date,
): { status: 'current' | 'next' | 'empty'; band: ServerBand | null } {
  const pickedBands = bands
    .filter((band) => pickedBandIds.has(band.id))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const current = pickedBands
    .filter((band) => new Date(band.start_time) <= at && at < new Date(band.end_time))
    .sort((a, b) => b.start_time.localeCompare(a.start_time))[0];

  if (current) return { status: 'current', band: current };

  const next = pickedBands.find((band) => new Date(band.start_time) > at);
  if (next) return { status: 'next', band: next };

  return { status: 'empty', band: null };
}

function applyPresenceToLivePlan(
  plan: ReturnType<typeof findLivePlan>,
  isCamping: boolean,
): ReturnType<typeof findLivePlan> {
  if (plan.status === 'current') return plan;
  if (isCamping || plan.status === 'next') {
    return { status: 'lost', band: null };
  }
  return { status: 'lost', band: null };
}

type CrewPlan = ServerCrewUser & {
  isCamping: boolean;
  isAtMetalPlace: boolean;
  isFriend: boolean;
  plan: ReturnType<typeof applyPresenceToLivePlan>;
};

type CrewGroup =
  | { kind: 'camping' | 'lost'; members: CrewPlan[] }
  | { kind: 'band'; band: ServerBand; members: CrewPlan[] };

function mapCrewPlans(
  bands: ServerBand[],
  picks: ServerUserPick[],
  users: ServerCrewUser[],
  presence: ServerPresence[],
  at: Date,
): CrewPlan[] {
  const picksByUser = new Map<string, Set<string>>();
  for (const pick of picks) {
    const ids = picksByUser.get(pick.user_id) ?? new Set<string>();
    ids.add(pick.band_id);
    picksByUser.set(pick.user_id, ids);
  }

  const usersById = new Map(users.map((user) => [user.id, user]));
  for (const userId of picksByUser.keys()) {
    if (!usersById.has(userId)) {
      usersById.set(userId, { id: userId, display_name: null, is_friend: null });
    }
  }

  const presenceByUser = new Map(presence.map((item) => [item.user_id, item]));
  for (const item of presenceByUser.values()) {
    if (!usersById.has(item.user_id)) {
      usersById.set(item.user_id, { id: item.user_id, display_name: null, is_friend: null });
    }
  }

  return [...usersById.values()].map((user) => {
    const userPresence = presenceByUser.get(user.id);
    const isCamping = userPresence?.is_camping ?? false;
    const isAtMetalPlace = userPresence?.is_at_metal_place ?? false;
    const plan = findLivePlan(bands, picksByUser.get(user.id) ?? new Set(), at);
    return {
      ...user,
      isCamping,
      isAtMetalPlace,
      isFriend: user.is_friend === true,
      plan: applyPresenceToLivePlan(plan, isCamping),
    };
  });
}

function groupCrewPlans(crewPlans: CrewPlan[]): CrewGroup[] {
  const bandGroups = new Map<string, CrewGroup & { kind: 'band' }>();
  const campingMembers: CrewPlan[] = [];
  const lostMembers: CrewPlan[] = [];

  for (const crew of crewPlans) {
    if (crew.plan.status === 'current' && crew.plan.band) {
      const group = bandGroups.get(crew.plan.band.id) ?? {
        kind: 'band',
        band: crew.plan.band,
        members: [],
      };
      group.members.push(crew);
      bandGroups.set(crew.plan.band.id, group);
      continue;
    }

    if (crew.isFriend) continue;

    if (crew.isCamping) {
      campingMembers.push(crew);
    } else {
      lostMembers.push(crew);
    }
  }

  return [
    ...bandGroups.values(),
    { kind: 'camping', members: campingMembers },
    { kind: 'lost', members: lostMembers },
  ];
}

function deriveUserBadgeLocation(
  userId: string,
  groups: CrewGroup[],
  isCurrentUserFriend: boolean,
): 'camping' | 'lost' | 'metal_place' | null {
  if (isCurrentUserFriend) return null;

  const group = groups.find((g) => g.members.some((member) => member.id === userId));
  if (!group) return 'lost';

  switch (group.kind) {
    case 'camping':
      return 'camping';
    case 'lost':
      return 'lost';
    default:
      return null;
  }
}

function crewLocationCountsFromGroups(
  groups: CrewGroup[],
): Record<'camping' | 'metal_place' | 'lost', number> {
  return {
    camping: groups.find((g) => g.kind === 'camping')?.members.length ?? 0,
    metal_place: 0,
    lost: groups.find((g) => g.kind === 'lost')?.members.length ?? 0,
  };
}

function mergedPersistedBadgeSlugs(metadata: ServerAuthMetadata | undefined): Set<string> {
  const achieved = Array.isArray(metadata?.achieved_badge_slugs)
    ? (metadata.achieved_badge_slugs as string[])
    : [];
  const crewEarned = Array.isArray(metadata?.crew_earned_badge_slugs)
    ? (metadata.crew_earned_badge_slugs as string[])
    : [];
  return new Set([...achieved, ...crewEarned]);
}

function getWeakSkipCount(metadata: ServerAuthMetadata | undefined): number {
  const value = metadata?.weak_skips_2026;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function pseudoAuthUser(row: ServerUserRow, metadata: ServerAuthMetadata): {
  user_metadata: ServerAuthMetadata;
} {
  return {
    user_metadata: {
      ...metadata,
      wacken_years: row.wacken_years ?? metadata.wacken_years ?? [],
      country: row.country ?? metadata.country ?? null,
      wacken_arrival_day: row.wacken_arrival_day ?? metadata.wacken_arrival_day ?? null,
    },
  };
}

export function buildServerBadgeContext(
  user: ServerUserRow,
  metadata: ServerAuthMetadata,
  bulk: BulkData,
  at: Date,
): BadgeContext {
  const userPickBandIds = bulk.picks
    .filter((pick) => pick.user_id === user.id)
    .map((pick) => pick.band_id);

  const allPickCounts = new Map<string, number>();
  for (const pick of bulk.picks) {
    allPickCounts.set(pick.band_id, (allPickCounts.get(pick.band_id) ?? 0) + 1);
  }

  const bandsById = new Map(bulk.bands.map((band) => [band.id, band]));
  const missedBandIds = new Set(
    bulk.missed.filter((m) => m.user_id === user.id).map((m) => m.band_id),
  );

  const crewPlans = mapCrewPlans(
    bulk.bands,
    bulk.picks,
    bulk.crewUsers,
    bulk.presence,
    at,
  );
  const crewGroups = groupCrewPlans(crewPlans);
  const isFriend = user.is_friend === true;
  const currentLocation = deriveUserBadgeLocation(user.id, crewGroups, isFriend);
  const crewLocationCounts = crewLocationCountsFromGroups(crewGroups);

  const locationVisits = (metadata.location_visits as Record<string, number>) ?? {};
  const weakSkipCount = getWeakSkipCount(metadata);
  const achievedBadgeSlugs = mergedPersistedBadgeSlugs(metadata);
  const assignedBadges = user.special_badges ?? [];

  return buildBadgeContext(
    pseudoAuthUser(user, metadata) as Parameters<typeof buildBadgeContext>[0],
    userPickBandIds,
    allPickCounts,
    bandsById,
    missedBandIds,
    at,
    assignedBadges,
    locationVisits,
    currentLocation,
    crewLocationCounts,
    achievedBadgeSlugs,
    weakSkipCount,
  );
}

export function isFestivalEndedServer(
  at: Date,
  bands: ServerBand[],
): boolean {
  const nonCeremony = bands.filter((band) => band.category !== 'ceremony');
  if (nonCeremony.length === 0) return false;

  const maxEndMs = nonCeremony.reduce((max, band) => {
    const endMs = new Date(band.end_time).getTime();
    return endMs > max ? endMs : max;
  }, Number.NEGATIVE_INFINITY);

  return at.getTime() > maxEndMs;
}
