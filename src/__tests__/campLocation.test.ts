import { describe, expect, it, vi } from 'vitest';
import {
  buildCampMapsUrl,
  formatCampCoordinates,
  openCampInMaps,
  parseCampCoordinateInput,
} from '../services/campLocation';

describe('parseCampCoordinateInput', () => {
  it('parses comma-separated coords with spaces', () => {
    expect(parseCampCoordinateInput('54.037809, 9.368845')).toEqual({
      ok: true,
      value: { lat: 54.037809, lng: 9.368845 },
    });
  });

  it('normalizes decimal commas', () => {
    expect(parseCampCoordinateInput('54,037809, 9,368845')).toEqual({
      ok: true,
      value: { lat: 54.037809, lng: 9.368845 },
    });
  });

  it('rejects out-of-range latitude', () => {
    expect(parseCampCoordinateInput('91, 9')).toEqual({ ok: false, error: 'invalid_latitude' });
  });

  it('rejects out-of-range longitude', () => {
    expect(parseCampCoordinateInput('54, 181')).toEqual({ ok: false, error: 'invalid_longitude' });
  });

  it('rejects single value', () => {
    expect(parseCampCoordinateInput('54.03')).toEqual({ ok: false, error: 'invalid_format' });
  });

  it('rejects empty', () => {
    expect(parseCampCoordinateInput('  ')).toEqual({ ok: false, error: 'invalid_format' });
  });
});

describe('buildCampMapsUrl', () => {
  it('builds universal Google Maps search URL', () => {
    expect(buildCampMapsUrl({ lat: 54.037809, lng: 9.368845 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=54.037809,9.368845',
    );
  });
});

describe('formatCampCoordinates', () => {
  it('formats to 6 decimal places', () => {
    expect(formatCampCoordinates({ lat: 54.037809, lng: 9.368845 })).toBe('54.037809, 9.368845');
  });
});

describe('openCampInMaps', () => {
  it('opens URL in new tab', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    openCampInMaps({ lat: 54, lng: 9 });
    expect(open).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=54,9',
      '_blank',
      'noopener,noreferrer',
    );
    open.mockRestore();
  });
});
