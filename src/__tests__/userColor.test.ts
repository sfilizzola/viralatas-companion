import { describe, it, expect } from 'vitest';
import { colorForUserId } from '../services/userColor';

describe('colorForUserId', () => {
  it('returns a valid 6-digit hex color', () => {
    expect(colorForUserId('abc123')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('is stable: same id always yields the same color', () => {
    const id = 'b4c1f8a2-1234-4abc-9def-000000000001';
    expect(colorForUserId(id)).toBe(colorForUserId(id));
  });

  it('is deterministic across many ids (no randomness)', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `user-${i}`);
    const first = ids.map(colorForUserId);
    const second = ids.map(colorForUserId);
    expect(first).toEqual(second);
  });

  it('spreads ids across more than one palette color', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `user-${i}`);
    const distinct = new Set(ids.map(colorForUserId));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('handles an empty string without throwing', () => {
    expect(colorForUserId('')).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
