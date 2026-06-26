import type { CampLocation } from '../../types';
import { useI18n } from '../../lib/i18n';
import CampPinIcon from '../icons/CampPinIcon';
import CampLocationSheet from './CampLocationSheet';
import { useCampLocationActions } from './useCampLocationActions';
import styles from './CampNavStrip.module.css';

type HintKey = 'campHqHint' | 'campMapHint';

type CampNavStripProps = {
  location: CampLocation;
  showTape?: boolean;
  hintKey?: HintKey;
  variant?: 'mural' | 'map';
  ariaLabel?: string;
};

export default function CampNavStrip({
  location,
  showTape = true,
  hintKey = 'campHqHint',
  variant = 'mural',
  ariaLabel,
}: CampNavStripProps) {
  const { t } = useI18n('CampLocation');
  const { sheetOpen, closeSheet, openMaps, pressHandlers } = useCampLocationActions(location);

  const stripClass = [styles.strip, variant === 'map' ? styles.stripMap : ''].filter(Boolean).join(' ');

  return (
    <>
      <button
        type="button"
        className={stripClass}
        aria-label={ariaLabel ?? t('campHqTitle')}
        {...pressHandlers}
      >
        {showTape && <span className={styles.tape} aria-hidden="true" />}
        <CampPinIcon size={variant === 'map' ? 18 : 20} className={styles.icon} />
        <div className={styles.text}>
          <span className={styles.title}>{t('campHqTitle')}</span>
          <span className={styles.hint}>{t(hintKey)}</span>
        </div>
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
      </button>
      {sheetOpen && (
        <CampLocationSheet location={location} onClose={closeSheet} onOpenMaps={openMaps} />
      )}
    </>
  );
}
