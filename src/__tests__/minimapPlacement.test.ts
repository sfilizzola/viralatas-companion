import { describe, it, expect } from 'vitest';
import { buildPlacements } from '../services/minimapPlacement';
import { MINIMAP_ZONES, type ZoneId } from '../components/map/minimapZones';
import type { CrewLiveGroup, CrewLivePlan } from '../services/livePreview';
import type { Band } from '../types';

function member(id: string, overrides: Partial<CrewLivePlan> = {}): CrewLivePlan {
  return {
    id,
    display_name: null,
    avatar_url: null,
    is_friend: false,
    label: `Vira-lata ${id.slice(0, 4).toUpperCase()}`,
    plan: { status: 'current', band: null },
    isCamping: false,
    isAtMetalPlace: false,
    isFriend: false,
    ...overrides,
  };
}

function band(stage: string): Band {
  return {
    id: `band-${stage}`,
    slot_id: `S-${stage}`,
    name: `Band ${stage}`,
    stage,
    start_time: '2026-07-29T18:00:00Z',
    end_time: '2026-07-29T19:00:00Z',
    image_url: null,
    genre: null,
    category: 'band',
  };
}

function bandGroup(stage: string, members: CrewLivePlan[]): CrewLiveGroup {
  return { kind: 'band', band: band(stage), members };
}

function nonBandGroup(
  kind: 'camping' | 'metal_place' | 'lost',
  members: CrewLivePlan[],
): CrewLiveGroup {
  return { kind, band: null, members };
}

function expectInsideZone(xPct: number, yPct: number, zone: ZoneId) {
  const box = MINIMAP_ZONES[zone];
  expect(xPct).toBeGreaterThanOrEqual(box.x * 100);
  expect(xPct).toBeLessThanOrEqual((box.x + box.w) * 100);
  expect(yPct).toBeGreaterThanOrEqual(box.y * 100);
  expect(yPct).toBeLessThanOrEqual((box.y + box.h) * 100);
}

describe('buildPlacements — group → zone mapping', () => {
  it('maps each band stage to its zone', () => {
    const cases: Array<[string, ZoneId]> = [
      ['Faster', 'faster'],
      ['Harder', 'harder'],
      ['Louder', 'louder'],
      ['W.E.T.', 'wet'],
      ['Headbangers', 'headbangers'],
      ['Wasteland', 'wasteland'],
      ['Wackinger', 'wackinger'],
    ];
    for (const [stage, zone] of cases) {
      const [p] = buildPlacements([bandGroup(stage, [member('u1')])], MINIMAP_ZONES, null);
      expect(p.zone).toBe(zone);
    }
  });

  it('maps Welcome to the Jungle to the Wasteland zone (Decision 6)', () => {
    const [p] = buildPlacements(
      [bandGroup('Welcome to the Jungle', [member('u1')])],
      MINIMAP_ZONES,
      null,
    );
    expect(p.zone).toBe('wasteland');
  });

  it('maps an unknown stage to the elsewhere zone', () => {
    const [p] = buildPlacements([bandGroup('Atlantik', [member('u1')])], MINIMAP_ZONES, null);
    expect(p.zone).toBe('elsewhere');
  });

  it('maps camping / metal_place / lost group kinds to their zones', () => {
    const camping = buildPlacements([nonBandGroup('camping', [member('c1')])], MINIMAP_ZONES, null);
    const metal = buildPlacements(
      [nonBandGroup('metal_place', [member('m1')])],
      MINIMAP_ZONES,
      null,
    );
    const lost = buildPlacements([nonBandGroup('lost', [member('l1')])], MINIMAP_ZONES, null);
    expect(camping[0].zone).toBe('camping');
    expect(metal[0].zone).toBe('metal_place');
    expect(lost[0].zone).toBe('elsewhere');
  });

  it('places lost dots in the empty LEFT-MARGIN elsewhere box (Decision 11)', () => {
    const placements = buildPlacements(
      [nonBandGroup('lost', [member('l1'), member('l2'), member('l3')])],
      MINIMAP_ZONES,
      null,
    );
    const box = MINIMAP_ZONES.elsewhere;
    expect(box.x).toBe(0); // pinned to the left edge
    for (const p of placements) {
      expect(p.zone).toBe('elsewhere');
      // never overlaps a stage box: stays within the narrow left margin
      expect(p.xPct).toBeLessThanOrEqual((box.x + box.w) * 100);
      expectInsideZone(p.xPct, p.yPct, 'elsewhere');
    }
  });
});

