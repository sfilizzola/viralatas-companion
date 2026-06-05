import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Band, BandRatingScore } from '../types';
import type { BandAttendee } from '../hooks/useBandAttendees';
import { stageColorVar } from '../services/stageColors';
import { bandWeekdayKey, formatTime } from '../services/bandTime';
import { getMetalBattleCountryFlag } from '../services/metalBattle';
import { useI18n } from '../lib/i18n';
import { Avatar, Chip } from '../ui';
import StarIcon from './icons/StarIcon';
import PawIcon from './icons/PawIcon';
import QuackGhostRow from './QuackGhostRow';
import styles from './BandCard.module.css';

export type BandCardVariant = 'schedule' | 'timeline' | 'ranked';
export type AttendanceChipKind = 'attended' | 'missed';

type ConflictInfo = { severity: 'hard' | 'soft'; active: boolean; onClick: () => void };

type BandCardProps = {
  band: Band;
  isPicked: boolean;
  count: number;
  onToggle: () => void;
  onClick?: () => void;
  variant?: BandCardVariant;
  rank?: number;
  conflict?: ConflictInfo;
  attendeeCluster?: { attendees: BandAttendee[]; max?: number };
  pending?: boolean;
  hidePick?: boolean;
  isBandEnded?: boolean;
  /** Timeline + My Wacken ended rows only */
  attendanceChip?: AttendanceChipKind;
  missedCount?: number;
  children?: ReactNode;
  /** When provided, renders the duck button (only for live + picked non-ceremony bands) */
  onDuck?: () => void;
  duckCooldownUntil?: number;
  /** Corner weekday label — schedule/ranked when day context is mixed */
  showDayLabel?: boolean;
  ratingStats?: {
    avgFormatted: string;
    count: number;
    userScore?: BandRatingScore;
  };
  /** Crew picks browser: current user also picked this band */
  sharedPick?: boolean;
};

function getVariantClass(variant: BandCardVariant): string {
  if (variant === 'timeline') return styles.variantTimeline;
  if (variant === 'ranked') return styles.variantRanked;
  return styles.variantSchedule;
}

function getConflictCardClass(conflict: ConflictInfo | undefined): string {
  if (!conflict?.active) return '';
  return conflict.severity === 'hard' ? styles.cardHardConflict : styles.cardSoftOverlap;
}

