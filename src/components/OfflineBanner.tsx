import { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import styles from './OfflineBanner.module.css';

export default function OfflineBanner() {
  const { t } = useI18n('OfflineBanner');
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    function handleOnline() { setOffline(false); }
    function handleOffline() { setOffline(true); }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      {t('offlineMessage')}
    </div>
  );
}
