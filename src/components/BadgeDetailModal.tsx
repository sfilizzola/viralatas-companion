import { useState } from 'react';
import type { BadgeConfig } from '../services/badges/types';
import { useI18n } from '../lib/i18n';
import { Modal } from '../ui';
import { badgeYearSuffix } from './badges/PatchTile';
import styles from './BadgesDisplay.module.css';

type BadgeDetailModalProps = {
  badge: BadgeConfig;
  onClose: () => void;
};

export default function BadgeDetailModal({ badge, onClose }: BadgeDetailModalProps) {
  const { t } = useI18n('Badges');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const label = t(badge.labelKey);

  function handleClose() {
    setIsFullscreen(false);
    onClose();
  }

  return (
    <>
      <Modal onClose={handleClose} contentClassName={styles.modalContent}>
        <div className={styles.modalPatch}>
          <img
            src={badge.imagePath}
            alt={label}
            className={styles.modalImg}
          />
          {badge.year && (
            <span className={styles.modalYearChip}>{badgeYearSuffix(badge.year)}</span>
          )}
          <button
            type="button"
            className={styles.zoomBtn}
            onClick={() => setIsFullscreen(true)}
            aria-label="View badge fullscreen"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.8" />
              <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <h3 className={styles.modalName}>{label}</h3>
        <p className={styles.modalDesc}>{t(badge.descriptionKey)}</p>
      </Modal>

      {isFullscreen && (
        <button
          type="button"
          className={styles.fullscreenOverlay}
          onClick={() => setIsFullscreen(false)}
          aria-label={`Close fullscreen view of ${label}`}
        >
          <img
            src={badge.imagePath}
            alt={label}
            className={styles.fullscreenImg}
          />
          {badge.year && (
            <span className={styles.fullscreenYearChip}>{badgeYearSuffix(badge.year)}</span>
          )}
          <span className={styles.fullscreenClose} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="2" x2="2" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      )}
    </>
  );
}
