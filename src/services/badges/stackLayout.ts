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
export const VEST_ASPECT = 480 / 112;

export function stackCenterDist(
  a: { left: number; top: number },
  b: { left: number; top: number },
): number {
  const dx = (a.left - b.left) / 100;
  const dy = ((a.top - b.top) / 100) * VEST_ASPECT;
  return Math.hypot(dx, dy);
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

  const { cols, rows } = stackGrid(total);
  const row = Math.floor(index / cols);
  const col = index % cols;
  const colsInRow = row === rows - 1 ? total - row * cols : cols;

  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const baseLeft = colsInRow <= 1 ? 50 : (col + 0.5) * (100 / colsInRow);
  const baseTop = rows <= 1 ? 50 : (row + 0.5) * cellH;

  const clutter = Math.min(1.35, 0.55 + total * 0.04);
  let jitterX = ((h % 19) - 9) * (cellW * 0.32 * clutter) + (((h >> 6) % 11) - 5) * 1.6 * clutter;
  let jitterY = (((h >> 4) % 19) - 9) * (cellH * 0.32 * clutter) + (((h >> 10) % 11) - 5) * 1.4 * clutter;

  if (attempt > 0) {
    const angle = ((h >> 3) % 360) * (Math.PI / 180);
    const push = 5 + attempt * 2.2;
    jitterX += Math.cos(angle) * push;
    jitterY += Math.sin(angle) * push * 0.55;
  }

  const { left, top } = clampStackPoint(baseLeft + jitterX, baseTop + jitterY);

  return {
    left,
    top,
    rotate: (h % 111) - 55 + index * 0.2,
    scale: 0.88 + (h % 12) / 100,
  };
}

/** Place all collapsed patches; nudge apart when centers would fully bury a prior one */
export function buildStackPoses(
  badges: BadgeConfig[],
  seed: number,
  glowing: Set<string>,
): Map<string, StackPose> {
  const poses = new Map<string, StackPose>();
  const placed: { left: number; top: number }[] = [];
  const total = badges.length;
  const minDist = Math.max(0.038, 0.072 - total * 0.0015);

  badges.forEach((badge, index) => {
    let chosen = stackPoseDraft(badge.slug, index, total, seed, 0);

    for (let attempt = 0; attempt < 12; attempt++) {
      const draft = stackPoseDraft(badge.slug, index, total, seed, attempt);
      chosen = draft;
      const buried = placed.some((p) => stackCenterDist(draft, p) < minDist);
      if (!buried) break;
    }

    placed.push({ left: chosen.left, top: chosen.top });
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
