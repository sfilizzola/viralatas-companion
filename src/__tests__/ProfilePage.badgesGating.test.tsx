import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  badgesEnabled: false,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'vira-lata@example.com',
      user_metadata: { display_name: 'Vira Lata' },
    },
  }),
}));
vi.mock('../lib/signOut', () => ({
  signOutUser: vi.fn(),
}));
vi.mock('../lib/i18n', () => ({
  useI18n: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => key,
  }),
}));
vi.mock('../contexts/BadgesEnabledContext', () => ({
  useBadgesEnabled: () => mocks.badgesEnabled,
}));
vi.mock('../hooks/useActiveFestival', () => ({
  useActiveFestival: () => ({ festival: null }),
}));
vi.mock('../hooks/useWrapTeaserVisible', () => ({
  useWrapTeaserVisible: () => false,
}));
vi.mock('../repositories', () => ({
  announcementsRepository: {
    fetchCurrentUserRole: vi.fn().mockResolvedValue('normal'),
  },
}));
vi.mock('../lib/appSettings', () => ({
  getMoshSplitEnabled: vi.fn().mockResolvedValue(false),
}));
vi.mock('../components/BadgeHistorySection', () => ({
  default: () => <div data-testid="badge-history" />,
}));
vi.mock('../components/BadgesDisplay', () => ({
  default: () => <div data-testid="badges-display" />,
}));
vi.mock('../components/BottomNav', () => ({ default: () => null }));
vi.mock('../components/profile/ProfileHeader', () => ({ default: () => null }));
vi.mock('../components/profile/EditProfileForm', () => ({ default: () => null }));
vi.mock('../components/profile/ConflictSection', () => ({ default: () => null }));
vi.mock('../components/profile/MoshSplitSection', () => ({ default: () => null }));
vi.mock('../components/profile/GodlikeAdminPanel', () => ({ default: () => null }));
vi.mock('../components/profile/ManagerAdminPanel', () => ({ default: () => null }));
vi.mock('../components/InstallAppProfileLink', () => ({ default: () => null }));
vi.mock('../components/wrap/WrapTeaserBanner', () => ({ default: () => null }));

import ProfilePage from '../pages/ProfilePage';

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );
}

describe('ProfilePage badge feature gate', () => {
  beforeEach(() => {
    mocks.badgesEnabled = false;
  });

  it('does not mount the vest while keeping badge history available', () => {
    const { container, unmount } = renderPage();

    expect(container.querySelector('#vest')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badges-display')).not.toBeInTheDocument();
    expect(screen.getByTestId('badge-history')).toBeInTheDocument();

    unmount();
    mocks.badgesEnabled = true;
    const enabled = renderPage();
    expect(enabled.container.querySelector('#vest')).toBeInTheDocument();
    expect(screen.getByTestId('badges-display')).toBeInTheDocument();
    expect(screen.getByTestId('badge-history')).toBeInTheDocument();
  });
});
