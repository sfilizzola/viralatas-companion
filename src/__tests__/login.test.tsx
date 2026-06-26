import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
  loadSession: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
  refreshAuthSessionInBackground: vi.fn(),
  watchOnlineAuthRefresh: vi.fn(),
}));

vi.mock('../lib/db', () => ({
  loadSession: mocks.loadSession,
}));

vi.mock('../lib/backgroundAuthRefresh', () => ({
  refreshAuthSessionInBackground: mocks.refreshAuthSessionInBackground,
  watchOnlineAuthRefresh: mocks.watchOnlineAuthRefresh,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
    },
    from: mocks.from,
  },
}));

vi.mock('../lib/appSettings', () => ({
  getRegistrationEnabled: vi.fn().mockResolvedValue(false),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { AuthProvider, useAuth } from '../hooks/useAuth';
import { AUTH_STORAGE_KEY } from '../lib/authStorage';
import LoginPage from '../pages/LoginPage';
import { render, screen, fireEvent, waitFor as waitForDom } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nContext } from '../lib/i18n';

function makeSession(partial?: Partial<Session>): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00Z',
    },
    ...partial,
  } as Session;
}

function authWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <I18nContext.Provider value={{ language: 'en', setLanguage: () => {} }}>
        <LoginPage />
      </I18nContext.Provider>
    </MemoryRouter>,
  );
}

function mockUsersProfile(profile: Record<string, unknown> | null, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data: profile, error });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  mocks.from.mockReturnValue({ select });
}

describe('User Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.loadSession.mockResolvedValue(null);
    mocks.watchOnlineAuthRefresh.mockReturnValue(vi.fn());
    mocks.refreshAuthSessionInBackground.mockResolvedValue(undefined);
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mocks.unsubscribe } },
    });
    mocks.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  describe('useAuth', () => {
    it('starts in loading state until IDB session read resolves', async () => {
      let resolveSession!: (value: unknown) => void;
      mocks.loadSession.mockReturnValue(
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
      );

      const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
      expect(result.current.loading).toBe(true);

      resolveSession(null);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('hydrates session and user from IDB', async () => {
      const session = makeSession();
      mocks.loadSession.mockResolvedValue({
        [AUTH_STORAGE_KEY]: JSON.stringify(session),
      });

      const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session?.access_token).toBe('access-token');
      expect(result.current.user?.id).toBe('user-123');
      expect(result.current.hadIdbSession).toBe(true);
      expect(mocks.refreshAuthSessionInBackground).toHaveBeenCalled();
    });

    it('updates state when onAuthStateChange fires', async () => {
      mocks.loadSession.mockResolvedValue(null);
      let authListener: ((_event: string, session: Session | null) => void) | undefined;
      mocks.onAuthStateChange.mockImplementation((callback) => {
        authListener = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      const session = makeSession();
      authListener?.('SIGNED_IN', session);

      await waitFor(() => {
        expect(result.current.session).toEqual(session);
        expect(result.current.user?.id).toBe('user-123');
      });
    });

    it('clears auth state when IDB read fails', async () => {
      mocks.loadSession.mockRejectedValue(new Error('IDB error'));

      const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('ignores INITIAL_SESSION null after IDB bootstrap', async () => {
      const session = makeSession();
      mocks.loadSession.mockResolvedValue({
        [AUTH_STORAGE_KEY]: JSON.stringify(session),
      });
      let authListener: ((_event: string, session: Session | null) => void) | undefined;
      mocks.onAuthStateChange.mockImplementation((callback) => {
        authListener = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      authListener?.('INITIAL_SESSION', null);

      await waitFor(() => {
        expect(result.current.session?.access_token).toBe('access-token');
        expect(result.current.sessionExpired).toBe(false);
      });
    });

    it('keeps session and flags expired on background SIGNED_OUT', async () => {
      const session = makeSession();
      mocks.loadSession.mockResolvedValue({
        [AUTH_STORAGE_KEY]: JSON.stringify(session),
      });
      let authListener: ((_event: string, session: Session | null) => void) | undefined;
      mocks.onAuthStateChange.mockImplementation((callback) => {
        authListener = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      authListener?.('SIGNED_OUT', null);

      await waitFor(() => {
        expect(result.current.sessionExpired).toBe(true);
        expect(result.current.session?.access_token).toBe('access-token');
      });
    });

    it('registers onAuthStateChange only after IDB bootstrap completes', async () => {
      const session = makeSession();
      let resolveSession!: (value: unknown) => void;
      mocks.loadSession.mockReturnValue(
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
      );

      const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
      expect(result.current.loading).toBe(true);
      expect(mocks.onAuthStateChange).not.toHaveBeenCalled();

      resolveSession({
        [AUTH_STORAGE_KEY]: JSON.stringify(session),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mocks.onAuthStateChange).toHaveBeenCalled();
      expect(result.current.session?.access_token).toBe('access-token');
    });

    it('unsubscribes from auth changes on unmount', async () => {
      const { unmount } = renderHook(() => useAuth(), { wrapper: authWrapper });
      await waitFor(() => expect(mocks.loadSession).toHaveBeenCalled());
      unmount();
      expect(mocks.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('LoginPage', () => {
    it('requires email and password inputs', () => {
      renderLoginPage();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    it('shows error when profile verification fails after sign-in', async () => {
      const session = makeSession();
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: session.user, session },
        error: null,
      });
      mockUsersProfile(null, { message: 'not found' });

      renderLoginPage();
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitForDom(() => {
        expect(
          screen.getByText('User profile not found. Please contact support if this persists.'),
        ).toBeInTheDocument();
      });
      expect(mocks.signOut).toHaveBeenCalled();
    });
  });
});
