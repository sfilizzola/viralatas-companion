import { describe, it, expect } from 'vitest';
import {
  assertLiveNowExpectations,
  DEFAULT_METAL_PLACE_CONFIG,
  runLiveNowScenario,
  scenarioPick,
  scenarioPresence,
  scenarioUser,
  threeBandLiveFixture,
} from './fixtures/liveNowScenarios';

describe('liveNowScenarios — multi-band crew snapshot', () => {
  it('groups users across 3 live bands, camping, lost, and metal place', () => {
    const { bands, users, picks } = threeBandLiveFixture();

    const result = runLiveNowScenario({
      name: 'three-band snapshot',
      bands,
      users,
      picks,
      presence: [
        scenarioPresence('u4', { is_camping: true }),
        scenarioPresence('u7', { is_at_metal_place: true }),
      ],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      metalPlaceWindowActive: true,
      focusUserId: 'me',
    });

    assertLiveNowExpectations(result, {
      presenceValue: 'auto',
      myPlanStatus: 'current',
      myGroupKind: 'band',
      myGroupBandId: 'band-b',
      groupKinds: ['band', 'band', 'band', 'camping', 'metal_place', 'lost'],
      groupMemberCounts: {
        'band:band-a': 1,
        'band:band-b': 2,
        'band:band-c': 1,
        camping: 1,
        metal_place: 1,
        lost: 2,
      },
    });
  });
});

