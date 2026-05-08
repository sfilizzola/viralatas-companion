import { useEffect, useRef, type ReactNode } from 'react';
import type { Band } from '../types';
import type { BandAttendee } from '../hooks/useBandAttendees';
import { stageColor } from '../lib/stageColors';
import { formatTime } from '../lib/bandTime';
import { useI18n } from '../lib/i18n';
import styles from './BandDetailModal.module.css';

type Props = {
  band: Band;
  attendees: BandAttendee[];
  isPicked: boolean;
  onTogglePick: () => void;
  onClose: () => void;
  children?: ReactNode;
};

export default function BandDetailModal({
  band,
  attendees,
  isPicked,
  onTogglePick,
  onClose,
  children,
}: Props) {
  const { t } = useI18n('SchedulePage');
  const backdropRef = useRef<HTMLDivElement>(null);
  const color = stageColor(band.stage);
  const initial = band.name.charAt(0).toUpperCase();

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  return (
    <div
      className={styles.backdrop}
      ref={backdropRef}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={band.name}>
        <div className={styles.imageWrap}>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={t('closeModal')}
            type="button"
          >
            <CloseIcon />
          </button>
          {band.image_url ? (
            <img src={band.image_url} alt={band.name} className={styles.image} />
          ) : (
            <div className={styles.imagePlaceholder} style={{ background: color }}>
              {initial}
            </div>
          )}
        </div>

        <div className={styles.body}>
          <h2 className={styles.name}>{band.name}</h2>

          <div className={styles.metaRow}>
            <span className={styles.stageBadge} style={{ background: color }}>
              {band.stage}
            </span>
            {band.genre && <span className={styles.genre}>{band.genre}</span>}
            <span className={styles.time}>
              {formatTime(band.start_time)} – {formatTime(band.end_time)}
            </span>
          </div>

          <div className={styles.attendeesSection}>
            <h3 className={styles.attendeesTitle}>
              {t('crewGoing', { count: attendees.length })}
            </h3>
            {attendees.length > 0 ? (
              <ul className={styles.attendeeList}>
                {attendees.map((a) => (
                  <li className={styles.attendee} key={a.id}>
                    {a.avatar_url ? (
                      <img
                        className={styles.attendeeAvatar}
                        src={a.avatar_url}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span className={styles.attendeeAvatar} aria-hidden>
                        {a.label.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className={styles.attendeeName}>{a.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.attendeeEmpty}>{t('noCrewYet')}</p>
            )}
          </div>

          {children}

          <button
            className={`${styles.pickButton} ${isPicked ? styles.pickButtonActive : ''}`}
            onClick={onTogglePick}
            type="button"
          >
            {isPicked ? t('removePick') : t('addPick')}
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
