// src/__tests__/metalBattle.test.ts
import { describe, it, expect } from 'vitest';
import { getMetalBattleCountryFlag } from '../services/metalBattle';

describe('getMetalBattleCountryFlag', () => {
  it('converts an ISO-2 slot to the correct flag emoji', () => {
    // WET2 → CY (Cyprus) → 🇨🇾
    expect(getMetalBattleCountryFlag('WET2')).toBe('🇨🇾');
  });

  it('returns 🇿🇦 for HBA3 (South Africa — Human Nebula)', () => {
    expect(getMetalBattleCountryFlag('HBA3')).toBe('🇿🇦');
  });

  it('returns 🇭🇷 for WET13 (Croatia — E.N.D.)', () => {
    expect(getMetalBattleCountryFlag('WET13')).toBe('🇭🇷');
  });

  it('returns 🇸🇰 for HBA14 (Slovakia — Gagor)', () => {
    expect(getMetalBattleCountryFlag('HBA14')).toBe('🇸🇰');
  });

  it('returns null for a slot absent from the map (WET23 award ceremony)', () => {
    // WET23 is Day 3 TBA — not in the map
    expect(getMetalBattleCountryFlag('WET23')).toBeNull();
  });

  it('returns null for a non-Metal-Battle slot', () => {
    expect(getMetalBattleCountryFlag('FAS1')).toBeNull();
  });

  it('returns correct flag for a TBA slot whose country is known (HBA1 USA)', () => {
    expect(getMetalBattleCountryFlag('HBA1')).toBe('🇺🇸');
  });

  it('returns correct flag for HBA18 (Switzerland)', () => {
    expect(getMetalBattleCountryFlag('HBA18')).toBe('🇨🇭');
  });
});
