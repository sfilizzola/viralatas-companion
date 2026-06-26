import { useCallback, useState } from 'react';
import type { CampLocation } from '../../types';
import { formatCampCoordinates } from '../../services/campLocation';
import { useI18n } from '../../lib/i18n';
import CampPinIcon from '../icons/CampPinIcon';
import styles from './CampLocationSheet.module.css';

type CampLocationSheetProps = {
  location: CampLocation;
  onClose: () => void;
  onOpenMaps: () => void;
};

export default function CampLocationSheet({ location, onClose, onOpenMaps }: CampLocationSheetProps) {
  const { t } = useI18n('CampLocation');
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = formatCampCoordinates(location);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [location]);

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={t('campHqSheetLabel')}
      >
        <div className={styles.handle} />
        <div className={styles.iconWrap}>
          <CampPinIcon size={32} showCross />
        </div>
        <h2 className={styles.title}>{t('campHqSheetLabel')}</h2>
        <div className={styles.coords}>{formatCampCoordinates(location)}</div>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={handleCopy}>
            {t('campHqCopy')}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onOpenMaps}>
            {t('campHqOpenMaps')}
          </button>
        </div>
        {copied && <p className={styles.toast}>{t('campHqCopied')}</p>}
      </div>
    </>
  );
}
