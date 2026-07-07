import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { mapPasswordUpdateError } from '../lib/authPasswordErrors';
import { useI18n } from '../lib/i18n';
import styles from './AuthPage.module.css';

export default function ResetPasswordPage() {
  const { t } = useI18n('AuthPage');
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase sets a recovery session when the user arrives via the email link.
    // The onAuthStateChange PASSWORD_RECOVERY event fires once the token in the
    // URL hash is exchanged for a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if a session already exists (e.g. page was refreshed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(mapPasswordUpdateError(updateError.message, t));
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate('/now'), 1800);
    } catch (err) {
      setError(mapPasswordUpdateError(err instanceof Error ? err.message : '', t));
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('resetPasswordTitle')}</h1>
        <p className={styles.subtitle}>{t('resetPasswordSubtitle')}</p>

        {sessionReady && success && (
          <p className={styles.forgotSent}>{t('resetPasswordSuccess')}</p>
        )}

        {sessionReady && !success && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              {t('newPassword')}
              <input
                className={styles.input}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </label>

            <label className={styles.label}>
              {t('confirmPassword')}
              <input
                className={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? t('resetPasswordLoading') : t('resetPasswordAction')}
            </button>
          </form>
        )}

        {!sessionReady && (
          <p className={styles.error}>{t('resetPasswordNoSession')}</p>
        )}
      </div>
    </div>
  );
}
