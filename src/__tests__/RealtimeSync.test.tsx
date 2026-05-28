import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  subscribeToRealtime,
  subscribeToMetalPlaceConfigRealtime,
  subscribeToLiveBandTestConfigRealtime,
} = vi.hoisted(() => ({
  subscribeToRealtime: vi.fn().mockReturnValue(() => {}),
  subscribeToMetalPlaceConfigRealtime: vi.fn().mockReturnValue(() => {}),
  subscribeToLiveBandTestConfigRealtime: vi.fn().mockReturnValue(() => {}),
}));

vi.mock('../repositories', () => ({
  picksRepository: { subscribeToRealtime },
  announcementsRepository: { subscribeToRealtime },
  presenceRepository: { subscribeToRealtime, subscribeToMetalPlaceConfigRealtime },
  missedRepository: { subscribeToRealtime },
  ratingsRepository: { subscribeToRealtime },
  usersRepository: { subscribeToRealtime },
}));

vi.mock('../services/liveBandTest', () => ({
  subscribeToLiveBandTestConfigRealtime,
}));

import { RealtimeSync } from '../components/sync/RealtimeSync';

beforeEach(() => {
  vi.clearAllMocks();
  subscribeToRealtime.mockReturnValue(() => {});
  subscribeToMetalPlaceConfigRealtime.mockReturnValue(() => {});
  subscribeToLiveBandTestConfigRealtime.mockReturnValue(() => {});
});

describe('RealtimeSync', () => {
  it('mounts all repository Realtime subscriptions on mount', () => {
    render(<RealtimeSync />);

    expect(subscribeToRealtime).toHaveBeenCalledTimes(6);
    expect(subscribeToMetalPlaceConfigRealtime).toHaveBeenCalledOnce();
    expect(subscribeToLiveBandTestConfigRealtime).toHaveBeenCalledOnce();
  });

  it('cleans up all subscriptions on unmount', () => {
    const unsubPicks = vi.fn();
    const unsubAnnouncements = vi.fn();
    const unsubPresence = vi.fn();
    const unsubMissed = vi.fn();
    const unsubRatings = vi.fn();
    const unsubUsers = vi.fn();
    const unsubMetalPlace = vi.fn();
    const unsubLiveBandTest = vi.fn();

    subscribeToRealtime
      .mockReturnValueOnce(unsubPicks)
      .mockReturnValueOnce(unsubAnnouncements)
      .mockReturnValueOnce(unsubPresence)
      .mockReturnValueOnce(unsubMissed)
      .mockReturnValueOnce(unsubRatings)
      .mockReturnValueOnce(unsubUsers);
    subscribeToMetalPlaceConfigRealtime.mockReturnValue(unsubMetalPlace);
    subscribeToLiveBandTestConfigRealtime.mockReturnValue(unsubLiveBandTest);

    const { unmount } = render(<RealtimeSync />);
    unmount();

    expect(unsubPicks).toHaveBeenCalledOnce();
    expect(unsubAnnouncements).toHaveBeenCalledOnce();
    expect(unsubPresence).toHaveBeenCalledOnce();
    expect(unsubMissed).toHaveBeenCalledOnce();
    expect(unsubRatings).toHaveBeenCalledOnce();
    expect(unsubUsers).toHaveBeenCalledOnce();
    expect(unsubMetalPlace).toHaveBeenCalledOnce();
    expect(unsubLiveBandTest).toHaveBeenCalledOnce();
  });
});
