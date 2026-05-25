import type { CSSProperties } from 'react';
import type { BadgeConfig } from './types';
import { hashSlug } from './stackLayout';

export const NEAT_VEST_WIDTH = 480;
export const NEAT_PATCH_MAX = 48;
export const NEAT_PATCH_MIN = 28;
/** Overlap fraction — each badge shows ~65% of its width (≥40% peek target). */
export const NEAT_OVERLAP_RATIO = 0.35;
/** Max overlap when at min patch size before enabling horizontal scroll. */
export const NEAT_MAX_OVERLAP_RATIO = 0.6;

export type NeatStackPose = {
  patchPx: number;
  overlapPx: number;
  marginLeft: number;
  rotate: number;
  zIndex: number;
};

export type NeatLayoutMetrics = {
  patchPx: number;
  overlapPx: number;
  needsScroll: boolean;
};

export function computeNeatMetrics(count: number): NeatLayoutMetrics {
  if (count <= 0) {
    return { patchPx: NEAT_PATCH_MAX, overlapPx: 0, needsScroll: false };
  }
  if (count === 1) {
    return { patchPx: NEAT_PATCH_MAX, overlapPx: 0, needsScroll: false };
  }

  const strideFactor = 1 - NEAT_OVERLAP_RATIO;
  let patchPx = NEAT_VEST_WIDTH / (1 + (count - 1) * strideFactor);
  patchPx = Math.min(NEAT_PATCH_MAX, Math.max(NEAT_PATCH_MIN, patchPx));

  let overlapPx = patchPx * NEAT_OVERLAP_RATIO;
  let totalWidth = patchPx + (count - 1) * (patchPx - overlapPx);

  if (totalWidth > NEAT_VEST_WIDTH && patchPx <= NEAT_PATCH_MIN) {
    overlapPx = patchPx * NEAT_MAX_OVERLAP_RATIO;
    totalWidth = patchPx + (count - 1) * (patchPx - overlapPx);
  }

  const needsScroll = totalWidth > NEAT_VEST_WIDTH;
  return { patchPx, overlapPx, needsScroll };
}

export function neatRotationDeg(slug: string): number {
  return hashSlug(slug) % 6;
}

export function buildNeatStackPoses(
  badges: BadgeConfig[],
  glowing: Set<string>,
): { metrics: NeatLayoutMetrics; poses: Map<string, NeatStackPose> } {
  const metrics = computeNeatMetrics(badges.length);
  const poses = new Map<string, NeatStackPose>();

  badges.forEach((badge, index) => {
    poses.set(badge.slug, {
      patchPx: metrics.patchPx,
      overlapPx: metrics.overlapPx,
      marginLeft: index === 0 ? 0 : -metrics.overlapPx,
      rotate: neatRotationDeg(badge.slug),
      zIndex: index + 1 + (glowing.has(badge.slug) ? 50 : 0),
    });
  });

  return { metrics, poses };
}

export function neatStackStyle(pose: NeatStackPose): CSSProperties {
  return {
    width: pose.patchPx,
    height: pose.patchPx,
    marginLeft: pose.marginLeft,
    transform: `rotate(${pose.rotate}deg)`,
    zIndex: pose.zIndex,
  };
}
