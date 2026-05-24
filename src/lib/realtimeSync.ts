import { supabase } from './supabase';

export type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export type PostgresChangeFilter = {
  event: PostgresChangeEvent;
  schema?: string;
  table: string;
  filter?: string;
};

export type PostgresChangePayload<TNew = Record<string, unknown>, TOld = Partial<TNew>> = {
  eventType: PostgresChangeEvent;
  new: TNew;
  old: TOld;
  errors: string[] | null;
  schema: string;
  table: string;
  commit_timestamp: string;
};

export type PostgresChangeHandler = (
  payload: PostgresChangePayload,
) => void | Promise<void>;

export type PostgresChangeSubscription = {
  filter: PostgresChangeFilter;
  handler: PostgresChangeHandler;
};

const DEFAULT_SCHEMA = 'public';

/**
 * Subscribe to one or more postgres_changes events on a named Realtime channel.
 * Handlers typically write to IndexedDB (which emits window events for hooks).
 * Returns an unsubscribe function that removes the channel.
 */
export function subscribePostgresChanges(
  channelName: string,
  subscriptions: PostgresChangeSubscription | PostgresChangeSubscription[],
): () => void {
  const list = Array.isArray(subscriptions) ? subscriptions : [subscriptions];

  let channel = supabase.channel(channelName);
  for (const { filter, handler } of list) {
    const { schema = DEFAULT_SCHEMA, ...rest } = filter;
    channel = channel.on(
      'postgres_changes',
      { schema, ...rest },
      handler as Parameters<typeof channel.on>[2],
    );
  }
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
