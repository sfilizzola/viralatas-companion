import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdownProgress } from '../hooks/useCountdownProgress';

describe('useCountdownProgress', () => {
  beforeEach(() => {
    // Fire the callback once so the hook computes a single frame, but do not
    // re-invoke on reschedule (the stubbed time never advances, so a recursive
    // stub would loop forever during an active cooldown).
    let fired = false;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      if (!fired) {
        fired = true;
        cb(0);
      }
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns zero fill and empty countdown when cooldownUntil is null', () => {
    const { result } = renderHook(() => useCountdownProgress(null, 90_000));
    expect(result.current.fillFraction).toBe(0);
    expect(result.current.countdown).toBe('');
  });

  it('returns zero fill and empty countdown when cooldownUntil is in the past', () => {
    const { result } = renderHook(() => useCountdownProgress(Date.now() - 1000, 90_000));
    expect(result.current.fillFraction).toBe(0);
    expect(result.current.countdown).toBe('');
  });

  it('returns positive fill and MM:SS countdown during active cooldown', () => {
    const cooldownUntil = Date.now() + 60_000;
    let result: ReturnType<typeof renderHook<ReturnType<typeof useCountdownProgress>, unknown>>['result'];
    act(() => {
      ({ result } = renderHook(() => useCountdownProgress(cooldownUntil, 90_000)));
    });
    expect(result!.current.fillFraction).toBeGreaterThan(0);
    expect(result!.current.fillFraction).toBeLessThan(1);
    expect(result!.current.countdown).toMatch(/^\d:\d{2}$/);
  });
});
