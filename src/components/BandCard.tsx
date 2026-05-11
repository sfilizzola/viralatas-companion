import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Band } from '../types';
import type { BandAttendee } from '../hooks/useBandAttendees';
import { stageColorVar } from '../services/stageColors';
import { formatTime } from '../services/bandTime';
import { useI18n } from '../lib/i18n';
import StarIcon from './icons/StarIcon';
import styles from './BandCard.module.css';

export type BandCardVariant = 'schedule' | 'timeline' | 'ranked';

type BandCardProps = {
  band: Band;
  isPicked: boolean;
  count: number;
  onToggle: () => void;
  onClick?: () => void;
  variant?: BandCardVariant;
  rank?: number;
  conflict?: { severity: 'hard' | 'soft'; active: boolean; onClick: () => void };
  attendeeCluster?: { attendees: BandAttendee[]; max?: number };
  pending?: boolean;
  children?: ReactNode;
};

export default function BandCard({
  band,
  isPicked,
  count,
  onToggle,
  onClick,
  variant = 'schedule',
  rank,
  conflict,
  attendeeCluster,
  pending,
  children,
}: BandCardProps) {
  const { t } = useI18n('SchedulePage');
  const color = stageColorVar(band.stage);
  const initial = band.name.charAt(0).toUpperCase();
  const interactive = Boolean(onClick);
  const showPick = variant !== 'ranked';

  // Pop animation only fires on user toggle, not on initial render or
  // realtime updates from other clients.
  const [popping, setPopping] = useState(false);
  const userToggledRef = useRef(false);
  useEffect(() => {
    if (!userToggledRef.current) return;
    userToggledRef.current = false;
    setPopping(true);
    const id = window.setTimeout(() => setPopping(false), 320);
    return () => window.clearTimeout(id);
  }, [isPicked]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }

  const variantClass =
    variant === 'timeline'
      ? styles.variantTimeline
      : variant === 'ranked'
        ? styles.variantRanked
        : styles.variantSchedule;

  const cardClasses = [
    styles.card,
    variantClass,
    interactive ? '' : styles.cardStatic,
    conflict?.active ? (conflict.severity === 'hard' ? styles.cardHardConflict : styles.cardSoftOverlap) : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={cardClasses}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-pressed={interactive ? isPicked : undefined}
    >
      <div className={styles.stripe} style={{ background: color }} aria-hidden />

      {variant === 'schedule' && (
        <div className={styles.thumb} style={{ background: color }} aria-hidden>
          {band.image_url ? (
            <img
              src={band.image_url}
              alt=""
              className={styles.thumbImg}
              loading="lazy"
            />
          ) : (
            initial
          )}
        </div>
      )}

      {variant === 'timeline' && (
        <div className={styles.when} aria-hidden>
          <div className={styles.whenStart}>{formatTime(band.start_time)}</div>
          <div className={styles.whenEnd}>{formatTime(band.end_time)}</div>
        </div>
      )}

      {variant === 'ranked' && (
        <div
          className={`${styles.rank} ${rank !== undefined && rank <= 3 ? styles.rankTop : ''}`}
          aria-hidden
        >
          {rank !== undefined ? String(rank).padStart(2, '0') : ''}
        </div>
      )}

      <div className={`${styles.body} ${variant === 'ranked' ? styles.bodyRanked : ''}`}>
        <h2 className={styles.bandName}>{band.name}</h2>
        <div className={styles.meta}>
          <span className={styles.stageBadge} style={{ background: color }}>
            {band.stage}
          </span>
          {variant !== 'timeline' && (
            <span className={styles.time}>
              {formatTime(band.start_time)} – {formatTime(band.end_time)}
            </span>
          )}
          {count > 0 && (
            <span className={styles.going}>
              <b>{count}</b> {t('goingLabel')}
            </span>
          )}
          {variant === 'timeline' && conflict && (
            <button
              type="button"
              className={`${
                conflict.severity === 'hard' ? styles.conflictChipHard : styles.overlapChip
              } ${
                conflict.severity === 'hard'
                  ? conflict.active ? styles.conflictChipHardActive : ''
                  : conflict.active ? styles.overlapChipActive : ''
              }`}
              onClick={(event) => {
                event.stopPropagation();
                conflict.onClick();
              }}
              aria-pressed={conflict.active}
            >
              ⚠ {t(conflict.severity === 'hard' ? 'conflictChip' : 'overlapChip')}
            </button>
          )}
          {band.genre && variant === 'schedule' && (
            <span className={styles.genre}>{band.genre}</span>
          )}
          {pending && <span className="pending-chip">{t('pendingSync')}</span>}
        </div>
        {attendeeCluster && variant === 'ranked' && (
          <AttendeeCluster {...attendeeCluster} count={count} />
        )}
        {children}
      </div>

      {showPick && (
        <button
          type="button"
          className={`${styles.pick} ${isPicked ? styles.pickActive : ''} ${
            popping ? styles.pickAnimating : ''
          }`}
          onClick={(event) => {
            event.stopPropagation();
            userToggledRef.current = true;
            onToggle();
          }}
          aria-label={isPicked ? t('removePick') : t('addPick')}
          aria-pressed={isPicked}
        >
          <StarIcon filled={isPicked} />
        </button>
      )}
    </article>
  );
}

function AttendeeCluster({
  attendees,
  max = 5,
  count,
}: {
  attendees: BandAttendee[];
  max?: number;
  count: number;
}) {
  const { t } = useI18n('SchedulePage');
  if (attendees.length === 0) return null;
  const visible = attendees.slice(0, max);
  const overflow = attendees.length - visible.length;

  return (
    <div className={styles.attendeeCluster}>
      <div className={styles.attendeeAvatars}>
        {visible.map((a) =>
          a.avatar_url ? (
            <img
              key={a.id}
              className={styles.attendeeAvatar}
              src={a.avatar_url}
              alt=""
              loading="lazy"
            />
          ) : (
            <span key={a.id} className={styles.attendeeAvatar} aria-hidden>
              {a.label.charAt(0).toUpperCase()}
            </span>
          ),
        )}
        {overflow > 0 && (
          <span className={styles.attendeeOverflow}>
            {t('attendeeOverflow', { count: overflow })}
          </span>
        )}
      </div>
      <span className={styles.attendeeCount}>
        <b>{count}</b>
        {t('goingLabel')}
      </span>
    </div>
  );
}
