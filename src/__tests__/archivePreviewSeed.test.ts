import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ARCHIVE_PREVIEW_SAMPLE_SLUGS,
  badgeConfigsToHistoryRows,
  buildEarnedYearPreviewRows,
  buildSamplePreviewRows,
} from '../services/badges/archivePreviewSeed';
import { BADGES } from '../services/badges/registry';
import type { BadgeConfig } from '../services/badges/types';

describe('archivePreviewSeed', () => {
  it('maps badge configs to frozen history row shape', () => {
    const badge = BADGES.find((b) => b.slug === 'puppy')!;
    const rows = badgeConfigsToHistoryRows('user-1', [badge], 2026);

    expect(rows).toEqual([
      {
        user_id: 'user-1',
        festival_year: 2026,
        slug: 'puppy',
        image_path: '/badges/badge_new-puppy.png',
        label_key: 'badgePuppy',
      },
    ]);
  });

  it('buildEarnedYearPreviewRows keeps only matching festival year', () => {
    const earned: BadgeConfig[] = [
      BADGES.find((b) => b.slug === 'puppy')!,
      BADGES.find((b) => b.slug === 'pais-tropical')!,
    ];

    const rows = buildEarnedYearPreviewRows('user-1', earned, 2026);
    expect(rows.map((r) => r.slug)).toEqual(['puppy']);
  });

  it('buildSamplePreviewRows returns registry-backed sample slugs', () => {
    const rows = buildSamplePreviewRows('user-1', 2026);
    expect(rows.length).toBe(ARCHIVE_PREVIEW_SAMPLE_SLUGS.length);
    expect(rows.every((r) => r.user_id === 'user-1' && r.festival_year === 2026)).toBe(true);
  });
});

describe('badgeHistoryRepository preview sync guard', () => {
  beforeEach(() => {
    vi.resetModules();
    try {
      localStorage.removeItem('viralatas:archive-preview-user');
    } catch {
      // jsdom without localStorage
    }
  });

  it('syncFromRemote skips Supabase when archive preview flag is active', async () => {
    try {
      localStorage.setItem('viralatas:archive-preview-user', 'user-1');
    } catch {
      return;
    }

    const fromMock = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(),
        })),
      })),
    }));

    vi.doMock('../lib/supabase', () => ({
      supabase: { from: fromMock },
    }));

    const { badgeHistoryRepository } = await import('../repositories/badgeHistoryRepository');
    await badgeHistoryRepository.syncFromRemote('user-1');

    expect(fromMock).not.toHaveBeenCalled();
  });
});
