import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nContext } from '../lib/i18n';

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mocks.signUp,
    },
    from: mocks.from,
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import RegisterPage from '../pages/RegisterPage';
import * as appSettings from '../lib/appSettings';

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <I18nContext.Provider value={{ language: 'en', setLanguage: () => {} }}>
        <RegisterPage />
      </I18nContext.Provider>
    </MemoryRouter>,
  );
}

function mockUsersProfileExists(exists: boolean) {
  const single = vi.fn().mockResolvedValue({
    data: exists ? { id: 'new-user-id' } : null,
    error: exists ? null : { message: 'not found' },
  });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  mocks.from.mockReturnValue({ select });
}

function mockAppSettingsQuery(registrationEnabled: boolean | null, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({
    data: registrationEnabled === null ? null : { registration_enabled: registrationEnabled },
    error,
  });
  const limit = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ limit });
  mocks.from.mockReturnValue({ select });
}

describe('User Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(appSettings, 'getRegistrationEnabled').mockResolvedValue(true);
    mocks.signUp.mockResolvedValue({
      data: { user: { id: 'new-user-id', email: 'test@example.com' } },
      error: null,
    });
    mockUsersProfileExists(true);
  });

  describe('getRegistrationEnabled (appSettings)', () => {
    it('returns registration_enabled from app_settings', async () => {
      vi.restoreAllMocks();
      mockAppSettingsQuery(false);

      await expect(appSettings.getRegistrationEnabled()).resolves.toBe(false);
    });

    it('defaults to true when fetch fails (offline-first)', async () => {
      vi.restoreAllMocks();
      mockAppSettingsQuery(null, { message: 'network' });

      await expect(appSettings.getRegistrationEnabled()).resolves.toBe(true);
    });
  });

  describe('RegisterPage', () => {
    it('redirects to login when registration is disabled', async () => {
      vi.spyOn(appSettings, 'getRegistrationEnabled').mockResolvedValue(false);
      renderRegisterPage();

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true }));
    });

    it('enforces minimum password length via HTML constraint', async () => {
      renderRegisterPage();
      await waitFor(() => expect(screen.getByLabelText(/password/i)).toBeInTheDocument());

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('minLength', '8');
      expect(passwordInput).toBeRequired();
    });

    it('requires a valid email address', async () => {
      renderRegisterPage();
      await waitFor(() => expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument());

      const emailInput = screen.getByLabelText(/^email$/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toBeRequired();
    });

    it('signs up with normalized metadata and navigates on profile sync', async () => {
      renderRegisterPage();
      await waitFor(() => expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText(/vira-latas name/i), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /create account|criar conta|register/i }));

      await waitFor(() => {
        expect(mocks.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          options: {
            data: {
              display_name: null,
              preferred_language: 'en',
              is_test_user: false,
            },
          },
        });
      });

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/now'));
    });

    it('passes display_name when provided', async () => {
      renderRegisterPage();
      await waitFor(() => expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText(/vira-latas name/i), { target: { value: 'Metal Fan' } });
      fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'fan@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /create account|criar conta|register/i }));

      await waitFor(() => {
        expect(mocks.signUp).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.objectContaining({
              data: expect.objectContaining({ display_name: 'Metal Fan' }),
            }),
          }),
        );
      });
    });

    it('surfaces signup errors from Supabase', async () => {
      mocks.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already exists' },
      });

      renderRegisterPage();
      await waitFor(() => expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'dup@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /create account|criar conta|register/i }));

      expect(await screen.findByText('Email already exists')).toBeInTheDocument();
    });
  });
});
