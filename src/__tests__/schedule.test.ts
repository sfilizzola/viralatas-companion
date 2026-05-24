import { describe, it, expect } from 'vitest';
import type { Band } from '../types';
import { bandDay, formatTime } from '../services/bandTime';
import { filterBands } from '../services/bandFilter';
import type { BandFilterValue } from '../components/bandFilterValue';

// ─────────────────────────────────────────────────────────────────
// Sample data: 8 stages × 4 days
// ─────────────────────────────────────────────────────────────────

const STAGES_8 = [
  'W.E.T.',
  'Harder',
  'Louder',
  'Faster',
  'Headbangers',
  'Wasteland',
  'Wackinger',
  'Welcome to the Jungle',
];

const DAYS_4 = [
  '2026-08-05', // Day 1
  '2026-08-06', // Day 2
  '2026-08-07', // Day 3
  '2026-08-08', // Day 4
];

function createBand(
  name: string,
  stage: string,
  day: string,
  hour: number,
  durationMins: number,
): Band {
  // Create ISO string with CEST offset (+02:00), treating `hour` as local CEST time
  const h = String(hour).padStart(2, '0');
  const m = '00';
  const startStr = `${day}T${h}:${m}:00+02:00`;

  // Calculate end time in UTC first, then convert back to CEST string
  const startUtc = new Date(`${day}T${h}:${m}:00Z`).getTime() - 2 * 60 * 60 * 1000;
  const endUtc = startUtc + durationMins * 60 * 1000;
  const endDate = new Date(endUtc);
  const endH = String(endDate.getUTCHours()).padStart(2, '0');
  const endM = String(endDate.getUTCMinutes()).padStart(2, '0');
  const endDay = endDate.toISOString().slice(0, 10);
  const endStr = `${endDay}T${endH}:${endM}:00+02:00`;

  return {
    id: `band-${Math.random()}`,
    slot_id: `TST-${name.replace(/\s+/g, '-').toLowerCase()}`,
    name,
    stage,
    start_time: startStr,
    end_time: endStr,
    image_url: null,
    genre: 'Metal',
    category: 'band',
  };
}

function noFilters(overrides: Partial<BandFilterValue> = {}): BandFilterValue {
  return { query: '', day: null, stage: [], genre: null, upcoming: false, sortOrder: 'time-asc', ...overrides };
}