function getConflictChipClass(conflict: ConflictInfo): string {
  const base = conflict.severity === 'hard' ? styles.conflictChipHard : styles.overlapChip;
  if (!conflict.active) return base;
  const activeMod =
    conflict.severity === 'hard' ? styles.conflictChipHardActive : styles.overlapChipActive;
  return `${base} ${activeMod}`;
}

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
  hidePick = false,
  isBandEnded = false,
  attendanceChip,
  missedCount,
  children,
  onDuck,
  duckCooldownUntil,
  showDayLabel = false,
  ratingStats,
  sharedPick = false,
}: Readonly<BandCardProps>) {
  const { t } = useI18n('SchedulePage');
  const { t: tPopular } = useI18n('PopularPage');
  const initial = band.name.charAt(0).toUpperCase();
  const interactive = Boolean(onClick);
  const showPick = variant !== 'ranked' && !hidePick;

  // Pop animation only fires on user toggle, not on initial render or
  // realtime updates from other clients.
  const [popping, setPopping] = useState(false);
  const userToggledRef = useRef(false);
  useEffect(() => {
    if (!userToggledRef.current) return;
    userToggledRef.current = false;
    setPopping(true);
    const id = globalThis.setTimeout(() => setPopping(false), 320);
    return () => globalThis.clearTimeout(id);
  }, [isPicked]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }

  const isCeremony = band.category === 'ceremony';
  const color = isCeremony ? 'var(--ceremony-gold)' : stageColorVar(band.stage);
  const thumbFallback = isCeremony ? '✦' : initial;
  const showDuck = Boolean(onDuck) && !isCeremony;
  const showDayGhost =
    showDayLabel && (variant === 'schedule' || variant === 'ranked');

  const showAttendanceChip = variant === 'timeline' && attendanceChip !== undefined;

  const cardClasses = [
    styles.card,
    getVariantClass(variant),
    isCeremony ? styles.cardCeremony : '',
    interactive ? '' : styles.cardStatic,
    getConflictCardClass(conflict),
    showAttendanceChip && attendanceChip === 'attended' ? styles.cardAttended : '',
    showAttendanceChip && attendanceChip === 'missed' ? styles.cardMissed : '',
    variant === 'timeline' && isBandEnded && !showAttendanceChip ? styles.cardEnded : '',
    sharedPick ? styles.cardSharedPick : '',
  ]
    .filter(Boolean)
    .join(' ');

  const stripeClass =
    attendanceChip === 'attended'
      ? styles.stripeAttended
      : attendanceChip === 'missed'
        ? styles.stripeMissed
        : styles.stripe;

  return (
    // The card-as-button pattern is intentional: nested action buttons (star,
    // duck, conflict chip) preclude wrapping the whole card in a real
    // <button>. Keyboard activation + aria-pressed provide accessibility.
    <article // NOSONAR
      className={cardClasses}
      role={interactive ? 'button' : undefined} // NOSONAR
      tabIndex={interactive ? 0 : undefined} // NOSONAR
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-pressed={interactive ? isPicked : undefined}
      style={{ '--stage-color': color } as React.CSSProperties}
    >
      <div className={stripeClass} aria-hidden />

      {variant === 'schedule' && (
        <CardThumb imageUrl={band.image_url} fallback={thumbFallback} />
      )}

      {variant === 'timeline' && (
        <CardWhen startTime={band.start_time} endTime={band.end_time} />
      )}

      {variant === 'ranked' && <RankBadge rank={rank} />}

      <div
        className={[
          styles.body,
          variant === 'ranked' ? styles.bodyRanked : '',
          showDayGhost ? styles.bodyWithDayGhost : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {showDayGhost && (
          <span className={styles.dayGhost} aria-hidden>
            {t(bandWeekdayKey(band))}
          </span>
        )}
        <h2 className={styles.bandName}>{band.name}</h2>
        <div
          className={[
            styles.meta,
            showAttendanceChip ? styles.metaWithAttendance : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {isCeremony ? (
            <span className={styles.ceremonyLabel}>
              ✦ {t('scheduleClosingCeremony')}
            </span>
          ) : (
            <Chip className={styles.stageBadge}>{band.stage}</Chip>
          )}
          {variant !== 'timeline' && (
            <span className={styles.time}>
              {formatTime(band.start_time)} – {formatTime(band.end_time)}
            </span>
          )}
          {count > 0 && variant !== 'ranked' && !showAttendanceChip && (
            <span className={styles.going}>
              <AttendanceText
                count={count}
                isBandEnded={isBandEnded}
                missedCount={missedCount}
              />
            </span>
          )}
          {variant === 'timeline' && conflict && <ConflictChip conflict={conflict} />}
          {showAttendanceChip && <AttendanceChip kind={attendanceChip} />}
          {band.genre && variant === 'schedule' && (
            <span className={styles.genre}>
              {band.genre === 'Metal Battle'
                ? `${getMetalBattleCountryFlag(band.slot_id) ?? ''} Metal Battle`.trim()
                : band.genre}
            </span>
          )}
          {pending && <span className="pending-chip">{t('pendingSync')}</span>}
        </div>

        {attendeeCluster && variant === 'ranked' && !ratingStats && (
          <AttendeeCluster
            {...attendeeCluster}
            count={count}
            isBandEnded={isBandEnded}
            missedCount={missedCount}
          />
        )}
        {ratingStats && variant === 'ranked' && (
          <RatingStats
            avgFormatted={ratingStats.avgFormatted}
            count={ratingStats.count}
            userScore={ratingStats.userScore}
            countLabel={tPopular('ratingCount', { count: ratingStats.count })}
            youLabel={
              ratingStats.userScore !== undefined
                ? tPopular('ratingYouScore', { score: ratingStats.userScore })
                : undefined
            }
            isBandEnded={isBandEnded}
            missedCount={missedCount}
          />
        )}
        {children}
        {sharedPick && (
          <span className={styles.sharedPickBadge}>{t('youAlsoPicked')}</span>
        )}
        {showDuck && onDuck && (
          <QuackGhostRow onDuck={onDuck} cooldownUntil={duckCooldownUntil ?? null} />
        )}
      </div>

      {showPick && (
        <PickButton
          isPicked={isPicked}
          popping={popping}
          onToggle={() => {
            userToggledRef.current = true;
            onToggle();
          }}
        />
      )}
    </article>
  );
}

function CardThumb({
  imageUrl,
  fallback,
}: Readonly<{ imageUrl: string | null | undefined; fallback: string }>) {
  return (
    <div className={styles.thumb} aria-hidden>
      {imageUrl ? (
        <img src={imageUrl} alt="" className={styles.thumbImg} loading="lazy" />
      ) : (
        fallback
      )}
    </div>
  );
}

function CardWhen({
  startTime,
  endTime,
}: Readonly<{ startTime: string; endTime: string }>) {
  return (
    <div className={styles.when} aria-hidden>
      <div className={styles.whenStart}>{formatTime(startTime)}</div>
      <div className={styles.whenEnd}>{formatTime(endTime)}</div>
    </div>
  );
}

function RankBadge({ rank }: Readonly<{ rank: number | undefined }>) {
  if (rank === undefined) return null;
  const topClass = rank <= 3 ? styles.rankTop : '';
  return (
    <div className={`${styles.rank} ${topClass}`} aria-hidden>
      {String(rank).padStart(2, '0')}
    </div>
  );
}

function AttendanceText({
  count,
  isBandEnded,
  missedCount,
}: Readonly<{
  count: number;
  isBandEnded: boolean;
  missedCount: number | undefined;
}>) {
  const { t } = useI18n('SchedulePage');
  if (isBandEnded) {
    const sawCount = missedCount === undefined ? count : count - missedCount;
    const showSkip = missedCount !== undefined && missedCount > 0;
    return (
      <>
        <b>{sawCount}</b> {t('sawLabel')}
        {showSkip && (
          <>
            {' · '}
            <b>{missedCount}</b> {t('skipLabel')}
          </>
        )}
      </>
    );
  }
  return (
    <>
      <b>{count}</b> {t('goingLabel')}
    </>
  );
}

function RatingStats({
  avgFormatted,
  countLabel,
  youLabel,
  isBandEnded,
  missedCount,
}: Readonly<{
  avgFormatted: string;
  count: number;
  userScore?: BandRatingScore;
  countLabel: string;
  youLabel?: string;
  isBandEnded?: boolean;
  missedCount?: number;
}>) {
  const { t } = useI18n('SchedulePage');
  const showMissed = isBandEnded && missedCount !== undefined && missedCount > 0;

  return (
    <div className={styles.ratingCluster}>
      <div className={styles.ratingDetails}>
        <p className={styles.ratingMeta}>{countLabel}</p>
        {youLabel && <p className={styles.ratingYou}>{youLabel}</p>}
        {showMissed && (
          <p className={styles.ratingMissed}>
            <b>{missedCount}</b> {t('skipLabel')}
          </p>
        )}
      </div>
      <div className={styles.ratingHero} aria-label={avgFormatted}>
        <PawIcon filled size={16} />
        <span className={styles.ratingAvg}>{avgFormatted}</span>
      </div>
    </div>
  );
}

function AttendanceChip({ kind }: Readonly<{ kind: AttendanceChipKind }>) {
  const { t } = useI18n('MyPicksPage');
  const label = kind === 'attended' ? t('chipAttended') : t('chipMissed');
  const kindClass = kind === 'attended' ? styles.attendanceChipAttended : styles.attendanceChipMissed;
  return (
    <span className={`${styles.attendanceChip} ${kindClass}`} role="status">
      {label}
    </span>
  );
}

function ConflictChip({ conflict }: Readonly<{ conflict: ConflictInfo }>) {
  const { t } = useI18n('SchedulePage');
  const labelKey = conflict.severity === 'hard' ? 'conflictChip' : 'overlapChip';
  return (
    <button
      type="button"
      className={getConflictChipClass(conflict)}
      onClick={(event) => {
        event.stopPropagation();
        conflict.onClick();
      }}
      aria-pressed={conflict.active}
    >
      ⚠ {t(labelKey)}
    </button>
  );
}

function PickButton({
  isPicked,
  popping,
  onToggle,
}: Readonly<{ isPicked: boolean; popping: boolean; onToggle: () => void }>) {
  const { t } = useI18n('SchedulePage');
  const activeClass = isPicked ? styles.pickActive : '';
  const animClass = popping ? styles.pickAnimating : '';
  return (
    <button
      type="button"
      className={`${styles.pick} ${activeClass} ${animClass}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      aria-label={isPicked ? t('removePick') : t('addPick')}
      aria-pressed={isPicked}
    >
      <StarIcon filled={isPicked} size={28} />
    </button>
  );
}

function AttendeeCluster({
  attendees,
  max = 5,
  count,
  isBandEnded = false,
  missedCount,
}: Readonly<{
  attendees: BandAttendee[];
  max?: number;
  count: number;
  isBandEnded?: boolean;
  missedCount?: number;
}>) {
  const { t } = useI18n('SchedulePage');
  if (attendees.length === 0) return null;
  const visible = attendees.slice(0, max);
  const overflow = attendees.length - visible.length;
  const sawCount = missedCount === undefined ? count : count - missedCount;

  return (
    <div className={styles.attendeeCluster}>
      <div className={styles.attendeeAvatars}>
        {visible.map((a) => (
          <Avatar
            key={a.id}
            size={32}
            src={a.avatar_url}
            initial={a.label.charAt(0).toUpperCase()}
            className={styles.attendeeAvatar}
          />
        ))}
        {overflow > 0 && (
          <span className={styles.attendeeOverflow}>
            {t('attendeeOverflow', { count: overflow })}
          </span>
        )}
      </div>
      <span className={styles.attendeeCount}>
        {isBandEnded ? (
          <>
            <b>{sawCount}</b>
            {t('sawLabel')}
            {missedCount !== undefined && missedCount > 0 && (
              <>
                {' · '}
                <b>{missedCount}</b>
                {t('skipLabel')}
              </>
            )}
          </>
        ) : (
          <>
            <b>{count}</b>
            {t('goingLabel')}
          </>
        )}
      </span>
    </div>
  );
}
