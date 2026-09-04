import { describe, it, expect } from 'vitest';
import {
  announcementFestivals2027,
  buildAnnouncementBandRows,
  validateAnnouncementFestivalSeeds,
} from './announcement-festivals-2027';

describe('announcementFestivals2027 seed', () => {
  it('passes integrity including https image_url on every Band', () => {
    expect(validateAnnouncementFestivalSeeds()).toEqual([]);
  });

  it('locks slugs, counts, and insertable image rows', () => {
    const bySlug = Object.fromEntries(
      announcementFestivals2027.map((festival) => [festival.slug, festival]),
    );
    expect(Object.keys(bySlug).sort()).toEqual([
      'bangers-open-air-2027',
      'epic-fest-2027',
      'rockharz-2027',
      'wacken-2027',
    ]);
    expect(bySlug['wacken-2027'].expectedBandCount).toBe(50);
    expect(bySlug['rockharz-2027'].expectedBandCount).toBe(29);
    expect(bySlug['bangers-open-air-2027'].expectedBandCount).toBe(11);
    expect(bySlug['epic-fest-2027'].expectedBandCount).toBe(22);

    const rows = buildAnnouncementBandRows('fest-1', bySlug['epic-fest-2027'].bands);
    expect(rows).toHaveLength(22);
    expect(rows.every((row) => row.slot_id === null && row.image_url?.startsWith('https://'))).toBe(
      true,
    );
  });
});
