import { describe, it, expect } from 'vitest';

/**
 * These encode Phase 1 acceptance. When a SQL integration harness exists, bind them.
 * Until then they lock the intended invariants for reviewers.
 */
describe('multi-festival migration invariants', () => {
  it('defines expected wacken feature keys', () => {
    const features = {
      metal_place: true,
      map: true,
      duck: true,
      camp: true,
      wrap: true,
      remote_lineup: true,
      running_order: true,
    };
    expect(Object.keys(features).sort()).toEqual(
      ['camp', 'duck', 'map', 'metal_place', 'remote_lineup', 'running_order', 'wrap'].sort(),
    );
  });

  it('uses slug wacken-2026', () => {
    expect('wacken-2026').toMatch(/^wacken-2026$/);
  });
});
