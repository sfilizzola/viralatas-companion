import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories', () => ({
  picksRepository: {
    flushOfflineQueue: vi.fn().mockResolvedValue(0),
    syncCrewFromRemote: vi.fn().mockResolvedValue(undefined),
  },
  presenceRepository: {
    flushOfflineQueue: vi.fn().mockResolvedValue(0),
    syncCrewFromRemote: vi.fn().mockResolvedValue(undefined),
  },
  announcementsRepository: {
    flushOfflineQueue: vi.fn().mockResolvedValue(0),
    sync: vi.fn().mockResolvedValue(undefined),
  },
  duckRepository: {
    flushOfflineQueue: vi.fn().mockResolvedValue(0),
  },
  missedRepository: {
    flushOfflineQueue: vi.fn().mockResolvedValue(0),
    syncFromRemote: vi.fn().mockResolvedValue(undefined),
  },
  ratingsRepository: {
    flushOfflineQueue: vi.fn().mockResolvedValue(0),
    syncCrewFromRemote: vi.fn().mockResolvedValue(undefined),
  },
  reactionsRepository: {
    flushOfflineQueue: vi.fn().mockResolvedValue(0),
    syncFromRemote: vi.fn().mockResolvedValue(undefined),
  },
  usersRepository: {
    syncCrew: vi.fn().mockResolvedValue(undefined),
  },
}));

import { runReconnectSync } from '../lib/syncCoordinator';
import {
  announcementsRepository,
  duckRepository,
  missedRepository,
  picksRepository,
  presenceRepository,
  ratingsRepository,
  reactionsRepository,
  usersRepository,
} from '../repositories';

const userId = 'user-coordinator-test';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(picksRepository.flushOfflineQueue).mockResolvedValue(0);
  vi.mocked(presenceRepository.flushOfflineQueue).mockResolvedValue(0);
  vi.mocked(announcementsRepository.flushOfflineQueue).mockResolvedValue(0);
  vi.mocked(duckRepository.flushOfflineQueue).mockResolvedValue(0);
  vi.mocked(missedRepository.flushOfflineQueue).mockResolvedValue(0);
  vi.mocked(ratingsRepository.flushOfflineQueue).mockResolvedValue(0);
  vi.mocked(reactionsRepository.flushOfflineQueue).mockResolvedValue(0);
});

describe('runReconnectSync', () => {
  it('flushes all offline queues before pulling remote data', async () => {
    const callOrder: string[] = [];

    vi.mocked(picksRepository.flushOfflineQueue).mockImplementation(async () => {
      callOrder.push('flush-picks');
      return 2;
    });
    vi.mocked(presenceRepository.flushOfflineQueue).mockImplementation(async () => {
      callOrder.push('flush-presence');
      return 1;
    });
    vi.mocked(announcementsRepository.flushOfflineQueue).mockImplementation(async () => {
      callOrder.push('flush-announcements');
      return 0;
    });
    vi.mocked(duckRepository.flushOfflineQueue).mockImplementation(async () => {
      callOrder.push('flush-duck');
      return 1;
    });
    vi.mocked(missedRepository.flushOfflineQueue).mockImplementation(async () => {
      callOrder.push('flush-missed');
      return 0;
    });
    vi.mocked(ratingsRepository.flushOfflineQueue).mockImplementation(async () => {
      callOrder.push('flush-ratings');
      return 1;
    });
    vi.mocked(reactionsRepository.flushOfflineQueue).mockImplementation(async () => {
      callOrder.push('flush-reactions');
      return 2;
    });
    vi.mocked(announcementsRepository.sync).mockImplementation(async () => {
      callOrder.push('pull-announcements');
    });
    vi.mocked(reactionsRepository.syncFromRemote).mockImplementation(async () => {
      callOrder.push('pull-reactions');
    });
    vi.mocked(picksRepository.syncCrewFromRemote).mockImplementation(async () => {
      callOrder.push('pull-picks');
    });
    vi.mocked(usersRepository.syncCrew).mockImplementation(async () => {
      callOrder.push('pull-users');
    });
    vi.mocked(presenceRepository.syncCrewFromRemote).mockImplementation(async () => {
      callOrder.push('pull-presence');
    });
    vi.mocked(missedRepository.syncFromRemote).mockImplementation(async () => {
      callOrder.push('pull-missed');
    });
    vi.mocked(ratingsRepository.syncCrewFromRemote).mockImplementation(async () => {
      callOrder.push('pull-ratings');
    });

    const flushed = await runReconnectSync(userId);

    expect(flushed).toBe(7);
    expect(callOrder.indexOf('flush-picks')).toBeLessThan(callOrder.indexOf('pull-picks'));
    expect(callOrder.indexOf('flush-announcements')).toBeLessThan(callOrder.indexOf('flush-reactions'));
    expect(callOrder.indexOf('flush-reactions')).toBeLessThan(callOrder.indexOf('pull-announcements'));
    expect(callOrder.indexOf('pull-announcements')).toBeLessThan(callOrder.indexOf('pull-reactions'));
    expect(callOrder.indexOf('pull-reactions')).toBeLessThan(callOrder.indexOf('pull-picks'));
  });

  it('calls all flush and pull repository methods', async () => {
    vi.mocked(picksRepository.flushOfflineQueue).mockResolvedValue(1);
    vi.mocked(reactionsRepository.flushOfflineQueue).mockResolvedValue(1);

    await runReconnectSync(userId);

    expect(picksRepository.flushOfflineQueue).toHaveBeenCalledOnce();
    expect(presenceRepository.flushOfflineQueue).toHaveBeenCalledOnce();
    expect(announcementsRepository.flushOfflineQueue).toHaveBeenCalledOnce();
    expect(duckRepository.flushOfflineQueue).toHaveBeenCalledOnce();
    expect(missedRepository.flushOfflineQueue).toHaveBeenCalledOnce();
    expect(ratingsRepository.flushOfflineQueue).toHaveBeenCalledOnce();
    expect(reactionsRepository.flushOfflineQueue).toHaveBeenCalledOnce();
    expect(announcementsRepository.sync).toHaveBeenCalledOnce();
    expect(reactionsRepository.syncFromRemote).toHaveBeenCalledOnce();
    expect(picksRepository.syncCrewFromRemote).toHaveBeenCalledOnce();
    expect(usersRepository.syncCrew).toHaveBeenCalledOnce();
    expect(presenceRepository.syncCrewFromRemote).toHaveBeenCalledOnce();
    expect(missedRepository.syncFromRemote).toHaveBeenCalledWith(userId);
    expect(ratingsRepository.syncCrewFromRemote).toHaveBeenCalledOnce();
  });

  it('returns zero when no queue items were flushed', async () => {
    const flushed = await runReconnectSync(userId);
    expect(flushed).toBe(0);
  });
});
