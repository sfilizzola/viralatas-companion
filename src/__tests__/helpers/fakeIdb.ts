import 'fake-indexeddb/auto';

/** Override setup.ts IndexedDB stub with fake-indexeddb for db layer tests. */
export function installFakeIndexedDB(): void {
  Object.defineProperty(globalThis, 'indexedDB', {
    value: indexedDB,
    writable: true,
    configurable: true,
  });
}

export async function deleteViralatasDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('viralatas-db');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('deleteDatabase failed'));
    request.onblocked = () => resolve();
  });
}
