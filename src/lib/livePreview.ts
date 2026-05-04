import type { Band, CrewUser, UserPick } from '../types';

export type LivePlanStatus = 'current' | 'next' | 'empty';

export type LivePlan = {
  status: LivePlanStatus;
  band: Band | null;
};

export type CrewLivePlan = CrewUser & {
  label: string;
  plan: LivePlan;
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

export function mapCrewLivePlans(
  bands: Band[],
  picks: UserPick[],
  users: CrewUser[],
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

  return [...usersById.values()]
    .map((user) => ({
      ...user,
      label: user.display_name?.trim() || `Crew ${user.id.slice(0, 4).toUpperCase()}`,
      plan: findLivePlan(bands, picksByUser.get(user.id) ?? new Set(), now),
    }))
    .sort((a, b) => {
      const aTime = a.plan.band?.start_time ?? '';
      const bTime = b.plan.band?.start_time ?? '';
      if (aTime && bTime && aTime !== bTime) return aTime.localeCompare(bTime);
      if (aTime !== bTime) return aTime ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
}

export function formatFestivalTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(new Date(iso));
}
