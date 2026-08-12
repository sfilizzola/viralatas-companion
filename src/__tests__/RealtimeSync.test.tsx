import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_FESTIVAL_ID } from './helpers/testFestival';

const {
  subscribeToRealtime,
  subscribeToMetalPlaceConfigRealtime,
  subscribeToLiveBandTestConfigRealtime,
  subscribeToMembershipRealtime,
  mockUseActiveFestival,
} = vi.hoisted(() => ({
  subscribeToRealtime: vi.fn().mockReturnValue(() => {}),
  subscribeToMetalPlaceConfigRealtime: vi.fn().mockReturnValue(() => {}),
  subscribeToLiveBandTestConfigRealtime: vi.fn().mockReturnValue(() => {}),
  subscribeToMembershipRealtime: vi.fn().mockReturnValue(() => {}),
  mockUseActiveFestival: vi.fn(),
}));

vi.mock('../hooks/useActiveFestival', () => ({
  useActiveFestival: mockUseActiveFestival,
}));

vi.mock('../repositories', () => ({
  picksRepository: { subscribeToRealtime },
  announcementsRepository: { subscribeToRealtime },
  presenceRepository: { subscribeToRealtime, subscribeToMetalPlaceConfigRealtime },
  missedRepository: { subscribeToRealtime },
  ratingsRepository: { subscribeToRealtime },
  reactionsRepository: { subscribeToRealtime },
  usersRepository: { subscribeToRealtime, subscribeToMembershipRealtime },
}));

vi.mock('../services/liveBandTest', () => ({
  subscribeToLiveBandTestConfigRealtime,
}));

import { RealtimeSync } from '../components/sync/RealtimeSync';

beforeEach(() => {
  vi.clearAllMocks();
  mockUseActiveFestival.mockReturnValue({
    activeFestivalId: TEST_FESTIVAL_ID,
    ready: true,
  });
  subscribeToRealtime.mockReturnValue(() => {});
  subscribeToMetalPlaceConfigRealtime.mockReturnValue(() => {});
  subscribeToLiveBandTestConfigRealtime.mockReturnValue(() => {});
  subscribeToMembershipRealtime.mockReturnValue(() => {});
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
    expect(subscribeToMembershipRealtime).toHaveBeenCalledWith(TEST_FESTIVAL_ID);
  });

  it('skips subscriptions until Active Festival context is ready', () => {
    mockUseActiveFestival.mockReturnValue({
      activeFestivalId: TEST_FESTIVAL_ID,
      ready: false,
    });

    render(<RealtimeSync />);

    expect(subscribeToRealtime).not.toHaveBeenCalled();
    expect(subscribeToMembershipRealtime).not.toHaveBeenCalled();
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
    const unsubMembership = vi.fn();

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
    subscribeToMembershipRealtime.mockReturnValue(unsubMembership);

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
    expect(unsubMembership).toHaveBeenCalledOnce();
  });
});
