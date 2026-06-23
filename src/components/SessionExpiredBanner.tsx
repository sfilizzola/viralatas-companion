import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../hooks/useAuth';
import {
  dismissSessionExpiredBanner,
  isSessionExpiredBannerDismissed,
} from '../lib/authSessionFlags';
import { useState } from 'react';
import styles from './SessionExpiredBanner.module.css';

export default function SessionExpiredBanner() {
  const { t } = useI18n('AuthPage');
  const { sessionExpired, hadIdbSession } = useAuth();
  const [dismissed, setDismissed] = useState(() => isSessionExpiredBannerDismissed());

  if (!sessionExpired || !hadIdbSession || dismissed) return null;

  function handleDismiss() {
    dismissSessionExpiredBanner();
    setDismissed(true);
  }

  return (
    <div className={styles.banner} role="alert">
      <span className={styles.message}>{t('sessionExpired')}</span>
      <div className={styles.actions}>
        <Link to="/login" className={styles.link}>
          {t('sessionExpiredSignIn')}
        </Link>
        <button type="button" className={styles.dismiss} onClick={handleDismiss}>
          {t('sessionExpiredDismiss')}
        </button>
      </div>
    </div>
  );
}
