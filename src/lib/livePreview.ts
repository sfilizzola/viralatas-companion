import type { Band, CrewUser, UserPick, UserPresence } from '../types';

export type LivePlanStatus = 'current' | 'next' | 'empty' | 'lost';

export type LivePlan = {
  status: LivePlanStatus;
  band: Band | null;
  nextBand?: Band | null;
};

export type CrewLivePlan = CrewUser & {
  label: string;
  plan: LivePlan;
  isCamping: boolean;
  isAtMetalPlace: boolean;
};

export type CrewLiveGroup =
  | {
      kind: 'band';
      band: Band;
      members: CrewLivePlan[];
    }
  | {
      kind: 'metal_place' | 'camping' | 'lost';
      band: null;
      members: CrewLivePlan[];
    };

export function findLivePlan(bands: Band[], pickedBandIds: Set<string>, now: Date): LivePlan {
  const pickedBands = bands
    .filter((band) => pickedBandIds.has(band.id))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const current = pickedBands
    .filter((band) => new Date(band.start_time) <= now && now < new Date(band.end_time))
    .sort((a, b) => b.start_time.localeCompare(a.start_time))[0];

  if (current) return { status: 'current', band: current };

  const next = pickedBands.find((band) => new Date(band.start_time) > now);
  if (next) return { status: 'next', band: next };

  return { status: 'empty', band: null };
}

export function applyPresenceToLivePlan(plan: LivePlan, isCamping: boolean): LivePlan {
  if (plan.status === 'current') return plan;
  if (isCamping || plan.status === 'next') {
    return { status: 'lost', band: null, nextBand: plan.band };
  }
  return { status: 'lost', band: null, nextBand: null };
}

export function mapCrewLivePlans(
  bands: Band[],
  picks: UserPick[],
  users: CrewUser[],
  presence: UserPresence[],
  now: Date,
): CrewLivePlan[] {
  const picksByUser = new Map<string, Set<string>>();
  for (const pick of picks) {
    const bandIds = picksByUser.get(pick.user_id) ?? new Set<string>();
    bandIds.add(pick.band_id);
    picksByUser.set(pick.user_id, bandIds);
  }

  const usersById = new Map(users.map((user) => [user.id, user]));
  for (const userId of picksByUser.keys()) {
    if (!usersById.has(userId)) {
      usersById.set(userId, { id: userId, display_name: null, avatar_url: null });
    }
  }

  const presenceByUser = new Map(presence.map((item) => [item.user_id, item]));
  for (const item of presenceByUser.values()) {
    if (!usersById.has(item.user_id)) {
      usersById.set(item.user_id, { id: item.user_id, display_name: null, avatar_url: null });
    }
  }

  return [...usersById.values()]
    .map((user) => {
      const presence = presenceByUser.get(user.id);
      const isCamping = presence?.is_camping ?? false;
      const isAtMetalPlace = presence?.is_at_metal_place ?? false;
      const plan = findLivePlan(bands, picksByUser.get(user.id) ?? new Set(), now);
      return {
        ...user,
        isCamping,
        isAtMetalPlace,
        label: user.display_name?.trim() || `Crew ${user.id.slice(0, 4).toUpperCase()}`,
        plan: applyPresenceToLivePlan(plan, isCamping),
      };
    })
    .sort((a, b) => {
      const aTime = a.plan.band?.start_time ?? a.plan.nextBand?.start_time ?? '';
      const bTime = b.plan.band?.start_time ?? b.plan.nextBand?.start_time ?? '';
      if (aTime && bTime && aTime !== bTime) return aTime.localeCompare(bTime);
      if (aTime !== bTime) return aTime ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
}

export function groupCrewLivePlans(crewPlans: CrewLivePlan[]): CrewLiveGroup[] {
  const bandGroups = new Map<string, CrewLiveGroup & { kind: 'band' }>();
  const metalPlaceMembers: CrewLivePlan[] = [];
  const campingMembers: CrewLivePlan[] = [];
  const lostMembers: CrewLivePlan[] = [];

  for (const crew of crewPlans) {
    if (crew.isAtMetalPlace) {
      metalPlaceMembers.push(crew);
      continue;
    }

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

    if (crew.isCamping) {
      campingMembers.push(crew);
    } else {
      lostMembers.push(crew);
    }
  }

  const sortMembers = (members: CrewLivePlan[]) =>
    members.sort((a, b) => a.label.localeCompare(b.label));

  const liveBandGroups = [...bandGroups.values()]
    .map((group) => ({
      ...group,
      members: sortMembers(group.members),
    }))
    .sort((a, b) => {
      if (a.band.start_time !== b.band.start_time) {
        return a.band.start_time.localeCompare(b.band.start_time);
      }
      return a.band.name.localeCompare(b.band.name);
    });

  const result: CrewLiveGroup[] = [
    ...liveBandGroups,
    { kind: 'camping', band: null, members: sortMembers(campingMembers) },
    { kind: 'lost', band: null, members: sortMembers(lostMembers) },
  ];

  // Metal Place is conditional: only renders when ≥1 member is checked in.
  // It sits at the end of the crew grid, below the lost card.
  if (metalPlaceMembers.length > 0) {
    result.push({ kind: 'metal_place', band: null, members: sortMembers(metalPlaceMembers) });
  }

  return result;
}

export function formatFestivalTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(new Date(iso));
}
