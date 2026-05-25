import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runReconnectSync, emitSyncComplete } = vi.hoisted(() => ({
  runReconnectSync: vi.fn().mockResolvedValue(0),
  emitSyncComplete: vi.fn(),
}));

vi.mock('../lib/syncCoordinator', () => ({
  runReconnectSync,
}));

vi.mock('../components/sync/emitSyncComplete', () => ({
  emitSyncComplete,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'user-reconnect' } } }),
}));

import { ReconnectSync } from '../components/sync/ReconnectSync';

beforeEach(() => {
  vi.clearAllMocks();
  runReconnectSync.mockResolvedValue(0);
});

describe('ReconnectSync', () => {
  it('runs reconnect sync on mount when user is logged in', async () => {
    render(<ReconnectSync />);
    await waitFor(() => {
      expect(runReconnectSync).toHaveBeenCalledWith('user-reconnect');
    });
  });

  it('emits sync-complete when items were flushed', async () => {
    runReconnectSync.mockResolvedValue(3);
    render(<ReconnectSync />);
    await waitFor(() => {
      expect(emitSyncComplete).toHaveBeenCalledOnce();
    });
  });

  it('does not emit sync-complete when nothing was flushed', async () => {
    render(<ReconnectSync />);
    await waitFor(() => {
      expect(runReconnectSync).toHaveBeenCalledOnce();
    });
    expect(emitSyncComplete).not.toHaveBeenCalled();
  });

  it('re-runs reconnect sync on online event', async () => {
    render(<ReconnectSync />);
    await waitFor(() => expect(runReconnectSync).toHaveBeenCalledOnce());

    window.dispatchEvent(new Event('online'));

    await waitFor(() => expect(runReconnectSync).toHaveBeenCalledTimes(2));
  });
});
