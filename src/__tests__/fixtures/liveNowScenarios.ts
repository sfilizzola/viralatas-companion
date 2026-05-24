import { expect } from 'vitest';
import type { Band, CrewUser, MetalPlaceConfig, UserPick, UserPresence } from '../../types';
import type { CrewGroupKind, LivePlanStatus, PresenceLocation } from '../../services/livePreview';
import {
  applyPresenceToLivePlan,
  derivePresenceValue,
  findLivePlan,
  findUserCrewGroup,
  groupCrewLivePlans,
  mapCrewLivePlans,
  resolveFocusUserLivePlan,
} from '../../services/livePreview';

export const SCENARIO_NOW = '2026-07-29T20:00:00.000Z';

export function scenarioBand(
  id: string,
  start: string,
  end: string,
  overrides: Partial<Band> = {},
): Band {
  return {
    id,
    name: overrides.name ?? `Band ${id}`,
    stage: overrides.stage ?? 'Faster',
    start_time: start,
    end_time: end,
    image_url: null,
    genre: null,
    category: 'band',
    ...overrides,
  };
}

export function scenarioUser(
  id: string,
  displayName: string,
  isFriend = false,
): CrewUser {
  return { id, display_name: displayName, avatar_url: null, is_friend: isFriend ? true : null };
}

export function scenarioPick(userId: string, bandId: string): UserPick {
  return { user_id: userId, band_id: bandId, created_at: '2026-05-01T00:00:00Z' };
}

export function scenarioPresence(
  userId: string,
  flags: { is_camping?: boolean; is_at_metal_place?: boolean },
): UserPresence {
  return {
    user_id: userId,
    is_camping: flags.is_camping ?? false,
    is_at_metal_place: flags.is_at_metal_place ?? false,
    updated_at: SCENARIO_NOW,
  };
}

/** Three concurrent live bands + one future band for next-only users. */
export function threeBandLiveFixture() {
  const bands = [
    scenarioBand('band-a', '2026-07-29T18:00:00Z', '2026-07-29T21:00:00Z', { name: 'Grand Magus' }),
    scenarioBand('band-b', '2026-07-29T18:30:00Z', '2026-07-29T21:30:00Z', { name: 'Airbourne' }),
    scenarioBand('band-c', '2026-07-29T19:00:00Z', '2026-07-29T22:00:00Z', { name: 'Municipal Waste' }),
    scenarioBand('band-next', '2026-07-29T21:00:00Z', '2026-07-29T22:30:00Z', { name: 'Running Wild' }),
  ];

  const users = [
    scenarioUser('u1', 'Alice'),
    scenarioUser('u2', 'Bob'),
    scenarioUser('u3', 'Carlos'),
    scenarioUser('u4', 'Dani'),
    scenarioUser('u5', 'Erik'),
    scenarioUser('u6', 'Fede'),
    scenarioUser('u7', 'Gabi'),
    scenarioUser('me', 'Me'),
  ];

  const picks = [
    scenarioPick('u1', 'band-a'),
    scenarioPick('u2', 'band-b'),
    scenarioPick('u3', 'band-c'),
    scenarioPick('u6', 'band-next'),
    scenarioPick('me', 'band-b'),
  ];

  return { bands, users, picks };
}

export const DEFAULT_METAL_PLACE_CONFIG: MetalPlaceConfig = {
  id: 1,
  festival_day: 1,
  start_time: '18:00',
  end_time: '23:59',
  test_override_day: 1,
};

export type LiveNowScenarioExpect = {
  presenceValue?: PresenceLocation;
  myPlanStatus?: LivePlanStatus;
  myGroupKind?: CrewGroupKind;
  myGroupBandId?: string | null;
  groupKinds?: CrewGroupKind[];
  groupMemberCounts?: Record<string, number>;
};

export type LiveNowScenarioInput = {
  name: string;
  now?: string;
  bands: Band[];
  picks: UserPick[];
  users: CrewUser[];
  presence: UserPresence[];
  metalPlaceConfig?: MetalPlaceConfig | null;
  metalPlaceWindowActive?: boolean;
  focusUserId: string;
  liveTestBandId?: string | null;
};

export type LiveNowScenarioResult = {
  crewPlans: ReturnType<typeof mapCrewLivePlans>;
  crewGroups: ReturnType<typeof groupCrewLivePlans>;
  myRawPlan: ReturnType<typeof findLivePlan>;
  myPlan: ReturnType<typeof resolveFocusUserLivePlan>;
  presenceValue: PresenceLocation;
  userGroup: ReturnType<typeof findUserCrewGroup>;
  metalPlaceWindowActive: boolean;
};

export function runLiveNowScenario(input: LiveNowScenarioInput): LiveNowScenarioResult {
  const now = new Date(input.now ?? SCENARIO_NOW);
  const metalPlaceWindowActive = input.metalPlaceWindowActive ?? true;

  const crewPlans = mapCrewLivePlans(
    input.bands,
    input.picks,
    input.users,
    input.presence,
    now,
    input.liveTestBandId,
  );
  const crewGroups = groupCrewLivePlans(crewPlans, { metalPlaceWindowActive });

  const focusPicks = new Set(
    input.picks.filter((pick) => pick.user_id === input.focusUserId).map((pick) => pick.band_id),
  );
  const myPresence = input.presence.find((item) => item.user_id === input.focusUserId);
  const myRawPlan = findLivePlan(input.bands, focusPicks, now, input.liveTestBandId);
  const myPlan = resolveFocusUserLivePlan(myRawPlan, myPresence, metalPlaceWindowActive);
  const presenceValue = derivePresenceValue(myPresence, myRawPlan, metalPlaceWindowActive);
  const userGroup = findUserCrewGroup(input.focusUserId, crewGroups);

  return {
    crewPlans,
    crewGroups,
    myRawPlan,
    myPlan,
    presenceValue,
    userGroup,
    metalPlaceWindowActive,
  };
}

export function groupKindKey(group: { kind: CrewGroupKind; band?: Band | null }): string {
  return group.kind === 'band' ? `band:${group.band?.id}` : group.kind;
}

export function assertLiveNowExpectations(
  result: LiveNowScenarioResult,
  expected: LiveNowScenarioExpect,
) {
  if (expected.presenceValue !== undefined) {
    expect(result.presenceValue).toBe(expected.presenceValue);
  }
  if (expected.myPlanStatus !== undefined) {
    expect(result.myPlan.status).toBe(expected.myPlanStatus);
  }
  if (expected.myGroupKind !== undefined) {
    expect(result.userGroup?.kind).toBe(expected.myGroupKind);
  }
  if (expected.myGroupBandId !== undefined) {
    const bandId =
      result.userGroup?.kind === 'band' ? (result.userGroup.band?.id ?? null) : null;
    expect(bandId).toBe(expected.myGroupBandId);
  }
  if (expected.groupKinds !== undefined) {
    expect(result.crewGroups.map((group) => group.kind)).toEqual(expected.groupKinds);
  }
  if (expected.groupMemberCounts !== undefined) {
    for (const [key, count] of Object.entries(expected.groupMemberCounts)) {
      const group = result.crewGroups.find((item) => groupKindKey(item) === key);
      expect(group?.members.length ?? 0).toBe(count);
    }
  }
}