describe('liveNowScenarios — presence transitions', () => {
  const { bands } = threeBandLiveFixture();
  const meOnlyPicks = [scenarioPick('me', 'band-next')];

  it('T1: camping → metal place → event ends → lost (camping not restored)', () => {
    const steps = [
      {
        label: 'at camping',
        presence: [scenarioPresence('me', { is_camping: true })],
        metalPlaceWindowActive: true,
        expect: { presenceValue: 'camping' as const, myGroupKind: 'camping' as const },
      },
      {
        label: 'entered metal place',
        presence: [scenarioPresence('me', { is_at_metal_place: true })],
        metalPlaceWindowActive: true,
        expect: { presenceValue: 'metal_place' as const, myGroupKind: 'metal_place' as const },
      },
      {
        label: 'event over — stale MP flag, window inactive',
        presence: [scenarioPresence('me', { is_at_metal_place: true })],
        metalPlaceWindowActive: false,
        expect: { presenceValue: 'auto' as const, myGroupKind: 'lost' as const },
        notInCamping: true,
      },
      {
        label: 'event over — flag cleared after auto-checkout',
        presence: [scenarioPresence('me', {})],
        metalPlaceWindowActive: false,
        expect: { presenceValue: 'auto' as const, myGroupKind: 'lost' as const },
        notInCamping: true,
      },
    ];

    for (const step of steps) {
      const result = runLiveNowScenario({
        name: `T1 ${step.label}`,
        bands,
        users: [scenarioUser('me', 'Me')],
        picks: [],
        presence: step.presence,
        metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
        metalPlaceWindowActive: step.metalPlaceWindowActive,
        focusUserId: 'me',
      });
      assertLiveNowExpectations(result, step.expect);
      if ('notInCamping' in step && step.notInCamping) {
        expect(result.crewGroups.find((group) => group.kind === 'camping')?.members).toEqual([]);
      }
    }
  });

  it('T1b: camping → metal place → manual quit → lost (camping not restored)', () => {
    const atCamping = runLiveNowScenario({
      name: 'T1b camping',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks: [],
      presence: [scenarioPresence('me', { is_camping: true })],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      focusUserId: 'me',
    });
    assertLiveNowExpectations(atCamping, { myGroupKind: 'camping', presenceValue: 'camping' });

    const atMp = runLiveNowScenario({
      name: 'T1b at MP',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks: [],
      presence: [scenarioPresence('me', { is_at_metal_place: true })],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      focusUserId: 'me',
    });
    assertLiveNowExpectations(atMp, { myGroupKind: 'metal_place', presenceValue: 'metal_place' });

    const afterQuit = runLiveNowScenario({
      name: 'T1b quit MP',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks: [],
      presence: [scenarioPresence('me', {})],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      metalPlaceWindowActive: true,
      focusUserId: 'me',
    });
    assertLiveNowExpectations(afterQuit, { myGroupKind: 'lost', presenceValue: 'auto' });
    expect(afterQuit.crewGroups.find((group) => group.kind === 'camping')?.members).toEqual([]);
  });

  it('T2: lost → metal place → leave metal place → lost', () => {
    const atMetalPlace = runLiveNowScenario({
      name: 'T2 enter MP',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks: [],
      presence: [scenarioPresence('me', { is_at_metal_place: true })],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      focusUserId: 'me',
    });
    assertLiveNowExpectations(atMetalPlace, {
      presenceValue: 'metal_place',
      myGroupKind: 'metal_place',
    });

    const afterLeave = runLiveNowScenario({
      name: 'T2 leave MP',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks: [],
      presence: [scenarioPresence('me', {})],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      focusUserId: 'me',
    });
    assertLiveNowExpectations(afterLeave, {
      presenceValue: 'auto',
      myGroupKind: 'lost',
    });
  });

  it('T3: camping → metal place → band goes live → leave MP → band group', () => {
    const campingAtMp = runLiveNowScenario({
      name: 'T3 at MP before band live',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks: meOnlyPicks,
      presence: [scenarioPresence('me', { is_at_metal_place: true })],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      focusUserId: 'me',
    });
    assertLiveNowExpectations(campingAtMp, {
      presenceValue: 'metal_place',
      myGroupKind: 'metal_place',
      myPlanStatus: 'lost',
    });

    const bandLiveStillAtMp = runLiveNowScenario({
      name: 'T3 band live still at MP',
      now: '2026-07-29T21:30:00.000Z',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks: meOnlyPicks,
      presence: [scenarioPresence('me', { is_at_metal_place: true })],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      focusUserId: 'me',
    });
    assertLiveNowExpectations(bandLiveStillAtMp, {
      presenceValue: 'metal_place',
      myGroupKind: 'metal_place',
      myPlanStatus: 'lost',
    });
    expect(bandLiveStillAtMp.myRawPlan.status).toBe('current');
    expect(bandLiveStillAtMp.myPlan.nextBand?.id).toBe('band-next');

    const afterLeaveMp = runLiveNowScenario({
      name: 'T3 leave MP band is live',
      now: '2026-07-29T21:30:00.000Z',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks: meOnlyPicks,
      presence: [scenarioPresence('me', {})],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      focusUserId: 'me',
    });
    assertLiveNowExpectations(afterLeaveMp, {
      presenceValue: 'auto',
      myPlanStatus: 'current',
      myGroupKind: 'band',
      myGroupBandId: 'band-next',
    });
  });

  it('T4: camping with current band → presenceValue auto (camp clears via hook)', () => {
    const { bands, picks } = threeBandLiveFixture();

    const result = runLiveNowScenario({
      name: 'T4 camping + current band',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks,
      presence: [scenarioPresence('me', { is_camping: true })],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      focusUserId: 'me',
    });

    assertLiveNowExpectations(result, {
      presenceValue: 'auto',
      myPlanStatus: 'current',
      myGroupKind: 'band',
      myGroupBandId: 'band-b',
    });
  });

  it('T9: metal place overrides a live picked band (group + focus plan)', () => {
    const { bands, picks } = threeBandLiveFixture();

    const result = runLiveNowScenario({
      name: 'T9 MP overrides live band',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks,
      presence: [scenarioPresence('me', { is_at_metal_place: true })],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      metalPlaceWindowActive: true,
      focusUserId: 'me',
    });

    expect(result.myRawPlan.status).toBe('current');
    expect(result.myRawPlan.band?.id).toBe('band-b');
    assertLiveNowExpectations(result, {
      presenceValue: 'metal_place',
      myPlanStatus: 'lost',
      myGroupKind: 'metal_place',
    });
    expect(result.myPlan.nextBand?.id).toBe('band-b');
    expect(
      result.crewGroups.some(
        (group) =>
          group.kind === 'band' && group.members.some((member) => member.id === 'me'),
      ),
    ).toBe(false);
  });

  it('T5: stale MP flag when event over routes to current band, not MP group', () => {
    const { bands, picks } = threeBandLiveFixture();

    const result = runLiveNowScenario({
      name: 'T5 stale MP flag + live band',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks,
      presence: [scenarioPresence('me', { is_at_metal_place: true })],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      metalPlaceWindowActive: false,
      focusUserId: 'me',
    });

    assertLiveNowExpectations(result, {
      presenceValue: 'auto',
      myPlanStatus: 'current',
      myGroupKind: 'band',
      myGroupBandId: 'band-b',
    });
    expect(result.crewGroups.some((group) => group.kind === 'metal_place')).toBe(false);
  });

  it('T7: stale MP flag when event over routes to lost when no live band', () => {
    const result = runLiveNowScenario({
      name: 'T7 stale MP flag + no picks',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks: [],
      presence: [scenarioPresence('me', { is_at_metal_place: true })],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      metalPlaceWindowActive: false,
      focusUserId: 'me',
    });

    assertLiveNowExpectations(result, {
      presenceValue: 'auto',
      myPlanStatus: 'lost',
      myGroupKind: 'lost',
    });
    expect(result.crewGroups.some((group) => group.kind === 'metal_place')).toBe(false);
    expect(result.crewGroups.find((group) => group.kind === 'camping')?.members).toEqual([]);
  });

  it('T8: stale MP flag when event over routes to lost when only a future pick exists', () => {
    const result = runLiveNowScenario({
      name: 'T8 stale MP flag + next band only',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks: meOnlyPicks,
      presence: [scenarioPresence('me', { is_at_metal_place: true })],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      metalPlaceWindowActive: false,
      focusUserId: 'me',
    });

    assertLiveNowExpectations(result, {
      presenceValue: 'auto',
      myPlanStatus: 'lost',
      myGroupKind: 'lost',
    });
    expect(result.myPlan.nextBand?.id).toBe('band-next');
    expect(result.crewGroups.some((group) => group.kind === 'metal_place')).toBe(false);
  });

  it('T6: friend not on a current band is invisible in camping and lost', () => {
    const { bands } = threeBandLiveFixture();

    const result = runLiveNowScenario({
      name: 'T6 friend hidden',
      bands,
      users: [
        scenarioUser('friend', 'Friend', true),
        scenarioUser('lost-user', 'Lost'),
      ],
      picks: [],
      presence: [
        scenarioPresence('friend', { is_camping: true }),
      ],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      focusUserId: 'friend',
    });

    const friendGroup = result.userGroup;
    expect(friendGroup).toBeNull();

    const lostGroup = result.crewGroups.find((group) => group.kind === 'lost');
    expect(lostGroup?.members.map((member) => member.id)).toEqual(['lost-user']);
    expect(result.crewGroups.find((group) => group.kind === 'camping')?.members).toEqual([]);
  });
});

describe('liveNowScenarios — derivePresenceValue branches', () => {
  it('returns metal_place, camping, and auto for the three branches', () => {
    const { bands, picks } = threeBandLiveFixture();

    const metalPlace = runLiveNowScenario({
      name: 'derive metal_place',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks: [],
      presence: [scenarioPresence('me', { is_at_metal_place: true })],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      focusUserId: 'me',
    });
    expect(metalPlace.presenceValue).toBe('metal_place');

    const camping = runLiveNowScenario({
      name: 'derive camping',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks: [],
      presence: [scenarioPresence('me', { is_camping: true })],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      focusUserId: 'me',
    });
    expect(camping.presenceValue).toBe('camping');

    const auto = runLiveNowScenario({
      name: 'derive auto',
      bands,
      users: [scenarioUser('me', 'Me')],
      picks,
      presence: [scenarioPresence('me', {})],
      metalPlaceConfig: DEFAULT_METAL_PLACE_CONFIG,
      focusUserId: 'me',
    });
    expect(auto.presenceValue).toBe('auto');
  });
});
