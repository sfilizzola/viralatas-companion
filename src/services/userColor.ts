/**
 * Stable, deterministic fallback color for a vira-lata's avatar dot (used when
 * they have no `avatar_url`). Same id always yields the same color; spread
 * across a fixed metal-friendly palette so adjacent dots stay distinguishable.
 *
 * Hash mirrors `services/badges/stackLayout.ts` (`Math.imul(31, h) + charCode`)
 * for consistency with the existing deterministic-hash convention.
 */
const PALETTE = [
  '#c0392b', // accent red
  '#2980b9', // blue
  '#27ae60', // green
  '#8e44ad', // purple
  '#e67e22', // orange
  '#16a085', // teal
  '#d35400', // burnt orange
  '#7cb342', // lime
  '#c2185b', // magenta
  '#5d6d7e', // slate
] as const;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function colorForUserId(id: string): string {
  return PALETTE[hashId(id) % PALETTE.length];
}
