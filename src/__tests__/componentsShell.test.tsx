import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OfflineBanner from '../components/OfflineBanner';
import ErrorState from '../components/ErrorState';
import SyncToast, { SYNC_COMPLETE_EVENT } from '../components/SyncToast';
import GenreGuideCollapsible from '../components/GenreGuideCollapsible';
import BottomNav from '../components/BottomNav';
import PrivateRoute from '../components/PrivateRoute';
import MyWackenCoachBanner from '../components/MyWackenCoachBanner';
import { renderWithI18n } from './helpers/i18nMock';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../lib/myWackenCoachDismiss', () => ({
  isMyWackenCoachDismissed: vi.fn(() => false),
  dismissMyWackenCoach: vi.fn(),
}));

import { useAuth } from '../hooks/useAuth';
import { dismissMyWackenCoach, isMyWackenCoachDismissed } from '../lib/myWackenCoachDismiss';

describe('OfflineBanner', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('renders nothing when online', () => {
    const { container } = renderWithI18n(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('shows message when offline and hides after online event', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { container } = renderWithI18n(<OfflineBanner />);
    expect(screen.getByRole('status')).toHaveTextContent('No connection — offline mode');

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(container.firstChild).toBeNull();
  });
});

describe('ErrorState', () => {
  it('renders network variant without retry button', () => {
    render(<ErrorState variant="network" />);
    expect(screen.getByText('Sem sinal. No modo offline. 🤘')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders sync variant with retry', () => {
    const onRetry = vi.fn();
    render(<ErrorState variant="sync" onRetry={onRetry} message="Custom sync error" />);
    expect(screen.getByText('Custom sync error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders auth variant with login retry', () => {
    const onRetry = vi.fn();
    render(<ErrorState variant="auth" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('SyncToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows toast on sync event and hides after timeout', () => {
    renderWithI18n(<SyncToast />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent(SYNC_COMPLETE_EVENT));
    });
    expect(screen.getByRole('status')).toHaveTextContent('Synced 🤘');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('GenreGuideCollapsible', () => {
  it('expands to show genre guide rows', () => {
    renderWithI18n(<GenreGuideCollapsible />);
    fireEvent.click(screen.getByRole('button', { name: /What do these genres mean/i }));
    expect(screen.getByText(/We grouped many Wacken subgenre tags/i)).toBeInTheDocument();
  });
});

describe('BottomNav', () => {
  it('renders primary nav tabs', () => {
    renderWithI18n(
      <MemoryRouter initialEntries={['/now']}>
        <BottomNav />
      </MemoryRouter>,
    );

    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getByText('Lineup')).toBeInTheDocument();
    expect(screen.getByText('My Wacken')).toBeInTheDocument();
    expect(screen.getByText('Popular')).toBeInTheDocument();
    expect(screen.getByText('Mural')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });
});

describe('PrivateRoute', () => {
  beforeEach(() => vi.mocked(useAuth).mockReset());

  it('shows loading state', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: true } as ReturnType<
      typeof useAuth
    >);
    render(
      <MemoryRouter>
        <PrivateRoute>
          <div>secret</div>
        </PrivateRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders children when session exists', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { id: 'u1' } },
      loading: false,
    } as ReturnType<typeof useAuth>);
    render(
      <MemoryRouter>
        <PrivateRoute>
          <div>secret</div>
        </PrivateRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('redirects to login without session', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false } as ReturnType<
      typeof useAuth
    >);
    render(
      <MemoryRouter initialEntries={['/now']}>
        <PrivateRoute>
          <div>secret</div>
        </PrivateRoute>
      </MemoryRouter>,
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });
});

describe('MyWackenCoachBanner', () => {
  beforeEach(() => {
    vi.mocked(isMyWackenCoachDismissed).mockReturnValue(false);
  });

  it('renders when visible and dismisses', () => {
    renderWithI18n(<MyWackenCoachBanner visible />);
    expect(screen.getByText('First time')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dismiss coach banner'));
    expect(dismissMyWackenCoach).toHaveBeenCalled();
    expect(screen.queryByText('First time')).not.toBeInTheDocument();
  });

  it('returns null when not visible or already dismissed', () => {
    vi.mocked(isMyWackenCoachDismissed).mockReturnValue(true);
    const { container } = renderWithI18n(<MyWackenCoachBanner visible />);
    expect(container.firstChild).toBeNull();
  });
});
