export type KeepLastDedup<T> = {
  strategy: 'keepLast';
  groupKey: (item: T) => string;
  sortKey: (item: T) => string;
};

export type FifoDedup<T> = {
  strategy: 'fifo';
  sortKey?: (item: T) => string;
};

export type ByIdDedup = {
  strategy: 'byId';
};

export type DedupConfig<T> = KeepLastDedup<T> | FifoDedup<T> | ByIdDedup;

export type FlushBatch<T> = {
  syncTarget: T;
  allIds: string[];
};

export type QueueStorage<T> = {
  load: () => Promise<T[]>;
  remove: (id: string) => Promise<void>;
};

export type OptimisticQueueConfig<T> = {
  getId: (item: T) => string;
  dedup: DedupConfig<T>;
  syncOne: (item: T) => Promise<{ error: unknown | null }>;
  onBatchSynced?: (item: T) => Promise<void>;
};

export interface OfflineQueueHandle {
  flush(): Promise<number>;
}

/**
 * Builds flush batches from a loaded queue using the configured dedup strategy.
 * Exported for unit tests of dedup semantics.
 */
export function buildFlushBatches<T>(
  items: T[],
  getId: (item: T) => string,
  dedup: DedupConfig<T>,
): FlushBatch<T>[] {
  if (items.length === 0) return [];

  switch (dedup.strategy) {
    case 'fifo': {
      const sorted = dedup.sortKey
        ? [...items].sort((a, b) => dedup.sortKey!(a).localeCompare(dedup.sortKey!(b)))
        : items;
      return sorted.map((item) => ({ syncTarget: item, allIds: [getId(item)] }));
    }
    case 'byId': {
      const byId = new Map<string, T>();
      for (const item of items) {
        byId.set(getId(item), item);
      }
      return Array.from(byId.values()).map((item) => ({
        syncTarget: item,
        allIds: [getId(item)],
      }));
    }
    case 'keepLast': {
      const sorted = [...items].sort((a, b) =>
        dedup.sortKey(a).localeCompare(dedup.sortKey(b)),
      );
      const groups = new Map<string, FlushBatch<T>>();
      for (const item of sorted) {
        const key = dedup.groupKey(item);
        const id = getId(item);
        const existing = groups.get(key);
        if (existing) {
          existing.allIds.push(id);
          existing.syncTarget = item;
        } else {
          groups.set(key, { syncTarget: item, allIds: [id] });
        }
      }
      return Array.from(groups.values());
    }
  }
}

/** Returns sync targets after keepLast dedup (convenience for tests). */
export function keepLastSyncTargets<T>(
  items: T[],
  getId: (item: T) => string,
  groupKey: (item: T) => string,
  sortKey: (item: T) => string,
): T[] {
  return buildFlushBatches(items, getId, {
    strategy: 'keepLast',
    groupKey,
    sortKey,
  }).map((batch) => batch.syncTarget);
}

export function createOptimisticQueue<T>(
  storage: QueueStorage<T>,
  config: OptimisticQueueConfig<T>,
): OfflineQueueHandle {
  return {
    async flush(): Promise<number> {
      const queue = await storage.load();
      if (queue.length === 0) return 0;

      const batches = buildFlushBatches(queue, config.getId, config.dedup);
      let flushed = 0;

      for (const batch of batches) {
        const { error } = await config.syncOne(batch.syncTarget);
        if (error) continue;

        if (config.onBatchSynced) {
          await config.onBatchSynced(batch.syncTarget);
        }
        await Promise.all(batch.allIds.map((id) => storage.remove(id)));
        flushed += batch.allIds.length;
      }

      return flushed;
    },
  };
}
