import { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';
import styles from './SyncToast.module.css';

export const SYNC_COMPLETE_EVENT = 'viralatas:sync-complete';

export default function SyncToast() {
  const { t } = useI18n('SyncToast');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function handleSync() {
      setVisible(true);
      timer = setTimeout(() => setVisible(false), 3000);
    }

    window.addEventListener(SYNC_COMPLETE_EVENT, handleSync);
    return () => {
      window.removeEventListener(SYNC_COMPLETE_EVENT, handleSync);
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      {t('synced')}
    </div>
  );
}
