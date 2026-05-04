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

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, preferred_language: language } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        email,
        display_name: displayName || null,
        preferred_language: language,
      });
    }

    navigate('/now');
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
