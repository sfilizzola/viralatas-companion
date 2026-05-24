import { describe, expect, it } from 'vitest';
import type { BadgeConfig } from '../services/badges';
import {
  buildStackPoses,
  clampStackPoint,
  hashSlug,
  stackCenterDist,
  stackGrid,
  stackStyle,
  VEST_ASPECT,
} from '../services/badges/stackLayout';

function badge(slug: string): BadgeConfig {
  return {
    slug,
    imagePath: `/badges/badge_${slug}.png`,
    labelKey: slug,
    descriptionKey: slug,
    condition: { type: 'assigned' },
  };
}

describe('stackLayout', () => {
  it('hashSlug is deterministic for the same input', () => {
    expect(hashSlug('mud-survivor')).toBe(hashSlug('mud-survivor'));
    expect(hashSlug('a')).not.toBe(hashSlug('b'));
  });

  it('stackGrid scales columns with badge count', () => {
    expect(stackGrid(1)).toEqual({ cols: 3, rows: 1 });
    expect(stackGrid(9).cols).toBeGreaterThanOrEqual(3);
    expect(stackGrid(9).rows).toBeGreaterThanOrEqual(1);
  });

  it('clampStackPoint keeps coordinates inside vest bounds', () => {
    expect(clampStackPoint(0, 0)).toEqual({ left: 8, top: 10 });
    expect(clampStackPoint(100, 100)).toEqual({ left: 92, top: 90 });
  });

  it('stackCenterDist respects vest aspect ratio on vertical axis', () => {
    const horizontal = stackCenterDist({ left: 50, top: 50 }, { left: 60, top: 50 });
    const vertical = stackCenterDist({ left: 50, top: 50 }, { left: 50, top: 60 });
    expect(vertical).toBeGreaterThan(horizontal);
    expect(VEST_ASPECT).toBeCloseTo(480 / 112);
  });

  it('buildStackPoses returns one pose per badge with z-index boost for glowing', () => {
    const badges = [badge('a'), badge('b'), badge('c')];
    const glowing = new Set(['b']);
    const poses = buildStackPoses(badges, 42, glowing);

    expect(poses.size).toBe(3);
    for (const b of badges) {
      const pose = poses.get(b.slug)!;
      expect(pose.left).toBeGreaterThanOrEqual(8);
      expect(pose.left).toBeLessThanOrEqual(92);
      expect(pose.top).toBeGreaterThanOrEqual(10);
      expect(pose.top).toBeLessThanOrEqual(90);
      expect(pose.scale).toBeGreaterThanOrEqual(0.88);
      expect(pose.scale).toBeLessThan(1);
    }
    expect(poses.get('b')!.zIndex).toBeGreaterThan(poses.get('a')!.zIndex);
  });

  it('buildStackPoses is stable for the same seed', () => {
    const badges = [badge('x'), badge('y'), badge('z')];
    const first = buildStackPoses(badges, 99, new Set());
    const second = buildStackPoses(badges, 99, new Set());
    for (const b of badges) {
      expect(first.get(b.slug)).toEqual(second.get(b.slug));
    }
  });

  it('stackStyle maps pose to CSS custom properties', () => {
    const style = stackStyle({
      left: 40,
      top: 55,
      rotate: -12,
      scale: 0.95,
      zIndex: 3,
    }) as Record<string, string | number>;
    expect(style['--stack-left']).toBe('40%');
    expect(style['--stack-top']).toBe('55%');
    expect(style['--stack-rot']).toBe('-12deg');
    expect(style['--stack-scale']).toBe('0.95');
    expect(style.zIndex).toBe(3);
  });
});
