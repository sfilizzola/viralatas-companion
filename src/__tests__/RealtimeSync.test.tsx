import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_FESTIVAL_ID } from './helpers/testFestival';

const {
  subscribeToRealtime,
  subscribeToMetalPlaceConfigRealtime,
  subscribeToLiveBandTestConfigRealtime,
  mockGetActiveFestivalId,
} = vi.hoisted(() => ({
  subscribeToRealtime: vi.fn().mockReturnValue(() => {}),
  subscribeToMetalPlaceConfigRealtime: vi.fn().mockReturnValue(() => {}),
  subscribeToLiveBandTestConfigRealtime: vi.fn().mockReturnValue(() => {}),
  mockGetActiveFestivalId: vi.fn().mockResolvedValue('wacken-2026'),
}));

vi.mock('../lib/db', () => ({
  getActiveFestivalId: mockGetActiveFestivalId,
}));

vi.mock('../repositories', () => ({
  picksRepository: { subscribeToRealtime },
  announcementsRepository: { subscribeToRealtime },
  presenceRepository: { subscribeToRealtime, subscribeToMetalPlaceConfigRealtime },
  missedRepository: { subscribeToRealtime },
  ratingsRepository: { subscribeToRealtime },
  reactionsRepository: { subscribeToRealtime },
  usersRepository: { subscribeToRealtime },
}));

vi.mock('../services/liveBandTest', () => ({
  subscribeToLiveBandTestConfigRealtime,
}));

import { RealtimeSync } from '../components/sync/RealtimeSync';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetActiveFestivalId.mockResolvedValue(TEST_FESTIVAL_ID);
  subscribeToRealtime.mockReturnValue(() => {});
  subscribeToMetalPlaceConfigRealtime.mockReturnValue(() => {});
  subscribeToLiveBandTestConfigRealtime.mockReturnValue(() => {});
});

describe('RealtimeSync', () => {
  it('mounts all repository Realtime subscriptions on mount with active festival id', async () => {
    render(<RealtimeSync />);

    await waitFor(() => {
      expect(subscribeToRealtime).toHaveBeenCalledTimes(7);
    });
    expect(subscribeToRealtime).toHaveBeenCalledWith(TEST_FESTIVAL_ID);
    expect(subscribeToMetalPlaceConfigRealtime).toHaveBeenCalledOnce();
    expect(subscribeToLiveBandTestConfigRealtime).toHaveBeenCalledOnce();
  });

  it('cleans up all subscriptions on unmount', async () => {
    const unsubPicks = vi.fn();
    const unsubAnnouncements = vi.fn();
    const unsubPresence = vi.fn();
    const unsubMissed = vi.fn();
    const unsubRatings = vi.fn();
    const unsubReactions = vi.fn();
    const unsubUsers = vi.fn();
    const unsubMetalPlace = vi.fn();
    const unsubLiveBandTest = vi.fn();

    subscribeToRealtime
      .mockReturnValueOnce(unsubPicks)
      .mockReturnValueOnce(unsubAnnouncements)
      .mockReturnValueOnce(unsubPresence)
      .mockReturnValueOnce(unsubMissed)
      .mockReturnValueOnce(unsubRatings)
      .mockReturnValueOnce(unsubReactions)
      .mockReturnValueOnce(unsubUsers);
    subscribeToMetalPlaceConfigRealtime.mockReturnValue(unsubMetalPlace);
    subscribeToLiveBandTestConfigRealtime.mockReturnValue(unsubLiveBandTest);

    const { unmount } = render(<RealtimeSync />);
    await waitFor(() => {
      expect(subscribeToRealtime).toHaveBeenCalledTimes(7);
    });
    unmount();

    expect(unsubPicks).toHaveBeenCalledOnce();
    expect(unsubAnnouncements).toHaveBeenCalledOnce();
    expect(unsubPresence).toHaveBeenCalledOnce();
    expect(unsubMissed).toHaveBeenCalledOnce();
    expect(unsubRatings).toHaveBeenCalledOnce();
    expect(unsubReactions).toHaveBeenCalledOnce();
    expect(unsubUsers).toHaveBeenCalledOnce();
    expect(unsubMetalPlace).toHaveBeenCalledOnce();
    expect(unsubLiveBandTest).toHaveBeenCalledOnce();
  });
});
