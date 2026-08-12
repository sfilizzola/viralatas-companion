import { describe, it, expect } from 'vitest';
import { buildStageRadarSnapshot } from '../services/stageRadar';
import type { Band, CrewUser, UserPick } from '../types';

function band(
  id: string,
  name: string,
  stage: string,
  start: string,
  end: string,
): Band {
  return {
    id,
    festival_id: 'summer-breeze-2026',
    slot_id: id,
    name,
    stage,
    start_time: start,
    end_time: end,
    image_url: null,
    genre: null,
    category: null,
  };
}

function crew(id: string, display_name: string | null): CrewUser {
  return { id, display_name, avatar_url: null, wacken_arrival_day: null, is_friend: false };
}

function pick(user_id: string, band_id: string): UserPick {
  return {
    user_id,
    band_id,
    festival_id: 'summer-breeze-2026',
    created_at: '2026-01-01T00:00:00Z',
  };
}

const NOW = new Date('2026-07-30T20:00:00Z');

describe('buildStageRadarSnapshot', () => {
  it('marks playing band as live and includes pickers from crew roster', () => {
    const live = band('1', 'Iron Maiden', 'Main Stage', '2026-07-30T19:00:00Z', '2026-07-30T21:00:00Z');
    const users = [crew('u1', 'Ana'), crew('u2', 'Bruno')];
    const picks = [pick('u1', '1'), pick('u2', '1')];
    const result = buildStageRadarSnapshot([live], picks, users, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('live');
    expect(result[0].band?.id).toBe('1');
    expect(result[0].pickerCount).toBe(2);
    expect(result[0].pickers.map((p) => p.label).sort()).toEqual(['Ana', 'Bruno']);
  });

  it('marks upcoming band as next', () => {
    const upcoming = band('2', 'Slayer', 'T-Stage', '2026-07-30T21:00:00Z', '2026-07-30T23:00:00Z');
    const result = buildStageRadarSnapshot([upcoming], [], [], NOW);
    expect(result[0].status).toBe('next');
    expect(result[0].pickerCount).toBe(0);
  });

  it('emits done when all bands on a stage have ended', () => {
    const ended = band('3', 'Metallica', 'Campsite Circus Stage', '2026-07-30T17:00:00Z', '2026-07-30T19:00:00Z');
    const result = buildStageRadarSnapshot([ended], [pick('u1', '3')], [crew('u1', 'Ana')], NOW);
    expect(result).toEqual([
      expect.objectContaining({
        stage: 'Campsite Circus Stage',
        status: 'done',
        band: null,
        pickerCount: 0,
        pickers: [],
      }),
    ]);
  });

  it('always returns one row per distinct stage (live + next + done together)', () => {
    const bands = [
      band('1', 'Iron Maiden', 'Main Stage', '2026-07-30T19:00:00Z', '2026-07-30T21:00:00Z'),
      band('2', 'Slayer', 'T-Stage', '2026-07-30T21:00:00Z', '2026-07-30T23:00:00Z'),
      band('3', 'Old Act', 'Wera Tool Rebel Stage', '2026-07-30T17:00:00Z', '2026-07-30T19:00:00Z'),
    ];
    const result = buildStageRadarSnapshot(bands, [], [], NOW);
    expect(result.map((e) => e.status)).toEqual(['live', 'next', 'done']);
  });

  it('sorts live first, then next by start_time, then done by stage name', () => {
    const bands = [
      band('d2', 'Done B', 'Z Stage', '2026-07-30T10:00:00Z', '2026-07-30T11:00:00Z'),
      band('d1', 'Done A', 'A Stage', '2026-07-30T10:00:00Z', '2026-07-30T11:00:00Z'),
      band('n2', 'Later', 'M Stage', '2026-07-30T23:00:00Z', '2026-07-31T00:00:00Z'),
      band('n1', 'Sooner', 'B Stage', '2026-07-30T21:00:00Z', '2026-07-30T22:00:00Z'),
      band('l1', 'Live', 'C Stage', '2026-07-30T19:00:00Z', '2026-07-30T21:00:00Z'),
    ];
    const result = buildStageRadarSnapshot(bands, [], [], NOW);
    expect(result.map((e) => e.stage)).toEqual([
      'C Stage',
      'B Stage',
      'M Stage',
      'A Stage',
      'Z Stage',
    ]);
  });

  it('counts only crew roster members who picked the live/next band', () => {
    const live = band('1', 'Iron Maiden', 'Main Stage', '2026-07-30T19:00:00Z', '2026-07-30T21:00:00Z');
    const users = [crew('u1', 'Ana')];
    const picks = [pick('u1', '1'), pick('stranger', '1')];
    const result = buildStageRadarSnapshot([live], picks, users, NOW);
    expect(result[0].pickerCount).toBe(1);
    expect(result[0].pickers[0].userId).toBe('u1');
  });

  it('returns empty array when bands is empty', () => {
    expect(buildStageRadarSnapshot([], [], [], NOW)).toEqual([]);
  });

  it('applies live-band test override so that stage becomes live', () => {
    const target = band('t1', 'Test Band', 'Main Stage', '2026-08-01T12:00:00Z', '2026-08-01T13:00:00Z');
    const result = buildStageRadarSnapshot([target], [], [], NOW, { liveTestBandId: 't1' });
    expect(result[0].status).toBe('live');
    expect(result[0].band?.id).toBe('t1');
  });
});
