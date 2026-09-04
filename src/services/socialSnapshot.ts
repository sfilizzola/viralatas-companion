import type { Band, CrewUser, LiveBandTestConfig, MetalPlaceConfig, UserPick, UserPresence } from '../types';
import {
  crewLocationCountsFromGroups,
  groupCrewLivePlans,
  mapCrewLivePlans,
  resolveLiveTestBandId,
  type CrewLiveGroup,
  type CrewLivePlan,
} from './livePreview';
import { isMetalPlaceWindowActive } from './presencePolicy';
import type { Festival } from '../types/festival';

export type SocialSnapshotInput = {
  bands: Band[];
  picks: UserPick[];
  crewUsers: CrewUser[];
  presence: UserPresence[];
  metalPlaceConfig: MetalPlaceConfig | null;
  liveBandTestConfig: LiveBandTestConfig | null;
  festival: Festival | null | undefined;
  now: Date;
};

export type SocialSnapshot = {
  metalPlaceWindowActive: boolean;
  liveTestBandId: string | null;
  crewPlans: CrewLivePlan[];
  crewGroups: CrewLiveGroup[];
  crewLocationCounts: Record<'camping' | 'metal_place' | 'lost', number>;
};

export function buildSocialSnapshot(input: SocialSnapshotInput): SocialSnapshot {
  const metalPlaceWindowActive = isMetalPlaceWindowActive(input.metalPlaceConfig, input.now);
  const liveTestBandId = resolveLiveTestBandId(input.liveBandTestConfig);
  const crewPlans = mapCrewLivePlans(
    input.bands,
    input.picks,
    input.crewUsers,
    input.presence,
    input.now,
    input.festival,
    liveTestBandId,
  );
  const crewGroups = groupCrewLivePlans(crewPlans, { metalPlaceWindowActive });
  return {
    metalPlaceWindowActive,
    liveTestBandId,
    crewPlans,
    crewGroups,
    crewLocationCounts: crewLocationCountsFromGroups(crewGroups),
  };
}
