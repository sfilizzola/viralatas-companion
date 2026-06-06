import { describe, it, expect } from 'vitest';
import { buildStageScheduleSnapshot } from '../services/stageSchedule';
import type { Band } from '../types';

function band(
  id: string,
  name: string,
  stage: string,
  start: string,
  end: string,
): Band {
  return { id, slot_id: id, name, stage, start_time: start, end_time: end, image_url: null, genre: null, category: null };
}

// Reference point: 20:00 UTC on 2026-07-30
const NOW = new Date('2026-07-30T20:00:00Z');

describe('buildStageScheduleSnapshot', () => {
  it('returns current entry when now is within a band window', () => {
    const bands: Band[] = [
      band('1', 'Iron Maiden', 'Faster', '2026-07-30T19:00:00Z', '2026-07-30T21:00:00Z'),
    ];
    const result = buildStageScheduleSnapshot(bands, NOW);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      stage: 'Faster',
      band: bands[0],
      status: 'current',
    });
  });

  it('returns next entry when now is before the next band', () => {
    const bands: Band[] = [
      band('1', 'Slayer', 'Harder', '2026-07-30T21:00:00Z', '2026-07-30T23:00:00Z'),
    ];
    const result = buildStageScheduleSnapshot(bands, NOW);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      stage: 'Harder',
      band: bands[0],
      status: 'next',
    });
  });

  it('excludes stage when all bands have ended', () => {
    const bands: Band[] = [
      band('1', 'Metallica', 'Louder', '2026-07-30T17:00:00Z', '2026-07-30T19:00:00Z'),
    ];
    const result = buildStageScheduleSnapshot(bands, NOW);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(buildStageScheduleSnapshot([], NOW)).toEqual([]);
  });

  it('handles multiple stages independently', () => {
    const bands: Band[] = [
      band('1', 'Iron Maiden', 'Faster', '2026-07-30T19:00:00Z', '2026-07-30T21:00:00Z'), // current
      band('2', 'Slayer', 'Harder', '2026-07-30T21:00:00Z', '2026-07-30T23:00:00Z'),        // next
      band('3', 'Judas Priest', 'Louder', '2026-07-30T17:00:00Z', '2026-07-30T19:00:00Z'), // ended → excluded
    ];
    const result = buildStageScheduleSnapshot(bands, NOW);
    expect(result).toHaveLength(2);
    const stages = result.map((e) => e.stage);
    expect(stages).toContain('Faster');
    expect(stages).toContain('Harder');
    expect(stages).not.toContain('Louder');
    expect(result.find((e) => e.stage === 'Faster')?.status).toBe('current');
    expect(result.find((e) => e.stage === 'Harder')?.status).toBe('next');
  });

  it('returns results sorted by stage name', () => {
    const bands: Band[] = [
      band('1', 'Band Z', 'W.E.T.', '2026-07-30T19:00:00Z', '2026-07-30T21:30:00Z'),
      band('2', 'Band A', 'Faster', '2026-07-30T19:30:00Z', '2026-07-30T21:00:00Z'),
      band('3', 'Band M', 'Harder', '2026-07-30T19:00:00Z', '2026-07-30T21:00:00Z'),
    ];
    const result = buildStageScheduleSnapshot(bands, NOW);
    const stages = result.map((e) => e.stage);
    expect(stages).toEqual([...stages].sort());
  });

  it('picks the latest-starting current band when multiple overlap on a stage', () => {
    // Shouldn't happen in production, but the function must be deterministic
    const earlier = band('1', 'Opener', 'Faster', '2026-07-30T18:00:00Z', '2026-07-30T21:00:00Z');
    const later   = band('2', 'Headliner', 'Faster', '2026-07-30T19:30:00Z', '2026-07-30T21:30:00Z');
    const result = buildStageScheduleSnapshot([earlier, later], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].band.id).toBe('2');
    expect(result[0].status).toBe('current');
  });

  it('picks the closest next band when multiple upcoming exist on a stage', () => {
    const sooner = band('1', 'First Up', 'Harder', '2026-07-30T21:00:00Z', '2026-07-30T22:00:00Z');
    const later  = band('2', 'Second Up', 'Harder', '2026-07-30T23:00:00Z', '2026-07-31T00:00:00Z');
    const result = buildStageScheduleSnapshot([sooner, later], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].band.id).toBe('1');
    expect(result[0].status).toBe('next');
  });
});
