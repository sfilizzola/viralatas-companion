import { type KeyboardEvent, type ReactNode } from 'react';
import type { Band } from '../types';
import type { BandAttendee } from '../hooks/useBandAttendees';
import { stageColor } from '../lib/stageColors';
import { formatTime } from '../lib/bandTime';
import { useI18n } from '../lib/i18n';
import styles from './BandCard.module.css';

type BandCardProps = {
  band: Band;
  isPicked: boolean;
  count: number;
  onToggle: () => void;
  onClick?: () => void;
  dense?: boolean;
  hidePickButton?: boolean;
  conflict?: { active: boolean; onClick: () => void };
  attendeeCluster?: { attendees: BandAttendee[]; max?: number };
  children?: ReactNode;
};

export default function BandCard({
  band,
  isPicked,
  count,
  onToggle,
  onClick,
  dense = false,
  hidePickButton = false,
  conflict,
  attendeeCluster,
  children,
}: BandCardProps) {
  const { t } = useI18n('SchedulePage');
  const color = stageColor(band.stage);
  const initial = band.name.charAt(0).toUpperCase();
  const interactive = Boolean(onClick);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }

  const cardClasses = [
    styles.card,
    interactive ? '' : styles.cardStatic,
    conflict?.active ? styles.cardConflict : '',
  ]
    .filter(Boolean)
    .join(' ');

  const imageClasses = [styles.cardImage, dense ? styles.cardImageDense : '']
    .filter(Boolean)
    .join(' ');

  const metaClasses = [styles.meta, dense ? styles.metaDense : '']
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
      <div className={imageClasses}>
        {band.image_url ? (
          <img src={band.image_url} alt={band.name} className={styles.img} loading="lazy" />
        ) : (
          <div className={styles.imgPlaceholder} style={{ background: color }}>
            {initial}
          </div>
        )}
      </div>

      <div className={styles.cardBody}>
        <h2 className={styles.bandName}>{band.name}</h2>
        {band.genre && <p className={styles.genre}>{band.genre}</p>}
        <div className={metaClasses}>
          <span className={styles.stageBadge} style={{ background: color }}>
            {band.stage}
          </span>
          <span className={styles.time}>
            {formatTime(band.start_time)} – {formatTime(band.end_time)}
          </span>
          <span className={styles.goingCount}>{t('goingCount', { count })}</span>
          {conflict && (
            <button
              type="button"
              className={`${styles.conflictChip} ${conflict.active ? styles.conflictChipActive : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                conflict.onClick();
              }}
              aria-pressed={conflict.active}
            >
              {t('conflictChip')}
            </button>
          )}
        </div>
        {attendeeCluster && <AttendeeCluster {...attendeeCluster} />}
        {children}
      </div>

      {!hidePickButton && (
        <button
          className={`${styles.pickBtn} ${isPicked ? styles.pickBtnActive : ''}`}
          onClick={(event) => {
            event.stopPropagation();
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

function AttendeeCluster({ attendees, max = 4 }: { attendees: BandAttendee[]; max?: number }) {
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
      </div>
      {overflow > 0 && (
        <span className={styles.attendeeOverflow}>{t('attendeeOverflow', { count: overflow })}</span>
      )}
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
