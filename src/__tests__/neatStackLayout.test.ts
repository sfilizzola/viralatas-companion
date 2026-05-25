import { describe, expect, it } from 'vitest';
import type { BadgeConfig } from '../services/badges';
import {
  buildNeatStackPoses,
  computeNeatMetrics,
  NEAT_PATCH_MAX,
  NEAT_PATCH_MIN,
  NEAT_VEST_WIDTH,
  neatRotationDeg,
  neatStackStyle,
} from '../services/badges/neatStackLayout';

function badge(slug: string): BadgeConfig {
  return {
    slug,
    imagePath: `/badges/badge_${slug}.png`,
    labelKey: slug,
    descriptionKey: slug,
    condition: { type: 'assigned' },
  };
}

describe('neatStackLayout', () => {
  it('computeNeatMetrics uses max patch size for small collections', () => {
    expect(computeNeatMetrics(1).patchPx).toBe(NEAT_PATCH_MAX);
    expect(computeNeatMetrics(3).patchPx).toBe(NEAT_PATCH_MAX);
  });

  it('computeNeatMetrics scales down for large collections', () => {
    const m = computeNeatMetrics(22);
    expect(m.patchPx).toBeLessThan(NEAT_PATCH_MAX);
    expect(m.patchPx).toBeGreaterThanOrEqual(NEAT_PATCH_MIN);
    const total = m.patchPx + 21 * (m.patchPx - m.overlapPx);
    expect(total).toBeLessThanOrEqual(NEAT_VEST_WIDTH + 1);
  });

  it('neatRotationDeg stays within 0–5°', () => {
    expect(neatRotationDeg('mud-survivor')).toBeGreaterThanOrEqual(0);
    expect(neatRotationDeg('mud-survivor')).toBeLessThanOrEqual(5);
    expect(neatRotationDeg('mud-survivor')).toBe(neatRotationDeg('mud-survivor'));
  });

  it('buildNeatStackPoses returns one pose per badge with glow z-index boost', () => {
    const badges = [badge('a'), badge('b'), badge('c')];
    const glowing = new Set(['b']);
    const { metrics, poses } = buildNeatStackPoses(badges, glowing);

    expect(poses.size).toBe(3);
    expect(metrics.patchPx).toBe(NEAT_PATCH_MAX);
    expect(poses.get('a')!.marginLeft).toBe(0);
    expect(poses.get('b')!.marginLeft).toBeLessThan(0);
    expect(poses.get('b')!.zIndex).toBeGreaterThan(poses.get('a')!.zIndex);
  });

  it('neatStackStyle exposes pixel dimensions and rotation', () => {
    const style = neatStackStyle({
      patchPx: 36,
      overlapPx: 12,
      marginLeft: -12,
      rotate: 3,
      zIndex: 2,
    });
    expect(style.width).toBe(36);
    expect(style.height).toBe(36);
    expect(style.marginLeft).toBe(-12);
    expect(style.transform).toBe('rotate(3deg)');
    expect(style.zIndex).toBe(2);
  });
});
