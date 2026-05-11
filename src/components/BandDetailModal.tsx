import { useEffect, useRef, type ReactNode } from 'react';
import type { Band } from '../types';
import type { BandAttendee } from '../hooks/useBandAttendees';
import { stageColor } from '../services/stageColors';
import { bandDay, formatTime } from '../services/bandTime';
import { useI18n } from '../lib/i18n';
import Icon from './icons/Icon';
import styles from './BandDetailModal.module.css';

type Props = {
  band: Band;
  attendees: BandAttendee[];
  isPicked: boolean;
  onTogglePick: () => void;
  onClose: () => void;
  children?: ReactNode;
  isBandEnded?: boolean;
  missedUserIds?: Set<string>;
  isMissed?: boolean;
  onToggleMissed?: () => void;
  conflictBands?: Band[];
  overlapBands?: Band[];
};

export default function BandDetailModal({
  band,
  attendees,
  isPicked,
  onTogglePick,
  onClose,
  children,
  isBandEnded = false,
  missedUserIds,
  isMissed = false,
  onToggleMissed,
  conflictBands,
  overlapBands,
}: Props) {
  const { t } = useI18n('SchedulePage');
  const backdropRef = useRef<HTMLDivElement>(null);
  const color = stageColor(band.stage);
  const pickedCount = attendees.length;
  const sawAttendees = attendees.filter((a) => !missedUserIds?.has(a.id));
  const seenCount = isBandEnded ? sawAttendees.length : null;
  const dateLabel = formatBandDate(band);
  const timeLabel = `${formatTime(band.start_time)} - ${formatTime(band.end_time)}`;

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
        <div className={styles.hero} style={{ background: color }} />

        <div className={styles.head}>
          <div className={styles.stage} style={{ color }}>
            {band.stage}
          </div>
          <h2 className={styles.name}>{band.name}</h2>
          <div className={styles.info}>
            <span>{dateLabel}</span>
            <span>{timeLabel}</span>
            {band.genre && <span>{band.genre}</span>}
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.statPair}>
            <div className={styles.stat}>
              <div className={styles.statKey}>{t('pickedStat')}</div>
              <div className={styles.statValue}>{pickedCount}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statKey}>{t('actuallySawStat')}</div>
              <div className={styles.statValue}>
                {seenCount ?? '--'}
                {seenCount !== null && <small>/ {pickedCount}</small>}
              </div>
            </div>
          </div>

          {isBandEnded ? (
            <CrewList
              title={t('whoSaw')}
              count={seenCount ?? 0}
              attendees={attendees}
              missedUserIds={missedUserIds}
              missedLabel={t('missedShort')}
            />
          ) : (
            <CrewList title={t('whoPicked')} count={pickedCount} attendees={attendees} />
          )}

          {conflictBands && conflictBands.length > 0 && isPicked && (
            <div className={styles.conflictWarning}>
              <Icon name="conflict" size={18} strokeWidth={2.2} />
              {conflictBands.map((cb) => (
                <span key={cb.id}>
                  {t('conflictWarning', { name: `${cb.name} (${cb.stage})` })}
                </span>
              ))}
            </div>
          )}

          {overlapBands && overlapBands.length > 0 && isPicked && (
            <div className={styles.overlapWarning}>
              <Icon name="conflict" size={18} strokeWidth={2.2} />
              {overlapBands.map((ob) => (
                <span key={ob.id}>
                  {t('overlapWarning', { name: `${ob.name} (${ob.stage})` })}
                </span>
              ))}
            </div>
          )}

          {children}

          {isPicked && isBandEnded && onToggleMissed && (
            <div className={styles.seenToggle}>
              <div className={styles.seenToggleLabel}>
                {isMissed ? t('missedMarked') : t('missedToggle')}
                <small>{t('missedAvailableAfter', { time: formatTime(band.end_time) })}</small>
              </div>
              <button
                className={`${styles.toggleTrack} ${isMissed ? styles.toggleTrackOn : ''}`}
                onClick={onToggleMissed}
                type="button"
                aria-pressed={isMissed}
                aria-label={isMissed ? t('missedUndo') : t('missedToggle')}
              >
                <span />
              </button>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button className={`${styles.actionButton} ${styles.actionButtonGhost}`} onClick={onClose} type="button">
            {t('closeModal')}
          </button>
          <button
            className={`${styles.actionButton} ${styles.actionButtonPrimary} ${isPicked ? styles.actionButtonPicked : ''}`}
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

type CrewListProps = {
  title: string;
  count: number;
  attendees: BandAttendee[];
  missedUserIds?: Set<string>;
  missedLabel?: string;
};

function CrewList({ title, count, attendees, missedUserIds, missedLabel }: CrewListProps) {
  const { t } = useI18n('SchedulePage');

  return (
    <section className={styles.whoList}>
      <h3>
        <b className={styles.whoLabel}>{title}</b>
        <span className={styles.whoCount}>{count}</span>
      </h3>
      {attendees.length > 0 ? (
        <ul className={styles.whoRows}>
          {attendees.map((attendee) => {
            const missed = missedUserIds?.has(attendee.id) ?? false;
            return (
              <li
                className={`${styles.whoRow} ${missedUserIds ? (missed ? styles.noShow : styles.saw) : ''}`}
                key={attendee.id}
              >
                <Avatar attendee={attendee} />
                <span className={styles.attendeeName}>
                  {attendee.label}
                  {missed && missedLabel ? ` · ${missedLabel}` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.attendeeEmpty}>{t('noCrewYet')}</p>
      )}
    </section>
  );
}

function Avatar({ attendee }: { attendee: BandAttendee }) {
  if (attendee.avatar_url) {
    return <img className={styles.attendeeAvatar} src={attendee.avatar_url} alt="" loading="lazy" />;
  }

  return (
    <span className={styles.attendeeAvatar} aria-hidden>
      {initials(attendee.label)}
    </span>
  );
}

function initials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

function formatBandDate(band: Band) {
  const [year, month, day] = bandDay(band).split('-');
  return `${day}/${month}/${year}`;
}
