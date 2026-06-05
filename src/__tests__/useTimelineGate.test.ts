import { describe, it, expect } from 'vitest';
import { getActiveWindow } from '../hooks/useTimelineGate';

describe('getActiveWindow', () => {
  it('returns null before the festival', () => {
    expect(getActiveWindow(new Date('2026-07-28T14:00:00+02:00'))).toBeNull();
  });

  it('returns null on D1 before 10:00', () => {
    expect(getActiveWindow(new Date('2026-07-29T09:59:00+02:00'))).toBeNull();
  });

  it('returns the D1 window at 10:00 exactly', () => {
    const result = getActiveWindow(new Date('2026-07-29T10:00:00+02:00'));
    expect(result).not.toBeNull();
    expect(result!.start.toISOString()).toBe(new Date('2026-07-29T10:00:00+02:00').toISOString());
    expect(result!.end.toISOString()).toBe(new Date('2026-07-30T03:00:00+02:00').toISOString());
  });

  it('returns the D1 window in the middle of D1 night (01:00 next cal day)', () => {
    // HAR3 ends at 00:00, some bands go to 02:15 — 01:30 on Jul 30 is still D1 window
    const result = getActiveWindow(new Date('2026-07-30T01:30:00+02:00'));
    expect(result).not.toBeNull();
    expect(result!.start.toISOString()).toBe(new Date('2026-07-29T10:00:00+02:00').toISOString());
  });

  it('returns null between D1 and D2 (03:01 to 09:59)', () => {
    expect(getActiveWindow(new Date('2026-07-30T03:01:00+02:00'))).toBeNull();
    expect(getActiveWindow(new Date('2026-07-30T09:59:00+02:00'))).toBeNull();
  });

  it('returns the D2 window at D2 14:00', () => {
    const result = getActiveWindow(new Date('2026-07-30T14:00:00+02:00'));
    expect(result).not.toBeNull();
    expect(result!.start.toISOString()).toBe(new Date('2026-07-30T10:00:00+02:00').toISOString());
  });

  it('returns the D4 window at the last minute (Aug 2 02:59)', () => {
    const result = getActiveWindow(new Date('2026-08-02T02:59:00+02:00'));
    expect(result).not.toBeNull();
    expect(result!.end.toISOString()).toBe(new Date('2026-08-02T03:00:00+02:00').toISOString());
  });

  it('returns null after the festival ends (Aug 2 03:01)', () => {
    expect(getActiveWindow(new Date('2026-08-02T03:01:00+02:00'))).toBeNull();
  });
});
