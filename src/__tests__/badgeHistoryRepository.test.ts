import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteViralatasDatabase, installFakeIndexedDB } from './helpers/fakeIdb';

installFakeIndexedDB();

import {
  loadUserBadgeHistory,
  replaceUserBadgeHistory,
  resetDbConnectionForTests,
} from '../lib/db';
import type { UserBadgeHistory } from '../types';

function sampleHistory(
  userId: string,
  festivalYear: number,
  slug: string,
): UserBadgeHistory {
  return {
    user_id: userId,
    festival_year: festivalYear,
    slug,
    image_path: `/badges/badge_${slug}.png`,
    label_key: `badge${slug}`,
  };
}

describe('badge history IDB store', () => {
  beforeEach(async () => {
    await resetDbConnectionForTests();
    await deleteViralatasDatabase();
  });

  it('replaceUserBadgeHistory replaces all rows for the user', async () => {
    await replaceUserBadgeHistory(
      [
        sampleHistory('user-1', 2026, 'puppy'),
        sampleHistory('user-1', 2026, 'medic'),
      ],
      'user-1',
    );
    await replaceUserBadgeHistory(
      [sampleHistory('user-1', 2026, 'puppy')],
      'user-1',
    );

    const rows = await loadUserBadgeHistory('user-1');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.slug).toBe('puppy');
  });

  it('replaceUserBadgeHistory scoped to one user leaves other users intact', async () => {
    await replaceUserBadgeHistory([sampleHistory('user-1', 2026, 'puppy')], 'user-1');
    await replaceUserBadgeHistory([sampleHistory('user-2', 2026, 'medic')], 'user-2');

    await replaceUserBadgeHistory([sampleHistory('user-1', 2026, 'medic')], 'user-1');

    const user1 = await loadUserBadgeHistory('user-1');
    const user2 = await loadUserBadgeHistory('user-2');

    expect(user1).toHaveLength(1);
    expect(user1[0]?.slug).toBe('medic');
    expect(user2).toHaveLength(1);
    expect(user2[0]?.slug).toBe('medic');
  });
});

describe('badgeHistoryRepository sync replace', () => {
  beforeEach(async () => {
    vi.resetModules();
    await resetDbConnectionForTests();
    await deleteViralatasDatabase();
  });

  it('syncFromRemote replaces local rows for the signed-in user', async () => {
    vi.doMock('../lib/supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  sampleHistory('user-1', 2026, 'puppy'),
                  sampleHistory('user-1', 2025, 'veteran'),
                ],
                error: null,
              }),
            }),
          }),
        }),
      },
    }));

    const { badgeHistoryRepository } = await import('../repositories/badgeHistoryRepository');

    await replaceUserBadgeHistory([sampleHistory('user-1', 2026, 'stale')], 'user-1');
    await badgeHistoryRepository.syncFromRemote('user-1');

    const rows = await loadUserBadgeHistory('user-1');
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.slug).sort()).toEqual(['puppy', 'veteran']);
  });
});