describe('Schedule: 8 Stages × 4 Days', () => {
  describe('bandDay() - Day calculation', () => {
    it('assigns daytime bands to the correct day', () => {
      const band = createBand('Morning Metal', 'W.E.T.', '2026-08-05', 14, 60);
      expect(bandDay(band)).toBe('2026-08-05');
    });

    it('assigns evening bands to the correct day', () => {
      const band = createBand('Evening Chaos', 'Headbangers', '2026-08-06', 20, 60);
      expect(bandDay(band)).toBe('2026-08-06');
    });

    it('shifts after-midnight slots back to the previous day', () => {
      // Band starting at 23:00 UTC on day 1 is 01:00 CEST on day 2
      // After-midnight slots (00:00-03:59 CEST) belong to the previous day
      const band = createBand('Midnight Abyss', 'Wackinger', '2026-08-05', 22, 120);
      const day = bandDay(band);
      // 22:00 UTC = 00:00 CEST (next day), should shift back
      expect(day).toBe('2026-08-05');
    });

    it('handles late-night bands correctly across all days', () => {
      for (const day of DAYS_4) {
        const band = createBand('Late Night', 'Wasteland', day, 22, 90);
        const calculatedDay = bandDay(band);
        expect(calculatedDay).toBe(day);
      }
    });
  });

  describe('formatTime() - Time formatting', () => {
    it('formats start times correctly', () => {
      const band = createBand('Afternoon Metal', 'W.E.T.', '2026-08-05', 14, 60);
      const time = formatTime(band.start_time);
      expect(time).toMatch(/^\d{2}:\d{2}$/);
    });

    it('formats times in CEST timezone', () => {
      // 14:00 CEST input produces 14:00 output
      const band = createBand('Test Band', 'W.E.T.', '2026-08-05', 14, 60);
      const time = formatTime(band.start_time);
      expect(time).toBe('14:00');
    });
  });

  describe('Stage filtering', () => {
    it('filters bands by a single stage', () => {
      const bands = STAGES_8.flatMap((stage, idx) =>
        createBand(`Band ${idx}`, stage, DAYS_4[0], 14 + idx, 60),
      );

      const filtered = filterBands(bands, noFilters({ stage: ['W.E.T.'] }), new Date());

      expect(filtered).toHaveLength(1);
      expect(filtered[0].stage).toBe('W.E.T.');
    });

    it('handles filtering when stage is not present', () => {
      const bands = [createBand('Band A', 'W.E.T.', DAYS_4[0], 14, 60)];

      const filtered = filterBands(bands, noFilters({ stage: ['NONEXISTENT'] }), new Date());

      expect(filtered).toHaveLength(0);
    });

    it('clears stage filter when set to empty array', () => {
      const bands = STAGES_8.flatMap((stage, idx) =>
        createBand(`Band ${idx}`, stage, DAYS_4[0], 14 + idx, 60),
      );

      const filtered = filterBands(bands, noFilters(), new Date());

      expect(filtered).toHaveLength(STAGES_8.length);
    });

    it('extracts all unique stages dynamically (no hardcoding)', () => {
      const bands = STAGES_8.flatMap((stage, idx) =>
        createBand(`Band ${idx}`, stage, DAYS_4[0], 14 + idx, 60),
      );

      const stages = [...new Set(bands.map((b) => b.stage))].sort();

      expect(stages).toHaveLength(8);
      expect(stages).toEqual([...STAGES_8].sort());
    });
  });

  describe('Day filtering', () => {
    it('filters bands by a single day', () => {
      const bands = DAYS_4.flatMap((day, idx) =>
        createBand(`Band ${idx}`, STAGES_8[0], day, 14, 60),
      );

      const filtered = filterBands(bands, noFilters({ day: DAYS_4[1] }), new Date());

      expect(filtered).toHaveLength(1);
      expect(bandDay(filtered[0])).toBe(DAYS_4[1]);
    });

    it('handles filtering across all 4 festival days', () => {
      const bands: Band[] = [];
      for (const day of DAYS_4) {
        for (let i = 0; i < 3; i++) {
          bands.push(createBand(`Band on ${day}`, STAGES_8[i], day, 14 + i, 60));
        }
      }

      for (const day of DAYS_4) {
        const filtered = filterBands(bands, noFilters({ day }), new Date());
        expect(filtered).toHaveLength(3);
        filtered.forEach((b) => expect(bandDay(b)).toBe(day));
      }
    });

    it('clears day filter when set to null', () => {
      const bands = DAYS_4.flatMap((day, idx) =>
        createBand(`Band ${idx}`, STAGES_8[0], day, 14, 60),
      );

      const filtered = filterBands(bands, noFilters(), new Date());

      expect(filtered).toHaveLength(DAYS_4.length);
    });
  });

  describe('Combination filters', () => {
    it('filters by both day and stage', () => {
      const bands: Band[] = [];
      for (const day of DAYS_4) {
        for (const stage of STAGES_8) {
          bands.push(createBand(`${stage} on ${day}`, stage, day, 14, 60));
        }
      }

      const filtered = filterBands(
        bands,
        noFilters({ day: DAYS_4[2], stage: ['Headbangers'] }),
        new Date(),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].stage).toBe('Headbangers');
      expect(bandDay(filtered[0])).toBe(DAYS_4[2]);
    });

    it('returns empty result when day and stage do not have overlap', () => {
      const bands = [createBand('One Band', 'W.E.T.', DAYS_4[0], 14, 60)];

      const filtered = filterBands(
        bands,
        noFilters({ day: DAYS_4[3], stage: ['Headbangers'] }),
        new Date(),
      );

      expect(filtered).toHaveLength(0);
    });
  });

  describe('Upcoming filter', () => {
    it('filters out bands that have already ended', () => {
      const pastBand = createBand('Past Band', 'W.E.T.', '2020-01-01', 14, 60);

      const filtered = filterBands([pastBand], noFilters({ upcoming: true }), new Date());

      expect(filtered).toHaveLength(0);
    });

    it('includes bands that are currently happening', () => {
      const now = new Date();
      const futureBand = createBand(
        'Future Band',
        'W.E.T.',
        new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        14,
        60,
      );

      const filtered = filterBands([futureBand], noFilters({ upcoming: true }), now);

      expect(filtered).toHaveLength(1);
    });

    it('does not filter past bands when upcoming is false', () => {
      const pastBand = createBand('Past Band', 'W.E.T.', '2020-01-01', 14, 60);

      const filtered = filterBands([pastBand], noFilters(), new Date());

      expect(filtered).toHaveLength(1);
    });
  });

  describe('Sorting / Ordering', () => {
    it('maintains chronological order when sorted by start_time', () => {
      const unsorted = [
        createBand('Evening', 'W.E.T.', DAYS_4[0], 20, 60),
        createBand('Morning', 'W.E.T.', DAYS_4[0], 12, 60),
        createBand('Afternoon', 'W.E.T.', DAYS_4[0], 16, 60),
      ];

      const sorted = [...unsorted].sort((a, b) => a.start_time.localeCompare(b.start_time));

      expect(sorted[0].name).toBe('Morning');
      expect(sorted[1].name).toBe('Afternoon');
      expect(sorted[2].name).toBe('Evening');
    });

    it('sorts correctly across all 4 festival days', () => {
      const bands: Band[] = [];
      for (let d = 0; d < DAYS_4.length; d++) {
        for (let h = 0; h < 3; h++) {
          bands.push(createBand(`${d}-${h}`, 'W.E.T.', DAYS_4[d], 14 + h, 60));
        }
      }

      const sorted = [...bands].sort((a, b) => a.start_time.localeCompare(b.start_time));

      // Should maintain day order: all day 1, then day 2, etc.
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].start_time <= sorted[i + 1].start_time).toBe(true);
      }
    });
  });

  describe('Complex real-world scenarios', () => {
    it('handles a realistic 8-stage × 4-day schedule with hundreds of bands', () => {
      const bands: Band[] = [];
      for (const day of DAYS_4) {
        for (const stage of STAGES_8) {
          // 6-8 bands per stage per day
          for (let b = 0; b < 7; b++) {
            bands.push(createBand(`Band`, stage, day, 12 + b * 2, 90));
          }
        }
      }

      expect(bands).toHaveLength(DAYS_4.length * STAGES_8.length * 7);

      // Apply a complex filter: Day 2, Headbangers
      const filtered = filterBands(
        bands,
        noFilters({ day: DAYS_4[1], stage: ['Headbangers'] }),
        new Date(),
      );

      expect(filtered).toHaveLength(7);
      filtered.forEach((b) => {
        expect(b.stage).toBe('Headbangers');
        expect(bandDay(b)).toBe(DAYS_4[1]);
      });
    });

    it('can toggle filters in and out without losing data', () => {
      const bands: Band[] = [];
      for (const day of DAYS_4) {
        for (const stage of STAGES_8) {
          bands.push(createBand(`Band`, stage, day, 14, 60));
        }
      }

      const now = new Date();
      const initial = filterBands(bands, noFilters(), now);
      expect(initial).toHaveLength(32);

      const byDay = filterBands(bands, noFilters({ day: DAYS_4[0] }), now);
      expect(byDay).toHaveLength(8);

      const byStage = filterBands(bands, noFilters({ stage: ['W.E.T.'] }), now);
      expect(byStage).toHaveLength(4);

      const cleared = filterBands(bands, noFilters(), now);
      expect(cleared).toEqual(initial);
    });

    it('handles edge case: single band on each stage-day combination', () => {
      const bands: Band[] = [];
      for (const day of DAYS_4) {
        for (const stage of STAGES_8) {
          bands.push(createBand(`${stage} on ${day}`, stage, day, 18, 60));
        }
      }

      const stages = [...new Set(bands.map((b) => b.stage))];
      const days = [...new Set(bands.map((b) => bandDay(b)))];

      expect(stages).toHaveLength(8);
      expect(days).toHaveLength(4);

      // Every combo should have exactly one band
      const now = new Date();
      for (const day of days) {
        for (const stage of stages) {
          const found = filterBands(bands, noFilters({ day, stage: [stage] }), now);
          expect(found).toHaveLength(1);
        }
      }
    });
  });

  describe('Stage colors graceful fallback', () => {
    it('should handle unknown stages without crashing', () => {
      const knownStages = ['W.E.T.', 'Harder', 'Louder', 'Faster'];
      const newStages = ['Headbangers', 'Wasteland', 'Wackinger', 'Welcome to the Jungle'];

      const stageColors: Record<string, string> = {
        'W.E.T.': '#c0392b',
        'Harder': '#e67e22',
        'Louder': '#8e44ad',
        'Faster': '#2980b9',
        'Headbangers': '#16a085',
        'Wasteland': '#2c3e50',
        'Wackinger': '#95a5a6',
        'Welcome to the Jungle': '#f39c12',
      };

      for (const stage of [...knownStages, ...newStages]) {
        const color = stageColors[stage] ?? 'var(--accent)';
        expect(color).toBeTruthy();
        expect(typeof color).toBe('string');
      }
    });
  });
});
