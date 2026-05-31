// src/__tests__/metalBattle.test.ts
import { describe, it, expect } from 'vitest';
import { getMetalBattleCountryFlag } from '../services/metalBattle';

describe('getMetalBattleCountryFlag', () => {
  it('converts an ISO-2 slot to the correct flag emoji', () => {
    // WET2 → CY (Cyprus) → 🇨🇾
    expect(getMetalBattleCountryFlag('WET2')).toBe('🇨🇾');
  });

  it('returns 🌍 for a regional entry (Sub Saharan Africa)', () => {
    expect(getMetalBattleCountryFlag('HBA3')).toBe('🌍');
  });

  it('returns 🌍 for a regional entry (Balkan Regions)', () => {
    expect(getMetalBattleCountryFlag('WET13')).toBe('🌍');
  });

  it('returns null for a slot with no confirmed representative', () => {
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
