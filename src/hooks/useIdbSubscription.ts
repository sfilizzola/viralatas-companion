import { useSyncExternalStore } from 'react';
import { withTimeout } from '../lib/withTimeout';

const IDB_LOAD_TIMEOUT_MS = 5_000;

type CacheCell<T> = {
  data: T | undefined;
  listeners: Set<() => void>;
  loadPromise: Promise<void> | null;
};

export type IdbSubscriptionSpec<T> = {
  key: string;
  events: readonly string[];
  loader: () => Promise<T>;
  fallback: T;
};

const cells = new Map<string, CacheCell<unknown>>();
const attachedKeys = new Set<string>();

function getCell<T>(key: string): CacheCell<T> {
  let cell = cells.get(key) as CacheCell<T> | undefined;
  if (!cell) {
    cell = { data: undefined, listeners: new Set(), loadPromise: null };
    cells.set(key, cell);
  }
  return cell;
}

function notify(cell: CacheCell<unknown>) {
  cell.listeners.forEach((listener) => listener());
}

async function loadCell<T>(spec: IdbSubscriptionSpec<T>): Promise<void> {
  const cell = getCell<T>(spec.key);
  if (cell.loadPromise) return cell.loadPromise;

  cell.loadPromise = withTimeout(spec.loader(), IDB_LOAD_TIMEOUT_MS)
    .then((data) => {
      cell.data = data;
      notify(cell);
    })
    .catch((err) => {
      if (import.meta.env.DEV) {
        console.warn('[idb] loader timeout', spec.key, err);
      }
      cell.data = spec.fallback;
      notify(cell);
    })
    .finally(() => {
      cell.loadPromise = null;
    });

  return cell.loadPromise;
}

function attachListeners<T>(spec: IdbSubscriptionSpec<T>) {
  if (attachedKeys.has(spec.key)) return;
  attachedKeys.add(spec.key);

  const handler = () => void loadCell(spec);
  for (const event of spec.events) {
    window.addEventListener(event, handler);
  }
  void loadCell(spec);
}

/**
 * Shared IndexedDB subscription cache. One window-event listener + one IDB read
 * per cache key, regardless of how many components call this hook.
 */
export function useIdbSubscription<T>(spec: IdbSubscriptionSpec<T>): T | undefined {
  attachListeners(spec);

  return useSyncExternalStore(
    (onStoreChange) => {
      const cell = getCell<T>(spec.key);
      cell.listeners.add(onStoreChange);
      return () => cell.listeners.delete(onStoreChange);
    },
    () => getCell<T>(spec.key).data,
    () => undefined,
  );
}

/** Test-only: reset module-level cache state between tests. */
export function resetIdbSubscriptionsForTests() {
  cells.clear();
  attachedKeys.clear();
}
