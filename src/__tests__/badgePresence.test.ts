import { describe, expect, it } from 'vitest';
import type { UserPick } from '../types';
import {
  computeCrewLocationCounts,
  crewLocationCountsFromGroups,
  deriveUserBadgeLocation,
  resolveLiveTestBandId,
} from '../services/livePreview';
import {
  runLiveNowScenario,
  scenarioBand,
  scenarioPick,
  scenarioPresence,
  scenarioUser,
  SCENARIO_NOW,
  threeBandLiveFixture,
} from './fixtures/liveNowScenarios';

describe('deriveUserBadgeLocation', () => {
  it('returns null for friends', () => {
    const { bands, users, picks } = threeBandLiveFixture();
    const result = runLiveNowScenario({
      name: 'friend',
      bands,
      picks,
      users: users.map((u) => (u.id === 'me' ? { ...u, is_friend: true } : u)),
      presence: [],
      focusUserId: 'me',
    });
    expect(deriveUserBadgeLocation('me', result.crewGroups, true)).toBeNull();
  });

  it('returns null when focus user is in a live band group', () => {
    const { bands, users, picks } = threeBandLiveFixture();
    const result = runLiveNowScenario({
      name: 'band watcher',
      bands,
      picks,
      users,
      presence: [scenarioPresence('me', { is_camping: true })],
      focusUserId: 'me',
    });
    expect(result.userGroup?.kind).toBe('band');
    expect(deriveUserBadgeLocation('me', result.crewGroups, false)).toBeNull();
  });

  it('returns camping when grouped in camping without a current band', () => {
    const { bands, users } = threeBandLiveFixture();
    const result = runLiveNowScenario({
      name: 'camper',
      bands,
      picks: [],
      users,
      presence: [scenarioPresence('me', { is_camping: true })],
      focusUserId: 'me',
    });
    expect(result.userGroup?.kind).toBe('camping');
    expect(deriveUserBadgeLocation('me', result.crewGroups, false)).toBe('camping');
  });

  it('returns lost when grouped in lost', () => {
    const { bands, users } = threeBandLiveFixture();
    const result = runLiveNowScenario({
      name: 'lost',
      bands,
      picks: [],
      users,
      presence: [scenarioPresence('me', {})],
      focusUserId: 'me',
    });
    expect(result.userGroup?.kind).toBe('lost');
    expect(deriveUserBadgeLocation('me', result.crewGroups, false)).toBe('lost');
  });

  it('returns metal_place when grouped in metal place', () => {
    const band = scenarioBand('live', '2026-07-29T18:00:00Z', '2026-07-29T21:00:00Z');
    const users = [scenarioUser('me', 'Me')];
    const picks: UserPick[] = [scenarioPick('me', 'live')];
    const result = runLiveNowScenario({
      name: 'metal place',
      bands: [band],
      picks,
      users,
      presence: [scenarioPresence('me', { is_at_metal_place: true })],
      focusUserId: 'me',
      metalPlaceWindowActive: true,
    });
    expect(result.userGroup?.kind).toBe('metal_place');
    expect(deriveUserBadgeLocation('me', result.crewGroups, false)).toBe('metal_place');
  });
});

describe('resolveLiveTestBandId', () => {
  it('returns band_id only when enabled', () => {
    expect(resolveLiveTestBandId({ band_id: 'test-band', enabled: true })).toBe('test-band');
    expect(resolveLiveTestBandId({ band_id: 'test-band', enabled: false })).toBeNull();
    expect(resolveLiveTestBandId({ band_id: 'test-band' })).toBeNull();
    expect(resolveLiveTestBandId(null)).toBeNull();
  });
});

describe('badge presence parity with /now', () => {
  const festivalNow = new Date(SCENARIO_NOW);

  it('currentLocation kind matches findUserCrewGroup for non-friends', () => {
    const { bands, users, picks } = threeBandLiveFixture();
    const focusIds = ['me', 'u1', 'u6'];

    for (const focusUserId of focusIds) {
      const result = runLiveNowScenario({
        name: focusUserId,
        bands,
        picks,
        users,
        presence: focusUserId === 'me' ? [scenarioPresence('me', { is_camping: true })] : [],
        focusUserId,
      });

      const location = deriveUserBadgeLocation(focusUserId, result.crewGroups, false);
      const kind = result.userGroup?.kind;

      if (kind === 'camping') expect(location).toBe('camping');
      else if (kind === 'lost') expect(location).toBe('lost');
      else if (kind === 'metal_place') expect(location).toBe('metal_place');
      else if (kind === 'band') expect(location).toBeNull();
    }
  });

  it('crewLocationCounts match group member lengths', () => {
    const { bands, users, picks } = threeBandLiveFixture();
    const result = runLiveNowScenario({
      name: 'counts',
      bands,
      picks,
      users,
      presence: [],
      focusUserId: 'me',
    });

    const fromGroups = crewLocationCountsFromGroups(result.crewGroups);
    const fromCompute = computeCrewLocationCounts(
      bands,
      picks,
      users,
      [],
      festivalNow,
    );

    expect(fromGroups).toEqual(fromCompute);
    expect(fromGroups.camping).toBe(
      result.crewGroups.find((g) => g.kind === 'camping')?.members.length ?? 0,
    );
    expect(fromGroups.lost).toBe(
      result.crewGroups.find((g) => g.kind === 'lost')?.members.length ?? 0,
    );
  });

  it('disabled live band test does not shift crew counts', () => {
    const band = scenarioBand('test-live', '2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z');
    const users = Array.from({ length: 5 }, (_, i) => scenarioUser(`u${i}`, `U${i}`));
    const picks = users.map((u) => scenarioPick(u.id, 'test-live'));

    const withoutTest = computeCrewLocationCounts([band], picks, users, [], festivalNow, {
      liveTestBandId: null,
    });
    const withDisabledTest = computeCrewLocationCounts([band], picks, users, [], festivalNow, {
      liveTestBandId: resolveLiveTestBandId({ band_id: 'test-live', enabled: false }),
    });

    expect(withDisabledTest).toEqual(withoutTest);
  });

  it('enabled live band test shifts watchers into band groups', () => {
    const band = scenarioBand('test-live', '2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z');
    const users = [scenarioUser('watcher', 'Watcher')];
    const picks = [scenarioPick('watcher', 'test-live')];

    const withoutTest = computeCrewLocationCounts([band], picks, users, [], festivalNow);
    const withTest = computeCrewLocationCounts([band], picks, users, [], festivalNow, {
      liveTestBandId: resolveLiveTestBandId({ band_id: 'test-live', enabled: true }),
    });

    expect(withoutTest.lost).toBe(1);
    expect(withTest.lost).toBe(0);
  });
});
