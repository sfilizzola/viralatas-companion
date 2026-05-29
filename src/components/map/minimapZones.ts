import type { CrewGroupKind } from '../../services/livePreview';

/** The ten labelled regions of the festival minimap. */
export type ZoneId =
  | 'faster'
  | 'harder'
  | 'louder'
  | 'wet'
  | 'headbangers'
  | 'wasteland'
  | 'wackinger'
  | 'camping'
  | 'metal_place'
  | 'elsewhere';

/** Inset bounding box as fractions (0..1) of the map image. */
export type FractionalBox = { x: number; y: number; w: number; h: number };

/**
 * Single source of zone geometry. Seeded from the calibration prototype, then
 * fine-tuned against `public/infield_map.png` via the dev `/map?calibrate`
 * harness (visual sign-off, Phase 35.C) so each box hugs its stage artwork.
 *
 * `elsewhere` sits over the empty LEFT MARGIN of the image so lost/unknown dots
 * never overlap a stage or camping box (Decision 11).
 */
export const MINIMAP_ZONES: Record<ZoneId, FractionalBox> = {
  wasteland:   { x: 0.340, y: 0.183, w: 0.264, h: 0.164 },
  camping:     { x: 0.682, y: 0.029, w: 0.292, h: 0.283 },
  wet:         { x: 0.621, y: 0.527, w: 0.337, h: 0.177 },
  headbangers: { x: 0.547, y: 0.322, w: 0.429, h: 0.189 },
  wackinger:   { x: 0.278, y: 0.465, w: 0.260, h: 0.194 },
  louder:      { x: 0.038, y: 0.703, w: 0.406, h: 0.155 },
  faster:      { x: 0.480, y: 0.750, w: 0.203, h: 0.242 },
  harder:      { x: 0.698, y: 0.740, w: 0.225, h: 0.244 },
  metal_place: { x: 0.014, y: 0.886, w: 0.289, h: 0.114 },
  elsewhere:   { x: 0.020, y: 0.258, w: 0.215, h: 0.435 },
};
/**
 * Canonical `bands.stage` string → map zone. Welcome to the Jungle shares the
 * Wasteland box (Decision 6); any unrecognized stage falls back to `elsewhere`.
 */
const STAGE_TO_ZONE: Record<string, ZoneId> = {
  Faster: 'faster',
  Harder: 'harder',
  Louder: 'louder',
  'W.E.T.': 'wet',
  Headbangers: 'headbangers',
  Wasteland: 'wasteland',
  Wackinger: 'wackinger',
  'Welcome to the Jungle': 'wasteland',
};

export function stageToZone(stage: string): ZoneId {
  return STAGE_TO_ZONE[stage] ?? 'elsewhere';
}

/** Non-band group kind → map zone. `lost` lands in the left-margin `elsewhere` box. */
export function groupKindToZone(kind: Exclude<CrewGroupKind, 'band'>): ZoneId {
  switch (kind) {
    case 'camping':
      return 'camping';
    case 'metal_place':
      return 'metal_place';
    case 'lost':
      return 'elsewhere';
  }
}
