import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { FestivalWrapStats } from '../services/festivalWrap';

const EVERGREEN_EARNED_IMG = '/badges/badge_vira-latas-pack.png';
const YEAR_EARNED_IMG = '/badges/badge_metal-place26.png';

function wrapStats(overrides?: Partial<FestivalWrapStats['personal']>): FestivalWrapStats {
  return {
    hasPicks: true,
    personal: {
      bandsPicked: 2,
      bandsSeen: 1,
      bandsSkipped: 1,
      topGenre: 'Heavy Metal',
      topStage: 'Faster',
      topStageVisitCount: 1,
      stageDiversity: 1,
      hardConflicts: 0,
      softConflicts: 0,
      weakSkips: 0,
      badgesEarnedCount: 2,
      earnedBadgeSlugs: ['pack-member', 'metal-place-2026'],
      assignedBadgeSlugs: ['melon', 'mosh-pit'],
      maxCrewAtPick: 2,
      locationVisitsTotal: 0,
      ...overrides,
    },
    crew: {
      topBandName: 'Test Band',
      topBandPickCount: 2,
      activeViraLatas: 2,
      pickTwinUserId: null,
      pickTwinDisplayName: null,
      pickTwinAvatarUrl: null,
      pickTwinOverlapPct: null,
      currentUserDisplayName: 'Tester',
      currentUserAvatarUrl: null,
    },
    ratings: null,
  };
}

const mocks = vi.hoisted(() => ({
  badgesEnabled: false,
  stats: null as FestivalWrapStats | null,
}));

vi.mock('../contexts/BadgesEnabledContext', () => ({
  useBadgesEnabled: () => mocks.badgesEnabled,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } } }),
}));

vi.mock('../hooks/useFestivalWrapStats', () => ({
  useFestivalWrapStats: () => ({ stats: mocks.stats, loading: false, error: null }),
}));

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
}));

vi.mock('../lib/patchesBackground', () => ({
  loadPatchesBackground: () => 'steel',
}));

import WrapPage from '../pages/WrapPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <WrapPage />
    </MemoryRouter>,
  );
}

describe('WrapPage live badge gating', () => {
  beforeEach(() => {
    mocks.badgesEnabled = false;
    mocks.stats = wrapStats();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  it('hides live patch sections, vest CTA, and Chaos badge count while badges are disabled', () => {
    renderPage();

    expect(screen.queryByLabelText('sectionPatches')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('sectionAssigned')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'openVest' })).not.toBeInTheDocument();
    expect(screen.queryByText('chaosBadges')).not.toBeInTheDocument();
    expect(document.querySelectorAll(`img[src="${EVERGREEN_EARNED_IMG}"]`)).toHaveLength(0);
    expect(document.querySelectorAll(`img[src="${YEAR_EARNED_IMG}"]`)).toHaveLength(0);

    expect(document.querySelectorAll('[data-wrap-section]')).toHaveLength(6);
  });

  it('shows live patch sections, vest CTA, and Chaos badge count while badges are enabled', () => {
    mocks.badgesEnabled = true;
    renderPage();

    expect(screen.getByLabelText('sectionPatches')).toBeInTheDocument();
    expect(screen.getByLabelText('sectionAssigned')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'openVest' })).toHaveAttribute(
      'href',
      '/profile?vest=open#vest',
    );
    const chaos = screen.getByLabelText('sectionChaos');
    expect(within(chaos).getByText('chaosBadges')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-wrap-section]')).toHaveLength(8);
  });

  it('renders only evergreen patches in the live pile, never year-tagged wins', () => {
    mocks.badgesEnabled = true;
    renderPage();

    const patchSrcs = Array.from(
      screen.getByLabelText('sectionPatches').querySelectorAll('img'),
    ).map((img) => img.getAttribute('src'));

    expect(patchSrcs).toEqual([EVERGREEN_EARNED_IMG]);
    expect(patchSrcs).not.toContain(YEAR_EARNED_IMG);
  });

  it('keeps evergreen assigned patches and drops year-tagged assigned patches', () => {
    mocks.badgesEnabled = true;
    renderPage();

    const assigned = screen.getByLabelText('sectionAssigned');
    expect(within(assigned).getByText('badgeMelon')).toBeInTheDocument();
    expect(within(assigned).queryByText('badgeMoshPit')).not.toBeInTheDocument();
    expect(within(assigned).getByText('assignedCount:{"count":1}')).toBeInTheDocument();
  });

  it('counts only visible evergreen patches in Chaos and the pile header', () => {
    mocks.badgesEnabled = true;
    renderPage();

    // Stats report 2 earned badges, but only the evergreen one is a live patch.
    const chaos = screen.getByLabelText('sectionChaos');
    expect(within(chaos).getByText('1')).toBeInTheDocument();
    expect(within(chaos).queryByText('2')).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText('sectionPatches')).getByText('patchesCount:{"count":1}'),
    ).toBeInTheDocument();
  });

  it('hides Patches section, count, and vest CTA when flag is on but only year-tagged badges were earned', () => {
    mocks.badgesEnabled = true;
    mocks.stats = wrapStats({
      badgesEarnedCount: 1,
      earnedBadgeSlugs: ['metal-place-2026'],
    });
    renderPage();

    expect(screen.queryByLabelText('sectionPatches')).not.toBeInTheDocument();
    expect(screen.queryByText(/patchesCount/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'openVest' })).not.toBeInTheDocument();
    expect(document.querySelectorAll(`img[src="${YEAR_EARNED_IMG}"]`)).toHaveLength(0);

    // Assigned still mounts independently when an evergreen assigned patch exists.
    expect(screen.getByLabelText('sectionAssigned')).toBeInTheDocument();
    expect(within(screen.getByLabelText('sectionChaos')).getByText('chaosBadges')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-wrap-section]')).toHaveLength(7);
  });
});
