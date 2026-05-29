import type { CrewLiveGroup, CrewLivePlan } from './livePreview';
import {
  groupKindToZone,
  stageToZone,
  type FractionalBox,
  type ZoneId,
} from '../components/map/minimapZones';
import { colorForUserId } from './userColor';

export type Placement = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  color: string;
  xPct: number; // 0..100, fraction of image width
  yPct: number; // 0..100, fraction of image height
  zone: ZoneId;
  isSelf: boolean;
};

const INSET = 0.16;
const GOLDEN_ANGLE = 2.399963; // ~137.5° in radians

/**
 * Deterministic phyllotaxis (sunflower-spiral) layout inside a fractional box —
 * ported verbatim from the locked calibration prototype. `n` evenly-spread,
 * non-overlapping points; an `INSET` margin keeps dots on the artwork even when
 * the rectangle isn't pixel-tight against an angled trapezoid zone.
 */
function layoutInBox(box: FractionalBox, n: number): Array<{ xPct: number; yPct: number }> {
  const out: Array<{ xPct: number; yPct: number }> = [];
  for (let i = 0; i < n; i++) {
    const r = 0.5 * Math.sqrt((i + 0.5) / Math.max(n, 1));
    const a = i * GOLDEN_ANGLE;
    let fx = 0.5 + Math.cos(a) * r;
    let fy = 0.5 + Math.sin(a) * r;
    fx = INSET + fx * (1 - 2 * INSET);
    fy = INSET + fy * (1 - 2 * INSET);
    out.push({
      xPct: (box.x + fx * box.w) * 100,
      yPct: (box.y + fy * box.h) * 100,
    });
  }
  return out;
}

function zoneForGroup(group: CrewLiveGroup): ZoneId {
  return group.kind === 'band' ? stageToZone(group.band.stage) : groupKindToZone(group.kind);
}

/**
 * Derive avatar placements over the minimap from the same `crewGroups` that
 * power `/now`. Pure + deterministic: no Supabase, no clock, no randomness.
 *
 * - `is_friend` semantics are inherited unchanged from `crewGroups` (friends are
 *   already only present in `band` groups, absent from camping/metal_place/lost),
 *   so no extra filtering happens here (Decision 10).
 * - Members sharing a zone (e.g. Welcome to the Jungle + Wasteland, or several
 *   `lost` users in `elsewhere`) are laid out together so dots never fully occlude.
 * - The current user is flagged `isSelf` and ordered LAST so the overlay can
 *   render it on top, never buried (Decision 12).
 */
export function buildPlacements(
  crewGroups: CrewLiveGroup[],
  zones: Record<ZoneId, FractionalBox>,
  selfUserId: string | null | undefined,
): Placement[] {
  const membersByZone = new Map<ZoneId, CrewLivePlan[]>();
  for (const group of crewGroups) {
    const zone = zoneForGroup(group);
    const bucket = membersByZone.get(zone);
    if (bucket) {
      bucket.push(...group.members);
    } else {
      membersByZone.set(zone, [...group.members]);
    }
  }

  const placements: Placement[] = [];
  for (const [zone, members] of membersByZone) {
    // Stable order keyed by userId so layout slots are independent of group
    // iteration order and deterministic across re-renders.
    const ordered = [...members].sort((a, b) => a.id.localeCompare(b.id));
    const coords = layoutInBox(zones[zone], ordered.length);
    ordered.forEach((member, i) => {
      placements.push({
        userId: member.id,
        displayName: member.label,
        avatarUrl: member.avatar_url ?? null,
        color: colorForUserId(member.id),
        xPct: coords[i].xPct,
        yPct: coords[i].yPct,
        zone,
        isSelf: !!selfUserId && member.id === selfUserId,
      });
    });
  }

  // Self last (top z-index). Array.prototype.sort is stable, so the relative
  // order of all other dots is preserved.
  placements.sort((a, b) => Number(a.isSelf) - Number(b.isSelf));
  return placements;
}
