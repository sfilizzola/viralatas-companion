import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SessionExpiredBanner from '../components/SessionExpiredBanner';
import { renderWithI18n } from './helpers/i18nMock';
import {
  clearSessionExpiredBannerDismissed,
  markUserInitiatedSignOut,
} from '../lib/authSessionFlags';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/useAuth';

describe('SessionExpiredBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    clearSessionExpiredBannerDismissed();
  });

  it('shows when session expired after IDB bootstrap', () => {
    vi.mocked(useAuth).mockReturnValue({
      sessionExpired: true,
      hadIdbSession: true,
    } as ReturnType<typeof useAuth>);

    renderWithI18n(
      <MemoryRouter>
        <SessionExpiredBanner />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Session expired — sign in again when you have signal.',
    );
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('hides when user initiated sign out', () => {
    markUserInitiatedSignOut();
    vi.mocked(useAuth).mockReturnValue({
      sessionExpired: false,
      hadIdbSession: true,
    } as ReturnType<typeof useAuth>);

    const { container } = renderWithI18n(
      <MemoryRouter>
        <SessionExpiredBanner />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('hides after dismiss', () => {
    vi.mocked(useAuth).mockReturnValue({
      sessionExpired: true,
      hadIdbSession: true,
    } as ReturnType<typeof useAuth>);

    const { container } = renderWithI18n(
      <MemoryRouter>
        <SessionExpiredBanner />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(container.firstChild).toBeNull();
  });
});
