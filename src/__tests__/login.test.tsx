import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
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

import { useAuth } from '../hooks/useAuth';
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
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mocks.unsubscribe } },
    });
    mocks.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  describe('useAuth', () => {
    it('starts in loading state until getSession resolves', async () => {
      let resolveSession!: (value: { data: { session: Session | null } }) => void;
      mocks.getSession.mockReturnValue(
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
      );

      const { result } = renderHook(() => useAuth());
      expect(result.current.loading).toBe(true);

      resolveSession({ data: { session: null } });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('hydrates session and user from getSession', async () => {
      const session = makeSession();
      mocks.getSession.mockResolvedValue({ data: { session } });

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session).toEqual(session);
      expect(result.current.user?.id).toBe('user-123');
    });

    it('updates state when onAuthStateChange fires', async () => {
      mocks.getSession.mockResolvedValue({ data: { session: null } });
      let authListener: ((_event: string, session: Session | null) => void) | undefined;
      mocks.onAuthStateChange.mockImplementation((callback) => {
        authListener = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      });

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const session = makeSession();
      authListener?.('SIGNED_IN', session);

      await waitFor(() => {
        expect(result.current.session).toEqual(session);
        expect(result.current.user?.id).toBe('user-123');
      });
    });

    it('clears auth state when getSession fails', async () => {
      mocks.getSession.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('unsubscribes from auth changes on unmount', async () => {
      const { unmount } = renderHook(() => useAuth());
      await waitFor(() => expect(mocks.getSession).toHaveBeenCalled());
      unmount();
      expect(mocks.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('LoginPage', () => {
    it('requires email and password inputs', () => {
      renderLoginPage();
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/password/i)).toBeRequired();
    });

    it('shows sign-in error from Supabase', async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid email or password' },
      });

      renderLoginPage();
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in|entrar|login/i }));

      expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    });

    it('navigates to /now after successful login with profile', async () => {
      const session = makeSession();
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: session.user, session },
        error: null,
      });
      mockUsersProfile({
        id: 'user-123',
        role: 'normal',
        preferred_language: 'br',
      });

      renderLoginPage();
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in|entrar|login/i }));

      await waitForDom(() => expect(mockNavigate).toHaveBeenCalledWith('/now'));
    });

    it('signs out and shows profile error when users row is missing', async () => {
      const session = makeSession();
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: session.user, session },
        error: null,
      });
      mockUsersProfile(null, { message: 'not found' });

      renderLoginPage();
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in|entrar|login/i }));

      expect(await screen.findByText(/user profile not found/i)).toBeInTheDocument();
      expect(mocks.signOut).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('/now');
    });
  });
});
