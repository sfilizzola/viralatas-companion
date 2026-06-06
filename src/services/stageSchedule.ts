import type { Band } from '../types';

export type StageScheduleEntry = {
  stage: string;
  band: Band;
  status: 'current' | 'next';
};

export function buildStageScheduleSnapshot(
  bands: Band[],
  now: Date,
): StageScheduleEntry[] {
  const nowMs = now.getTime();
  const stages = [...new Set(bands.map((b) => b.stage))];
  const entries: StageScheduleEntry[] = [];

  for (const stage of stages) {
    const stageBands = bands
      .filter((b) => b.stage === stage)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    const currentCandidates = stageBands.filter(
      (b) =>
        new Date(b.start_time).getTime() <= nowMs &&
        nowMs < new Date(b.end_time).getTime(),
    );
    const current = currentCandidates.sort((a, b) =>
      b.start_time.localeCompare(a.start_time),
    )[0];

    if (current) {
      entries.push({ stage, band: current, status: 'current' });
      continue;
    }

    const next = stageBands.find((b) => new Date(b.start_time).getTime() > nowMs);
    if (next) {
      entries.push({ stage, band: next, status: 'next' });
    }
  }

  return entries.sort((a, b) => a.stage.localeCompare(b.stage));
}
