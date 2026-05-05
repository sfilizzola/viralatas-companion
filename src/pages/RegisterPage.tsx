import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import styles from './AuthPage.module.css';

export default function RegisterPage() {
  const { language, t } = useI18n('AuthPage');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || null,
            preferred_language: language,
            is_test_user: false,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Registration failed: no user data returned');
        setLoading(false);
        return;
      }

      // Trigger's handle_new_user() creates the users table record automatically.
      // We verify it exists before navigating, with retry for trigger latency.
      let userExists = false;
      let lastError: any = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const { data: userRecord, error: queryError } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (!queryError && userRecord) {
            userExists = true;
            break;
          }

          lastError = queryError;
        } catch (err) {
          // .single() throws if 0 or multiple rows returned
          lastError = err;
          console.error(`Profile check attempt ${attempt + 1}/4 failed:`, err);
        }

        if (attempt < 3) {
          const delay = 200 + attempt * 100; // 200ms, 300ms, 400ms
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (!userExists) {
        const errorMsg =
          lastError?.message ||
          'User registration completed but profile synchronization failed. Please refresh and try logging in.';
        console.error('User profile creation failed:', lastError);
        setError(errorMsg);
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
        <p className={styles.subtitle}>{t('registerTitle')}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            {t('crewName')}
            <input
              className={styles.input}
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('crewNamePlaceholder')}
              autoComplete="nickname"
              maxLength={30}
            />
          </label>

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
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? t('registerLoading') : t('registerAction')}
          </button>
        </form>

        <p className={styles.footer}>
          {t('hasAccount')}{' '}
          <Link to="/login">{t('loginLink')}</Link>
        </p>
      </div>
    </div>
  );
}
