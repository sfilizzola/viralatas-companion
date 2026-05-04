import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import styles from './AuthPage.module.css';

export default function LoginPage() {
  const { t } = useI18n('AuthPage');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    navigate('/now');
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
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? t('loginLoading') : t('loginAction')}
          </button>
        </form>

        <p className={styles.footer}>
          {t('needAccount')}{' '}
          <Link to="/register">{t('createAccount')}</Link>
        </p>
      </div>
    </div>
  );
}