describe('buildPlacements — layout geometry', () => {
  it('keeps every coordinate inside its zone box', () => {
    const members = Array.from({ length: 12 }, (_, i) => member(`u${i}`));
    const placements = buildPlacements([bandGroup('Louder', members)], MINIMAP_ZONES, null);
    expect(placements).toHaveLength(12);
    for (const p of placements) expectInsideZone(p.xPct, p.yPct, 'louder');
  });

  it('produces N distinct coordinates for N members (no full overlap)', () => {
    const members = Array.from({ length: 14 }, (_, i) => member(`u${i}`));
    const placements = buildPlacements([bandGroup('Wasteland', members)], MINIMAP_ZONES, null);
    const coords = new Set(placements.map((p) => `${p.xPct.toFixed(4)},${p.yPct.toFixed(4)}`));
    expect(coords.size).toBe(14);
  });

  it('lays out members sharing a zone together (Jungle + Wasteland) without overlap', () => {
    const placements = buildPlacements(
      [
        bandGroup('Wasteland', [member('a'), member('b')]),
        bandGroup('Welcome to the Jungle', [member('c'), member('d')]),
      ],
      MINIMAP_ZONES,
      null,
    );
    expect(placements).toHaveLength(4);
    expect(placements.every((p) => p.zone === 'wasteland')).toBe(true);
    const coords = new Set(placements.map((p) => `${p.xPct.toFixed(4)},${p.yPct.toFixed(4)}`));
    expect(coords.size).toBe(4);
  });
});

describe('buildPlacements — self handling', () => {
  it('flags the current user and orders the self dot LAST', () => {
    const groups = [
      bandGroup('Faster', [member('a'), member('me'), member('z')]),
      nonBandGroup('camping', [member('c1')]),
    ];
    const placements = buildPlacements(groups, MINIMAP_ZONES, 'me');
    const selfPlacements = placements.filter((p) => p.isSelf);
    expect(selfPlacements).toHaveLength(1);
    expect(selfPlacements[0].userId).toBe('me');
    expect(placements[placements.length - 1].userId).toBe('me');
  });

  it('flags nobody when selfUserId is null', () => {
    const placements = buildPlacements(
      [bandGroup('Faster', [member('a'), member('b')])],
      MINIMAP_ZONES,
      null,
    );
    expect(placements.some((p) => p.isSelf)).toBe(false);
  });
});

describe('buildPlacements — is_friend semantics (Decision 10)', () => {
  it('does not filter friends out of band groups (no extra filtering)', () => {
    const placements = buildPlacements(
      [bandGroup('Harder', [member('friend', { isFriend: true, is_friend: true }), member('reg')])],
      MINIMAP_ZONES,
      null,
    );
    expect(placements.map((p) => p.userId).sort()).toEqual(['friend', 'reg']);
  });
});

describe('buildPlacements — placement fields', () => {
  it('uses label as displayName and falls back to colored avatar when no avatar_url', () => {
    const [p] = buildPlacements(
      [bandGroup('Faster', [member('u1', { label: 'Fê', avatar_url: null })])],
      MINIMAP_ZONES,
      null,
    );
    expect(p.displayName).toBe('Fê');
    expect(p.avatarUrl).toBeNull();
    expect(p.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('passes through an existing avatar_url', () => {
    const [p] = buildPlacements(
      [bandGroup('Faster', [member('u1', { avatar_url: 'https://x/y.png' })])],
      MINIMAP_ZONES,
      null,
    );
    expect(p.avatarUrl).toBe('https://x/y.png');
  });
});

describe('buildPlacements — determinism', () => {
  it('returns identical output for identical input', () => {
    const groups = () => [
      bandGroup('Faster', [member('a'), member('b'), member('c')]),
      nonBandGroup('lost', [member('x'), member('y')]),
    ];
    const first = buildPlacements(groups(), MINIMAP_ZONES, 'b');
    const second = buildPlacements(groups(), MINIMAP_ZONES, 'b');
    expect(first).toEqual(second);
  });

  it('is independent of group iteration order within a shared zone', () => {
    const m = [member('a'), member('b'), member('c'), member('d')];
    const forward = buildPlacements(
      [bandGroup('Wasteland', [m[0], m[1]]), bandGroup('Welcome to the Jungle', [m[2], m[3]])],
      MINIMAP_ZONES,
      null,
    );
    const reversed = buildPlacements(
      [bandGroup('Welcome to the Jungle', [m[2], m[3]]), bandGroup('Wasteland', [m[0], m[1]])],
      MINIMAP_ZONES,
      null,
    );
    const key = (ps: typeof forward) =>
      ps
        .map((p) => `${p.userId}:${p.xPct.toFixed(4)},${p.yPct.toFixed(4)}`)
        .sort()
        .join('|');
    expect(key(forward)).toBe(key(reversed));
  });
});
