import { useCallback, useState, type MouseEvent } from 'react';
import { useI18n } from '../lib/i18n';
import { dismissMyWackenCoach, isMyWackenCoachDismissed } from '../lib/myWackenCoachDismiss';
import styles from './MyWackenCoachBanner.module.css';

type MyWackenCoachBannerProps = {
  visible: boolean;
};

export default function MyWackenCoachBanner({ visible }: MyWackenCoachBannerProps) {
  const { t } = useI18n('MyPicksPage');
  const [hidden, setHidden] = useState(() => isMyWackenCoachDismissed());

  const handleDismiss = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dismissMyWackenCoach();
    setHidden(true);
  }, []);

  if (!visible || hidden) return null;

  return (
    <aside className={styles.banner} role="note" aria-labelledby="my-wacken-coach-title">
      <button
        type="button"
        className={styles.dismiss}
        onClick={handleDismiss}
        aria-label={t('coachBannerDismiss')}
      >
        ×
      </button>
      <strong id="my-wacken-coach-title" className={styles.title}>
        {t('coachBannerTitle')}
      </strong>
      <p className={styles.body}>{t('coachBannerBody')}</p>
    </aside>
  );
}
