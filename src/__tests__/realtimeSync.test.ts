import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockReturnThis();
const mockChannel = { on: mockOn, subscribe: mockSubscribe };
const mockRemoveChannel = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

import { supabase } from '../lib/supabase';
import { subscribePostgresChanges } from '../lib/realtimeSync';

describe('subscribePostgresChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockReturnValue(mockChannel);
  });

  it('creates a channel, registers handlers, and subscribes', () => {
    const insertHandler = vi.fn();
    const deleteHandler = vi.fn();

    subscribePostgresChanges('pick_counts', [
      {
        filter: { event: 'INSERT', table: 'user_picks' },
        handler: insertHandler,
      },
      {
        filter: { event: 'DELETE', table: 'user_picks' },
        handler: deleteHandler,
      },
    ]);

    expect(supabase.channel).toHaveBeenCalledWith('pick_counts');
    expect(mockOn).toHaveBeenCalledTimes(2);
    expect(mockOn).toHaveBeenNthCalledWith(
      1,
      'postgres_changes',
      { schema: 'public', event: 'INSERT', table: 'user_picks' },
      insertHandler,
    );
    expect(mockOn).toHaveBeenNthCalledWith(
      2,
      'postgres_changes',
      { schema: 'public', event: 'DELETE', table: 'user_picks' },
      deleteHandler,
    );
    expect(mockSubscribe).toHaveBeenCalledOnce();
  });

  it('accepts a single subscription object', () => {
    const handler = vi.fn();

    subscribePostgresChanges('duck_quacks_realtime', {
      filter: { event: 'INSERT', table: 'duck_quacks' },
      handler,
    });

    expect(mockOn).toHaveBeenCalledOnce();
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      { schema: 'public', event: 'INSERT', table: 'duck_quacks' },
      handler,
    );
  });

  it('preserves a custom schema when provided', () => {
    const handler = vi.fn();

    subscribePostgresChanges('custom', {
      filter: { event: '*', schema: 'auth', table: 'users' },
      handler,
    });

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      { schema: 'auth', event: '*', table: 'users' },
      handler,
    );
  });

  it('returns unsubscribe that removes the channel', () => {
    const unsubscribe = subscribePostgresChanges('user_presence_live', {
      filter: { event: '*', table: 'user_presence' },
      handler: vi.fn(),
    });

    unsubscribe();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });
});
