import { describe, expect, it } from 'vitest';
import { mergedPersistedBadgeSlugs, persistMetadataPatch } from '../services/badges/persistMetadata';
import type { BadgeConfig } from '../services/badges/types';

function badge(
  slug: string,
  condition: BadgeConfig['condition'],
  persist = true,
): BadgeConfig {
  return {
    slug,
    imagePath: `/badges/${slug}.png`,
    labelKey: slug,
    descriptionKey: `${slug}Description`,
    condition,
    persist,
  };
}

describe('mergedPersistedBadgeSlugs', () => {
  it('merges achieved_badge_slugs and crew_earned_badge_slugs', () => {
    const slugs = mergedPersistedBadgeSlugs({
      achieved_badge_slugs: ['dreamer'],
      crew_earned_badge_slugs: ['lost-together'],
    });
    expect(slugs.has('dreamer')).toBe(true);
    expect(slugs.has('lost-together')).toBe(true);
    expect(slugs.size).toBe(2);
  });

  it('returns empty set when metadata is undefined', () => {
    expect(mergedPersistedBadgeSlugs(undefined).size).toBe(0);
  });
});

describe('persistMetadataPatch', () => {
  it('writes crew location badges to both metadata keys', () => {
    const patch = persistMetadataPatch({}, [
      badge('lost-together', { type: 'crew_at_location_min', location: 'lost', count: 15 }),
    ]);
    expect(patch).toEqual({
      achieved_badge_slugs: ['lost-together'],
      crew_earned_badge_slugs: ['lost-together'],
    });
  });

  it('writes non-crew persist badges only to achieved_badge_slugs', () => {
    const patch = persistMetadataPatch({}, [
      badge('metal-place-2026', { type: 'location_visit_count_min', location: 'metal_place', count: 1 }),
    ]);
    expect(patch).toEqual({ achieved_badge_slugs: ['metal-place-2026'] });
    expect(patch).not.toHaveProperty('crew_earned_badge_slugs');
  });

  it('returns null when slug is already recorded in crew_earned_badge_slugs', () => {
    const patch = persistMetadataPatch(
      { crew_earned_badge_slugs: ['lost-together'] },
      [badge('lost-together', { type: 'crew_at_location_min', location: 'lost', count: 15 })],
    );
    expect(patch).toBeNull();
  });
});
