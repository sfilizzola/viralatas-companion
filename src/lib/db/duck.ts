import { getDB } from './connection';
import type { OfflineDuckQuackOp } from './types';

export async function enqueueOfflineDuckQuack(op: OfflineDuckQuackOp) {
  const db = await getDB();
  await db.put('offline_duck_quacks', op);
}

export async function loadOfflineDuckQuackQueue(): Promise<OfflineDuckQuackOp[]> {
  const db = await getDB();
  return db.getAll('offline_duck_quacks');
}

export async function removeFromOfflineDuckQuackQueue(id: string) {
  const db = await getDB();
  await db.delete('offline_duck_quacks', id);
}
