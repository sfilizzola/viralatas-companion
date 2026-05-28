import type { CSSProperties } from 'react';
import type { BadgeConfig } from './types';

/** Deterministic hash — stable chaos per badge slug */
export function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export type StackPose = {
  left: number;
  top: number;
  rotate: number;
  scale: number;
  zIndex: number;
};

export function stackGrid(total: number): { cols: number; rows: number } {
  const cols = Math.max(3, Math.min(6, Math.ceil(Math.sqrt(total * 1.2))));
  const rows = Math.ceil(total / cols);
  return { cols, rows };
}

/** ~480×112 vest — distance in “physical” space for overlap checks */
export const VEST_WIDTH = 480;
export const VEST_HEIGHT = 112;
export const VEST_ASPECT = VEST_WIDTH / VEST_HEIGHT;
export const STACK_PATCH_PX = 48;
/** Max fraction of the smaller patch diameter that may overlap another. */
export const STACK_MAX_OVERLAP = 0.5;
export const STACK_PLACEMENT_ATTEMPTS = 24;

export function stackCenterDist(
  a: { left: number; top: number },
  b: { left: number; top: number },
): number {
  const dx = (a.left - b.left) / 100;
  const dy = ((a.top - b.top) / 100) * VEST_ASPECT;
  return Math.hypot(dx, dy);
}

/** Pixel distance between patch centers on the vest. */
export function stackPixelDist(
  a: { left: number; top: number },
  b: { left: number; top: number },
): number {
  const dx = ((a.left - b.left) / 100) * VEST_WIDTH;
  const dy = ((a.top - b.top) / 100) * VEST_HEIGHT;
  return Math.hypot(dx, dy);
}

/** Minimum center distance so two scaled patches overlap ≤ STACK_MAX_OVERLAP. */
export function stackMinCenterDistPx(scaleA: number, scaleB: number): number {
  const rA = (STACK_PATCH_PX * scaleA) / 2;
  const rB = (STACK_PATCH_PX * scaleB) / 2;
  const minR = Math.min(rA, rB);
  return rA + rB - STACK_MAX_OVERLAP * 2 * minR;
}

export function stackPoseTooClose(
  a: { left: number; top: number; scale: number },
  b: { left: number; top: number; scale: number },
): boolean {
  return stackPixelDist(a, b) < stackMinCenterDistPx(a.scale, b.scale);
}

export function clampStackPoint(left: number, top: number): { left: number; top: number } {
  return {
    left: Math.max(8, Math.min(92, left)),
    top: Math.max(10, Math.min(90, top)),
  };
}

export function stackPoseDraft(
  slug: string,
  index: number,
  total: number,
  seed: number,
  attempt: number,
): Omit<StackPose, 'zIndex'> {
  const h = hashSlug(`${seed}:${slug}:${index}:${attempt}`);

  const clutter = Math.min(1.35, 0.55 + total * 0.04);

  // Center-out golden spiral — first patch at the heart, pile grows outward
  const centerLeft = 50;
  const centerTop = 50;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const angle =
    index * golden + ((h % 60) - 30) * (Math.PI / 180) * clutter;

  const spread = total <= 1 ? 0 : Math.sqrt(index / (total - 1));
  let radiusX = spread * 36 * clutter;
  let radiusY = radiusX / VEST_ASPECT;

  if (attempt > 0) {
    const push = 1 + attempt * 0.28;
    radiusX *= push;
    radiusY *= push;
  }

  const baseLeft = centerLeft + Math.cos(angle) * radiusX;
  const baseTop = centerTop + Math.sin(angle) * radiusY;

  const jitterScale = 1.2 + spread * 2.4;
  let jitterX =
    ((h % 19) - 9) * (jitterScale * 0.45) + (((h >> 6) % 11) - 5) * 0.35 * clutter;
  let jitterY =
    (((h >> 4) % 19) - 9) * (jitterScale * 0.38) + (((h >> 10) % 11) - 5) * 0.3 * clutter;

  if (attempt > 0) {
    const nudgeAngle = ((h >> 3) % 360) * (Math.PI / 180);
    const push = 4 + attempt * 2;
    jitterX += Math.cos(nudgeAngle) * push;
    jitterY += Math.sin(nudgeAngle) * push * 0.55;
  }

  const { left, top } = clampStackPoint(baseLeft + jitterX, baseTop + jitterY);

  return {
    left,
    top,
    rotate: (h % 111) - 55 + index * 0.2,
    scale: 0.88 + (h % 12) / 100,
  };
}

/** Place all collapsed patches; nudge apart when overlap would exceed STACK_MAX_OVERLAP */
export function buildStackPoses(
  badges: BadgeConfig[],
  seed: number,
  glowing: Set<string>,
): Map<string, StackPose> {
  const poses = new Map<string, StackPose>();
  const placed: { left: number; top: number; scale: number }[] = [];
  const total = badges.length;

  badges.forEach((badge, index) => {
    let chosen = stackPoseDraft(badge.slug, index, total, seed, 0);

    for (let attempt = 0; attempt < STACK_PLACEMENT_ATTEMPTS; attempt++) {
      const draft = stackPoseDraft(badge.slug, index, total, seed, attempt);
      chosen = draft;
      const tooClose = placed.some((p) => stackPoseTooClose(draft, p));
      if (!tooClose) break;
    }

    placed.push({ left: chosen.left, top: chosen.top, scale: chosen.scale });
    poses.set(badge.slug, {
      ...chosen,
      zIndex: index + 1 + (glowing.has(badge.slug) ? 50 : 0),
    });
  });

  return poses;
}

export function stackStyle(pose: StackPose): CSSProperties {
  return {
    ['--stack-left' as string]: `${pose.left}%`,
    ['--stack-top' as string]: `${pose.top}%`,
    ['--stack-rot' as string]: `${pose.rotate}deg`,
    ['--stack-scale' as string]: String(pose.scale),
    zIndex: pose.zIndex,
  };
}
