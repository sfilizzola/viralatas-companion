import { useCallback, useState } from 'react';
import { useActiveFestival } from '../../hooks/useActiveFestival';
import { hasRunningOrder } from '../../lib/festivalFeatures';
import { festivalsRepository } from '../../repositories/festivals';
import styles from '../../pages/ProfilePage.module.css';

type RunningOrderSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
};

export default function RunningOrderSection({ t }: RunningOrderSectionProps) {
  const { festival } = useActiveFestival();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = useCallback(async () => {
    if (!festival) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(t('runningOrderNeedSignal'));
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await festivalsRepository.setRunningOrder(festival.id, !hasRunningOrder(festival));
    } catch {
      setError(t('runningOrderError'));
    } finally {
      setIsLoading(false);
    }
  }, [festival, t]);

  if (!festival) return null;

  const label = t('runningOrderToggle', { festival: festival.name });
  const isOn = hasRunningOrder(festival);

  return (
    <div className={styles.ffCard}>
      <div className={styles.ffList}>
        <div className={styles.ffRow}>
          <div className={styles.ffRowLeft}>
            <span className={styles.ffLabel}>{label}</span>
            <button
              className={styles.ffHintBtn}
              type="button"
              aria-label="Info"
              tabIndex={0}
              data-hint={t('runningOrderHint')}
            >
              ?
            </button>
          </div>
          <button
            className={`${styles.ffPill} ${isOn ? styles.ffOn : styles.ffOff}`}
            onClick={handleToggle}
            disabled={isLoading}
            type="button"
            aria-pressed={isOn}
            aria-label={label}
          />
          {error && <span className={styles.ffRowError}>{error}</span>}
        </div>
      </div>
    </div>
  );
}
