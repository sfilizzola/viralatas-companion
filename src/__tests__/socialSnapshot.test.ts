import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));
import { buildSocialSnapshot } from '../services/socialSnapshot';
import { computeCrewLocationCounts } from '../services/livePreview';
import {
  SCENARIO_NOW,
  threeBandLiveFixture,
} from './fixtures/liveNowScenarios';

describe('buildSocialSnapshot', () => {
  const festivalNow = new Date(SCENARIO_NOW);

  it('null metal place config → metalPlaceWindowActive false, camping+lost groups only', () => {
    const snap = buildSocialSnapshot({
      bands: [],
      picks: [],
      crewUsers: [],
      presence: [],
      metalPlaceConfig: null,
      liveBandTestConfig: null,
      now: festivalNow,
    });

    expect(snap.metalPlaceWindowActive).toBe(false);
    expect(snap.liveTestBandId).toBeNull();
    expect(snap.crewGroups).toHaveLength(2);
    expect(snap.crewGroups.map((g) => g.kind)).toEqual(['camping', 'lost']);
    expect(snap.crewGroups.find((g) => g.kind === 'metal_place')).toBeUndefined();
  });

  it('crewLocationCounts match computeCrewLocationCounts for three-band roster', () => {
    const { bands, users, picks } = threeBandLiveFixture();
    const snap = buildSocialSnapshot({
      bands,
      picks,
      crewUsers: users,
      presence: [],
      metalPlaceConfig: null,
      liveBandTestConfig: null,
      now: festivalNow,
    });

    const fromCompute = computeCrewLocationCounts(
      bands,
      picks,
      users,
      [],
      festivalNow,
    );

    expect(snap.crewLocationCounts).toEqual(fromCompute);
    expect(snap.crewLocationCounts.camping).toBe(
      snap.crewGroups.find((g) => g.kind === 'camping')?.members.length ?? 0,
    );
    expect(snap.crewLocationCounts.lost).toBe(
      snap.crewGroups.find((g) => g.kind === 'lost')?.members.length ?? 0,
    );
  });
});
