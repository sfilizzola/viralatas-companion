import type { Band, CrewUser, UserPick } from '../types';
import { applyLiveBandTestOverride } from './livePreview';

export type StageRadarStatus = 'live' | 'next' | 'done';

export type StageRadarPicker = {
  userId: string;
  label: string;
  avatar_url: string | null;
};

export type StageRadarEntry = {
  stage: string;
  status: StageRadarStatus;
  band: Band | null;
  pickers: StageRadarPicker[];
  pickerCount: number;
};

function pickerLabel(user: CrewUser): string {
  return user.display_name?.trim() || `Vira-lata ${user.id.slice(0, 4).toUpperCase()}`;
}

function resolveBandForStage(
  stageBands: Band[],
  nowMs: number,
): { status: StageRadarStatus; band: Band | null } {
  const sorted = stageBands.slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
  const currentCandidates = sorted.filter(
    (b) =>
      new Date(b.start_time).getTime() <= nowMs &&
      nowMs < new Date(b.end_time).getTime(),
  );
  const current = currentCandidates.sort((a, b) => b.start_time.localeCompare(a.start_time))[0];
  if (current) return { status: 'live', band: current };

  const next = sorted.find((b) => new Date(b.start_time).getTime() > nowMs);
  if (next) return { status: 'next', band: next };

  return { status: 'done', band: null };
}

function pickersForBand(
  band: Band | null,
  picks: UserPick[],
  crewUsers: CrewUser[],
): StageRadarPicker[] {
  if (!band) return [];
  const ids = new Set(picks.filter((p) => p.band_id === band.id).map((p) => p.user_id));
  return crewUsers
    .filter((u) => ids.has(u.id))
    .map((u) => ({
      userId: u.id,
      label: pickerLabel(u),
      avatar_url: u.avatar_url,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

const STATUS_RANK: Record<StageRadarStatus, number> = { live: 0, next: 1, done: 2 };

export function buildStageRadarSnapshot(
  bands: Band[],
  picks: UserPick[],
  crewUsers: CrewUser[],
  now: Date,
  options?: { liveTestBandId?: string | null },
): StageRadarEntry[] {
  if (bands.length === 0) return [];

  const effective = applyLiveBandTestOverride(bands, options?.liveTestBandId, now);
  const nowMs = now.getTime();
  const stages = [...new Set(effective.map((b) => b.stage))];

  const entries: StageRadarEntry[] = stages.map((stage) => {
    const stageBands = effective.filter((b) => b.stage === stage);
    const { status, band } = resolveBandForStage(stageBands, nowMs);
    const pickers = pickersForBand(band, picks, crewUsers);
    return {
      stage,
      status,
      band,
      pickers,
      pickerCount: pickers.length,
    };
  });

  return entries.sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    if (a.status === 'next' && b.status === 'next') {
      const aStart = a.band?.start_time ?? '';
      const bStart = b.band?.start_time ?? '';
      if (aStart !== bStart) return aStart.localeCompare(bStart);
    }
    return a.stage.localeCompare(b.stage);
  });
}
