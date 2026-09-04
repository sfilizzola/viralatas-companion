import { describe, it, expect } from 'vitest';
import { sortAnnouncementBands, splitAnnouncementHero } from '../services/announcementLineup';
import type { Band } from '../types';

const b = (id: string, name: string): Band => ({
  id,
  festival_id: 'f',
  slot_id: null,
  name,
  stage: null,
  start_time: null,
  end_time: null,
  image_url: null,
  genre: 'Death Metal',
  category: 'band',
});

describe('sortAnnouncementBands', () => {
  it('sorts count desc then name', () => {
    const rows = [b('2', 'Zed'), b('1', 'Amy'), b('3', 'Bob')];
    const counts = { '1': 2, '2': 5, '3': 5 };
    expect(sortAnnouncementBands(rows, counts).map((x) => x.id)).toEqual(['3', '2', '1']);
  });
});

describe('splitAnnouncementHero', () => {
  it('promotes index 0 when its count >= 1', () => {
    const sorted = [b('g', 'Gojira'), b('s', 'Sabaton')];
    const { hero, rest } = splitAnnouncementHero(sorted, { g: 14, s: 12 });
    expect(hero?.id).toBe('g');
    expect(rest.map((x) => x.id)).toEqual(['s']);
  });

  it('has no hero when every count is 0', () => {
    const sorted = [b('a', 'Amy'), b('z', 'Zed')];
    const { hero, rest } = splitAnnouncementHero(sorted, {});
    expect(hero).toBeNull();
    expect(rest.map((x) => x.id)).toEqual(['a', 'z']);
  });
});
