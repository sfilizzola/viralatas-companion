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
 * Single source of zone geometry. Seeded from the locked calibration prototype
 * (`docs/superpowers/prototypes/minimap-calibrate.html` → `DEFAULT_ZONES`),
 * tuned against `public/infield_map.png`. Phase 35.A only downscaled the asset
 * (framing unchanged), so these fractional values still hold.
 *
 * `elsewhere` sits over the empty LEFT MARGIN of the image so lost/unknown dots
 * never overlap a stage or camping box (Decision 11).
 */
export const MINIMAP_ZONES: Record<ZoneId, FractionalBox> = {
  wasteland:   { x: 0.13, y: 0.06, w: 0.42, h: 0.26 },
  camping:     { x: 0.64, y: 0.06, w: 0.31, h: 0.20 },
  wet:         { x: 0.52, y: 0.31, w: 0.43, h: 0.20 },
  headbangers: { x: 0.40, y: 0.46, w: 0.18, h: 0.10 },
  wackinger:   { x: 0.20, y: 0.40, w: 0.30, h: 0.21 },
  louder:      { x: 0.06, y: 0.66, w: 0.32, h: 0.15 },
  faster:      { x: 0.42, y: 0.84, w: 0.20, h: 0.09 },
  harder:      { x: 0.62, y: 0.79, w: 0.31, h: 0.12 },
  metal_place: { x: 0.04, y: 0.87, w: 0.18, h: 0.09 },
  elsewhere:   { x: 0.00, y: 0.33, w: 0.11, h: 0.50 },
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
