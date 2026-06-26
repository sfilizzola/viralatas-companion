import type { CampLocation } from '../types';

export type CampCoordinateParseError =
  | 'invalid_format'
  | 'invalid_latitude'
  | 'invalid_longitude';

export type CampCoordinateParseResult =
  | { ok: true; value: CampLocation }
  | { ok: false; error: CampCoordinateParseError };

function normalizeInput(raw: string): string {
  const trimmed = raw.trim();
  const pair = trimmed.match(/^(.+?),\s+(.+)$/);
  if (!pair) return trimmed;
  const normalizeNumber = (part: string) => part.trim().replace(/,/g, '.');
  return `${normalizeNumber(pair[1])},${normalizeNumber(pair[2])}`;
}

export function parseCampCoordinateInput(raw: string): CampCoordinateParseResult {
  const normalized = normalizeInput(raw);
  const parts = normalized.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 2) return { ok: false, error: 'invalid_format' };

  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'invalid_format' };
  }
  if (lat < -90 || lat > 90) return { ok: false, error: 'invalid_latitude' };
  if (lng < -180 || lng > 180) return { ok: false, error: 'invalid_longitude' };

  return { ok: true, value: { lat, lng } };
}

export function buildCampMapsUrl(location: CampLocation): string {
  return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
}

export function formatCampCoordinates(location: CampLocation): string {
  return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
}

export function openCampInMaps(location: CampLocation): void {
  window.open(buildCampMapsUrl(location), '_blank', 'noopener,noreferrer');
}

export function isCampLocation(
  value: { lat: number | null; lng: number | null } | null | undefined,
): value is CampLocation {
  return value != null && value.lat != null && value.lng != null;
}
