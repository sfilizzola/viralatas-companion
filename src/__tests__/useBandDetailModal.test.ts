import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Band } from '../types';
import type { BandAttendee } from '../services/attendees';
import { useBandDetailModal } from '../hooks/useBandDetailModal';

const userId = 'user-1';
const otherUserId = 'user-2';

const bandA: Band = {
  id: 'band-a',
  slot_id: 'slot-a',
  name: 'Band A',
  stage: 'Main',
  start_time: '2026-07-30T13:00:00Z',
  end_time: '2026-07-30T14:00:00Z',
  image_url: null,
  genre: 'Metal',
  category: 'band',
};

const bandB: Band = {
  id: 'band-b',
  slot_id: 'slot-b',
  name: 'Band B',
  stage: 'Side',
  start_time: '2026-07-30T10:30:00Z',
  end_time: '2026-07-30T11:30:00Z',
  image_url: null,
  genre: 'Metal',
  category: 'band',
};

const attendee = (id: string, label: string): BandAttendee => ({
  id,
  display_name: label,
  avatar_url: null,
  wacken_arrival_day: null,
  is_friend: null,
  label,
});

const endedBand: Band = {
  ...bandA,
  id: 'band-ended',
  end_time: '2026-07-29T11:00:00Z',
};

function buildParams(overrides: Partial<Parameters<typeof useBandDetailModal>[0]> = {}) {
  const currentNow = new Date('2026-07-30T12:00:00Z');
  const conflicts = new Map([
    [
      bandA.id,
      [
        { band: bandB, severity: 'hard' as const },
        { band: bandB, severity: 'soft' as const },
      ],
    ],
  ]);

  return {
    bands: [bandA, bandB, endedBand],
    pickedIds: new Set([bandA.id]),
    togglePick: vi.fn().mockResolvedValue(undefined),
    allMissed: [{ user_id: userId, band_id: endedBand.id, marked_at: new Date().toISOString() }],
    missedBandIds: new Set([endedBand.id]),
    toggleMissed: vi.fn().mockResolvedValue(undefined),
    attendeesByBand: {
      [bandA.id]: [attendee(userId, 'Me')],
      [endedBand.id]: [attendee(userId, 'Me'), attendee(otherUserId, 'Other')],
    },
    currentNow,
    conflicts,
    ...overrides,
  };
}

describe('useBandDetailModal', () => {
  it('starts closed with null modalProps', () => {
    const { result } = renderHook(() => useBandDetailModal(buildParams()));
    expect(result.current.activeBand).toBeNull();
    expect(result.current.modalProps).toBeNull();
  });

  it('openBand sets activeBand and modalProps', () => {
    const params = buildParams();
    const { result } = renderHook(() => useBandDetailModal(params));

    act(() => {
      result.current.openBand(bandA.id);
    });

    expect(result.current.activeBand).toEqual(bandA);
    expect(result.current.modalProps?.band).toEqual(bandA);
    expect(result.current.modalProps?.isPicked).toBe(true);
    expect(result.current.modalProps?.isBandEnded).toBe(false);
    expect(result.current.modalProps?.hidePick).toBe(false);
    expect(result.current.modalProps?.conflictBands).toEqual([bandB]);
    expect(result.current.modalProps?.overlapBands).toEqual([bandB]);
  });

  it('closeBand clears modalProps', () => {
    const { result } = renderHook(() => useBandDetailModal(buildParams()));

    act(() => {
      result.current.openBand(bandA.id);
    });
    act(() => {
      result.current.closeBand();
    });

    expect(result.current.activeBand).toBeNull();
    expect(result.current.modalProps).toBeNull();
  });

  it('derives ended and missed state for ended bands', () => {
    const params = buildParams();
    const { result } = renderHook(() => useBandDetailModal(params));

    act(() => {
      result.current.openBand(endedBand.id);
    });

    expect(result.current.modalProps?.isBandEnded).toBe(true);
    expect(result.current.modalProps?.hidePick).toBe(true);
    expect(result.current.modalProps?.isMissed).toBe(true);
    expect(result.current.modalProps?.missedUserIds).toEqual(new Set([userId]));
  });

  it('onTogglePick calls togglePick for active band', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useBandDetailModal(params));

    act(() => {
      result.current.openBand(bandA.id);
    });

    await act(async () => {
      await result.current.modalProps?.onTogglePick();
    });

    expect(params.togglePick).toHaveBeenCalledWith(bandA.id);
  });

  it('onToggleMissed calls toggleMissed for active band', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useBandDetailModal(params));

    act(() => {
      result.current.openBand(endedBand.id);
    });

    await act(async () => {
      await result.current.modalProps?.onToggleMissed();
    });

    expect(params.toggleMissed).toHaveBeenCalledWith(endedBand.id);
  });
});
