import { useState, type FormEvent, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { getRegistrationEnabled } from '../lib/appSettings';
import styles from './AuthPage.module.css';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

type ForgotStep = 'idle' | 'confirm' | 'sent';

export default function LoginPage() {
  const { t } = useI18n('AuthPage');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('idle');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    getRegistrationEnabled().then(setRegistrationEnabled);
  }, []);

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setForgotError(null);
    setForgotLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${globalThis.location.origin}/reset-password`,
      });
      if (resetError) {
        setForgotError(resetError.message);
      } else {
        setForgotStep('sent');
      }
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Login failed: no user data returned');
        setLoading(false);
        return;
      }

      // Verify user profile exists with retry for trigger latency
      let userProfile = null;
      let profileError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { data: userRecord, error: queryError } = await supabase
            .from('users')
            .select('id, role, preferred_language')
            .eq('id', data.user.id)
            .single();

          if (!queryError && userRecord) {
            userProfile = userRecord;
            break;
          }

          profileError = queryError;
        } catch (err) {
          profileError = err;
        }

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 200 + attempt * 100));
        }
      }

      if (profileError || !userProfile) {
        setError(
          'User profile not found. Please contact support if this persists.'
        );
        console.error('Profile load failed:', profileError);
        // Sign out to prevent stale session
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      navigate('/now');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('appTitle')}</h1>
        <p className={styles.subtitle}>{t('loginTitle')}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            {t('email')}
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className={styles.label}>
            {t('password')}
            <div className={styles.inputWrap}>
              <input
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.pwToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? t('loginLoading') : t('loginAction')}
          </button>
        </form>

        {forgotStep === 'idle' && (
          <p className={styles.footer}>
            <button
              className={styles.linkButton}
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setForgotStep('confirm');
                setForgotError(null);
              }}
            >
              {t('forgotPassword')}
            </button>
          </p>
        )}

        {forgotStep === 'confirm' && (
          <form onSubmit={handleForgotSubmit} className={styles.forgotBox}>
            <p className={styles.forgotQuestion}>{t('forgotPasswordConfirm')}</p>
            <label className={styles.label}>
              {t('email')}
              <input
                className={styles.input}
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            {forgotError && <p className={styles.error}>{forgotError}</p>}
            <div className={styles.forgotActions}>
              <button
                className={styles.buttonSecondary}
                type="button"
                onClick={() => setForgotStep('idle')}
              >
                {t('cancelAction')}
              </button>
              <button className={styles.button} type="submit" disabled={forgotLoading}>
                {forgotLoading ? t('sendingResetLink') : t('sendResetLink')}
              </button>
            </div>
          </form>
        )}

        {forgotStep === 'sent' && (
          <p className={styles.forgotSent}>{t('resetLinkSent')}</p>
        )}

        {registrationEnabled && forgotStep === 'idle' && (
          <p className={styles.footer}>
            {t('needAccount')}{' '}
            <Link to="/register">{t('createAccount')}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
