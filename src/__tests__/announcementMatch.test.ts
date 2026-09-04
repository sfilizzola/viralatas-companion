import { describe, it, expect } from 'vitest';
import { planNameMatches } from '../services/announcementMatch';

const announced = (id: string, name: string) => ({ id, name });
const official = (slot_id: string, name: string) => ({ slot_id, name });

describe('planNameMatches', () => {
  it('one announced ↔ one official: UPDATE keeping id', () => {
    const plan = planNameMatches({
      announced: [announced('U', 'Gojira')],
      official: [official('FAS1', 'Gojira')],
    });
    expect(plan.updates).toEqual([{ dbId: 'U', slot_id: 'FAS1' }]);
    expect(plan.inserts).toEqual([]);
    expect(plan.leftovers).toEqual([]);
    expect(plan.skippedClusters).toEqual([]);
  });

  it('matches after NFKC / case / space normalize', () => {
    const plan = planNameMatches({
      announced: [announced('U', '  GOJIRA  ')],
      official: [official('FAS1', 'gojira')],
    });
    expect(plan.updates[0]?.dbId).toBe('U');
  });

  it('official with no announced name: INSERT', () => {
    const plan = planNameMatches({
      announced: [],
      official: [official('FAS1', 'Gojira')],
    });
    expect(plan.inserts).toEqual([{ slot_id: 'FAS1' }]);
  });

  it('announced with no official slot: leftover, not delete', () => {
    const plan = planNameMatches({
      announced: [announced('U', 'Local Hero')],
      official: [],
    });
    expect(plan.leftovers).toEqual([{ dbId: 'U' }]);
    expect(plan.updates).toEqual([]);
  });

  it('two official one name: skip cluster, no update/insert for that name', () => {
    const plan = planNameMatches({
      announced: [announced('U', 'Gojira')],
      official: [official('FAS1', 'Gojira'), official('FAS2', 'Gojira')],
    });
    expect(plan.updates).toEqual([]);
    expect(plan.inserts).toEqual([]);
    expect(plan.skippedClusters[0]?.nameKey).toBe('gojira');
    expect(plan.skippedClusters[0]?.officialSlotIds).toEqual(['FAS1', 'FAS2']);
  });

  it('two announced one name: skip', () => {
    const plan = planNameMatches({
      announced: [announced('U1', 'Gojira'), announced('U2', 'Gojira')],
      official: [official('FAS1', 'Gojira')],
    });
    expect(plan.updates).toEqual([]);
    expect(plan.skippedClusters.length).toBe(1);
  });
});
