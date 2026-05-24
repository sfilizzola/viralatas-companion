import { useState, useCallback } from 'react';
import { bandsRepository } from '../../repositories';
import styles from '../../pages/ProfilePage.module.css';

type CacheResetSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
};

export default function CacheResetSection({ t }: CacheResetSectionProps) {
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleResetAllData = useCallback(async () => {
    if (!window.confirm(t('resetConfirm'))) return;
    setResetting(true);
    setResetMessage(null);
    try {
      await bandsRepository.invalidateCacheForAllUsers();
      setResetMessage(t('resetSuccess'));
      setTimeout(() => setResetMessage(null), 4000);
    } catch (error) {
      console.error('Reset failed:', error);
      setResetMessage(t('resetError'));
      setTimeout(() => setResetMessage(null), 4000);
    } finally {
      setResetting(false);
    }
  }, [t]);

  return (
    <div className={styles.resetSection}>
      <h4 className={styles.resetSectionTitle}>{t('resetAllData')}</h4>
      <p className={styles.resetSectionDescription}>{t('resetAllDataDescription')}</p>
      {resetMessage && <p className={styles.resetMessage}>{resetMessage}</p>}
      <button
        className={styles.resetDestructiveButton}
        onClick={handleResetAllData}
        disabled={resetting}
        type="button"
      >
        {resetting ? `${t('resetting')} ⏳` : t('resetConfirm')}
      </button>
    </div>
  );
}
