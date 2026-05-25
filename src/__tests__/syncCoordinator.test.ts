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
    flushPending: vi.fn().mockResolvedValue(0),
    sync: vi.fn().mockResolvedValue(undefined),
  },
  duckRepository: {
    flushOfflineDucks: vi.fn().mockResolvedValue(0),
  },
  missedRepository: {
    flushOfflineQueue: vi.fn().mockResolvedValue(undefined),
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
  usersRepository,
} from '../repositories';

const userId = 'user-coordinator-test';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(picksRepository.flushOfflineQueue).mockResolvedValue(0);
  vi.mocked(presenceRepository.flushOfflineQueue).mockResolvedValue(0);
  vi.mocked(announcementsRepository.flushPending).mockResolvedValue(0);
  vi.mocked(duckRepository.flushOfflineDucks).mockResolvedValue(0);
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
    vi.mocked(announcementsRepository.flushPending).mockImplementation(async () => {
      callOrder.push('flush-announcements');
      return 0;
    });
    vi.mocked(duckRepository.flushOfflineDucks).mockImplementation(async () => {
      callOrder.push('flush-duck');
      return 1;
    });
    vi.mocked(missedRepository.flushOfflineQueue).mockImplementation(async () => {
      callOrder.push('flush-missed');
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
    vi.mocked(announcementsRepository.sync).mockImplementation(async () => {
      callOrder.push('pull-announcements');
    });
    vi.mocked(missedRepository.syncFromRemote).mockImplementation(async () => {
      callOrder.push('pull-missed');
    });

    const flushed = await runReconnectSync(userId);

    expect(flushed).toBe(4);
    expect(callOrder.indexOf('flush-picks')).toBeLessThan(callOrder.indexOf('pull-picks'));
    expect(callOrder.indexOf('flush-presence')).toBeLessThan(callOrder.indexOf('pull-presence'));
    expect(callOrder.indexOf('flush-announcements')).toBeLessThan(callOrder.indexOf('pull-announcements'));
    expect(callOrder.indexOf('flush-duck')).toBeLessThan(callOrder.indexOf('pull-picks'));
    expect(callOrder.indexOf('flush-missed')).toBeLessThan(callOrder.indexOf('pull-missed'));
  });

  it('calls all flush and pull repository methods', async () => {
    vi.mocked(picksRepository.flushOfflineQueue).mockResolvedValue(1);
    vi.mocked(presenceRepository.flushOfflineQueue).mockResolvedValue(0);
    vi.mocked(announcementsRepository.flushPending).mockResolvedValue(2);
    vi.mocked(duckRepository.flushOfflineDucks).mockResolvedValue(0);

    await runReconnectSync(userId);

    expect(picksRepository.flushOfflineQueue).toHaveBeenCalledOnce();
    expect(presenceRepository.flushOfflineQueue).toHaveBeenCalledOnce();
    expect(announcementsRepository.flushPending).toHaveBeenCalledOnce();
    expect(duckRepository.flushOfflineDucks).toHaveBeenCalledOnce();
    expect(missedRepository.flushOfflineQueue).toHaveBeenCalledOnce();
    expect(picksRepository.syncCrewFromRemote).toHaveBeenCalledOnce();
    expect(usersRepository.syncCrew).toHaveBeenCalledOnce();
    expect(presenceRepository.syncCrewFromRemote).toHaveBeenCalledOnce();
    expect(announcementsRepository.sync).toHaveBeenCalledOnce();
    expect(missedRepository.syncFromRemote).toHaveBeenCalledWith(userId);
  });

  it('returns zero when no queue items were flushed', async () => {
    const flushed = await runReconnectSync(userId);
    expect(flushed).toBe(0);
  });
});
