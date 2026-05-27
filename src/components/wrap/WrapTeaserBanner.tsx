import { useCallback, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { dismissWrapTeaser } from '../../lib/wrapDismiss';
import styles from './WrapTeaserBanner.module.css';

type WrapTeaserBannerProps = {
  onDismiss?: () => void;
};

export default function WrapTeaserBanner({ onDismiss }: WrapTeaserBannerProps) {
  const { t } = useI18n('WrapPage');
  const [hidden, setHidden] = useState(false);

  const handleDismiss = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dismissWrapTeaser();
      setHidden(true);
      onDismiss?.();
    },
    [onDismiss],
  );

  if (hidden) return null;

  return (
    <div className={styles.bar}>
      <div className={styles.topAccent} aria-hidden="true" />
      <Link to="/wrap" className={styles.linkArea}>
        <div className={styles.patches} aria-hidden="true">
          <span className={styles.patch} data-stage="faster" />
          <span className={styles.patch} data-stage="harder" />
          <span className={styles.patch} data-stage="louder" />
        </div>
        <div className={styles.copy}>
          <span className={styles.kicker}>{t('teaserKicker')}</span>
          <span className={styles.headline}>{t('teaserHeadline')}</span>
          <span className={styles.cta}>{t('teaserCta')}</span>
        </div>
      </Link>
      <button
        type="button"
        className={styles.dismiss}
        onClick={handleDismiss}
        aria-label={t('teaserDismiss')}
      >
        ×
      </button>
    </div>
  );
}
