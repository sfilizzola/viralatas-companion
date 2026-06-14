import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Band, BandRatingScore } from '../types';
import type { BandAttendee } from '../hooks/useBandAttendees';
import { stageColorVar } from '../services/stageColors';
import { bandWeekdayKey, formatTime } from '../services/bandTime';
import { getMetalBattleCountryFlag } from '../services/metalBattle';
import { useI18n } from '../lib/i18n';
import { Chip } from '../ui';
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
  /** Ranked leaderboard magnitude bar — value/max drives bar width, tone picks gradient color */
  magnitude?: { value: number; max: number; tone: 'stage' | 'accent' };
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

function getStripeClass(attendanceChip: AttendanceChipKind | undefined): string {
  if (attendanceChip === 'attended') return styles.stripeAttended;
  if (attendanceChip === 'missed') return styles.stripeMissed;
  return styles.stripe;
}

type CardClassParams = {
  variant: BandCardVariant;
  isCeremony: boolean;
  interactive: boolean;
  conflict?: ConflictInfo;
  showAttendanceChip: boolean;
  attendanceChip?: AttendanceChipKind;
  isBandEnded: boolean;
  sharedPick: boolean;
};

function buildBandCardClasses(params: Readonly<CardClassParams>): string {
  const {
    variant,
    isCeremony,
    interactive,
    conflict,
    showAttendanceChip,
    attendanceChip,
    isBandEnded,
    sharedPick,
  } = params;

  return [
    styles.card,
    getVariantClass(variant),
    isCeremony ? styles.cardCeremony : '',
    interactive ? '' : styles.cardStatic,
    getConflictCardClass(conflict),
    showAttendanceChip && attendanceChip === 'attended' ? styles.cardAttended : '',
    showAttendanceChip && attendanceChip === 'missed' ? styles.cardMissed : '',
    variant === 'timeline' && isBandEnded && !showAttendanceChip ? styles.cardEnded : '',
    variant === 'ranked' && isBandEnded ? styles.cardEnded : '',
    sharedPick ? styles.cardSharedPick : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function getBandPresentation(band: Band) {
  const isCeremony = band.category === 'ceremony';
  return {
    isCeremony,
    color: isCeremony ? 'var(--ceremony-gold)' : stageColorVar(band.stage),
    thumbFallback: isCeremony ? '✦' : band.name.charAt(0).toUpperCase(),
  };
}

function handleCardKeyDown(
  onClick: (() => void) | undefined,
  event: KeyboardEvent<HTMLElement>,
) {
  if (!onClick) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onClick();
  }
}

function usePickPopAnimation(isPicked: boolean) {
  const [popping, setPopping] = useState(false);
  const userToggledRef = useRef(false);
  useEffect(() => {
    if (!userToggledRef.current) return;
    userToggledRef.current = false;
    setPopping(true);
    const id = globalThis.setTimeout(() => setPopping(false), 320);
    return () => globalThis.clearTimeout(id);
  }, [isPicked]);
  return { popping, markUserToggled: () => { userToggledRef.current = true; } };
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
  magnitude,
  sharedPick = false,
}: Readonly<BandCardProps>) {
  const interactive = Boolean(onClick);
  const showPick = variant !== 'ranked' && !hidePick;
  const { popping, markUserToggled } = usePickPopAnimation(isPicked);
  const { isCeremony, color } = getBandPresentation(band);
  const showAttendanceChip = variant === 'timeline' && attendanceChip !== undefined;
  const cardClasses = buildBandCardClasses({
    variant,
    isCeremony,
    interactive,
    conflict,
    showAttendanceChip,
    attendanceChip,
    isBandEnded,
    sharedPick,
  });

  return (
    // The card-as-button pattern is intentional: nested action buttons (star,
    // duck, conflict chip) preclude wrapping the whole card in a real
    // <button>. Keyboard activation + aria-pressed provide accessibility.
    <article // NOSONAR
      className={cardClasses}
      role={interactive ? 'button' : undefined} // NOSONAR
      tabIndex={interactive ? 0 : undefined} // NOSONAR
      onClick={onClick}
      onKeyDown={(event) => handleCardKeyDown(onClick, event)}
      aria-pressed={interactive ? isPicked : undefined}
      style={{ '--stage-color': color } as React.CSSProperties}
    >
      {variant === 'ranked' ? (
        <RankedRow
          band={band}
          rank={rank}
          magnitude={magnitude}
          count={count}
          isBandEnded={isBandEnded}
          missedCount={missedCount}
          attendeeCluster={attendeeCluster}
          ratingStats={ratingStats}
          showDayGhost={showDayLabel && variant === 'ranked'}
        />
      ) : (
        <StandardBandCardContent
          band={band}
          variant={variant}
          isPicked={isPicked}
          count={count}
          onToggle={onToggle}
          conflict={conflict}
          pending={pending}
          isBandEnded={isBandEnded}
          attendanceChip={attendanceChip}
          missedCount={missedCount}
          onDuck={onDuck}
          duckCooldownUntil={duckCooldownUntil}
          showDayLabel={showDayLabel}
          showPick={showPick}
          popping={popping}
          markUserToggled={markUserToggled}
          isCeremony={isCeremony}
          showAttendanceChip={showAttendanceChip}
        >
          {children}
        </StandardBandCardContent>
      )}
    </article>
  );
}

type StandardBandCardContentProps = {
  band: Band;
  variant: Exclude<BandCardVariant, 'ranked'>;
  isPicked: boolean;
  count: number;
  onToggle: () => void;
  conflict?: ConflictInfo;
  pending?: boolean;
  isBandEnded: boolean;
  attendanceChip?: AttendanceChipKind;
  missedCount?: number;
  onDuck?: () => void;
  duckCooldownUntil?: number;
  showDayLabel: boolean;
  showPick: boolean;
  popping: boolean;
  markUserToggled: () => void;
  isCeremony: boolean;
  showAttendanceChip: boolean;
};

function StandardBandCardContent({
  band,
  variant,
  isPicked,
  count,
  onToggle,
  conflict,
  pending,
  isBandEnded,
  attendanceChip,
  missedCount,
  children,
  onDuck,
  duckCooldownUntil,
  showDayLabel,
  showPick,
  popping,
  markUserToggled,
  isCeremony,
  showAttendanceChip,
}: Readonly<StandardBandCardContentProps & { children?: ReactNode }>) {
  const { t } = useI18n('SchedulePage');
  const { thumbFallback } = getBandPresentation(band);
  const showDuck = Boolean(onDuck) && !isCeremony;
  const showDayGhost = showDayLabel && variant === 'schedule';

  return (
    <>
      <div className={getStripeClass(attendanceChip)} aria-hidden />

      {variant === 'schedule' && (
        <CardThumb imageUrl={band.image_url} fallback={thumbFallback} />
      )}

      {variant === 'timeline' && (
        <CardWhen startTime={band.start_time} endTime={band.end_time} />
      )}

      <div
        className={[styles.body, showDayGhost ? styles.bodyWithDayGhost : '']
          .filter(Boolean)
          .join(' ')}
      >
        {showDayGhost && (
          <span className={styles.dayGhost} aria-hidden>
            {t(bandWeekdayKey(band))}
          </span>
        )}
        <h2 className={styles.bandName}>{band.name}</h2>
        <BandCardMeta
          band={band}
          variant={variant}
          isCeremony={isCeremony}
          count={count}
          isBandEnded={isBandEnded}
          missedCount={missedCount}
          conflict={conflict}
          showAttendanceChip={showAttendanceChip}
          attendanceChip={attendanceChip}
          pending={pending}
        />
        {children}
        {showDuck && onDuck && (
          <QuackGhostRow onDuck={onDuck} cooldownUntil={duckCooldownUntil ?? null} />
        )}
      </div>

      {showPick && (
        <PickButton
          isPicked={isPicked}
          popping={popping}
          onToggle={() => {
            markUserToggled();
            onToggle();
          }}
        />
      )}
    </>
  );
}

type BandCardMetaProps = {
  band: Band;
  variant: Exclude<BandCardVariant, 'ranked'>;
  isCeremony: boolean;
  count: number;
  isBandEnded: boolean;
  missedCount?: number;
  conflict?: ConflictInfo;
  showAttendanceChip: boolean;
  attendanceChip?: AttendanceChipKind;
  pending?: boolean;
};

function BandCardMeta({
  band,
  variant,
  isCeremony,
  count,
  isBandEnded,
  missedCount,
  conflict,
  showAttendanceChip,
  attendanceChip,
  pending,
}: Readonly<BandCardMetaProps>) {
  const { t } = useI18n('SchedulePage');

  return (
    <div
      className={[styles.meta, showAttendanceChip ? styles.metaWithAttendance : '']
        .filter(Boolean)
        .join(' ')}
    >
      {isCeremony ? (
        <span className={styles.ceremonyLabel}>✦ {t('scheduleClosingCeremony')}</span>
      ) : (
        <Chip className={styles.stageBadge}>{band.stage}</Chip>
      )}
      {variant !== 'timeline' && (
        <span className={styles.time}>
          {formatTime(band.start_time)} – {formatTime(band.end_time)}
        </span>
      )}
      {count > 0 && !showAttendanceChip && (
        <span className={styles.going}>
          <AttendanceText count={count} isBandEnded={isBandEnded} missedCount={missedCount} />
        </span>
      )}
      {variant === 'timeline' && conflict && <ConflictChip conflict={conflict} />}
      {showAttendanceChip && attendanceChip && <AttendanceChip kind={attendanceChip} />}
      {band.genre && variant === 'schedule' && (
        <span className={styles.genre}>
          {band.genre === 'Metal Battle'
            ? `${getMetalBattleCountryFlag(band.slot_id) ?? ''} Metal Battle`.trim()
            : band.genre}
        </span>
      )}
      {pending && <span className="pending-chip">{t('pendingSync')}</span>}
    </div>
  );
}

function getRankedRankToneClass(isTop3: boolean, isRating: boolean): string {
  if (!isTop3) return '';
  if (isRating) return styles.rankedRankTopRating;
  return styles.rankedRankTop;
}

function getRankedCapLabel(
  isRating: boolean,
  isBandEnded: boolean,
  ratingCount: number,
  t: (key: string) => string,
  tPopular: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (isRating) return tPopular('ratingCountCap', { count: ratingCount });
  if (isBandEnded) return t('sawLabel');
  return tPopular('capPicks');
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

function RankedRow({
  band,
  rank,
  magnitude,
  count,
  isBandEnded,
  missedCount,
  attendeeCluster,
  ratingStats,
  showDayGhost,
}: Readonly<{
  band: Band;
  rank?: number;
  magnitude?: { value: number; max: number; tone: 'stage' | 'accent' };
  count: number;
  isBandEnded: boolean;
  missedCount?: number;
  attendeeCluster?: { attendees: BandAttendee[]; max?: number };
  ratingStats?: { avgFormatted: string; count: number; userScore?: BandRatingScore };
  showDayGhost: boolean;
}>) {
  const { t } = useI18n('SchedulePage');
  const { t: tPopular } = useI18n('PopularPage');

  const isRating = ratingStats !== undefined;
  const barWidth =
    magnitude && magnitude.max > 0
      ? Math.min(100, Math.max(0, (magnitude.value / magnitude.max) * 100))
      : 0;
  const isTop3 = rank !== undefined && rank <= 3;
  const rankToneClass = getRankedRankToneClass(isTop3, isRating);
  const rankedCapLabel = getRankedCapLabel(
    isRating,
    isBandEnded,
    ratingStats?.count ?? 0,
    t,
    tPopular,
  );
  const showSkip =
    isBandEnded && missedCount !== undefined && missedCount > 0;

  return (
    <>
      <div
        className={`${styles.rankedBar} ${magnitude?.tone === 'accent' ? styles.rankedBarAccent : ''}`}
        style={{ width: `${barWidth}%` }}
        aria-hidden
      />
      <div className={`${styles.rankedRank} ${rankToneClass}`} aria-hidden>
        {rank ?? ''}
      </div>
      <div className={styles.rankedMain}>
        <h2 className={styles.rankedName}>{band.name}</h2>
        <div className={styles.rankedSub}>
          {showDayGhost && (
            <span className={`${styles.dayGhost} ${styles.rankedDay}`} aria-hidden>
              {t(bandWeekdayKey(band))}
            </span>
          )}
          <span className={styles.stageDot} aria-hidden />
          <span className={styles.rankedStage}>{band.stage}</span>
          <span className={styles.rankedTime}>{formatTime(band.start_time)}</span>
        </div>
        {isRating && ratingStats?.userScore !== undefined && (
          <div className={styles.rankedYou}>
            {tPopular('ratingYouScore', { score: ratingStats.userScore })}
            <PawIcon filled size={9} />
          </div>
        )}
        {showSkip && (
          <div className={styles.rankedSkip}>
            {missedCount} {t('skipLabel')}
          </div>
        )}
      </div>
      <div className={styles.rankedRight}>
        <RankedHero
          isRating={isRating}
          isBandEnded={isBandEnded}
          count={count}
          missedCount={missedCount}
          avgFormatted={ratingStats?.avgFormatted}
        />
        <div className={styles.rankedCap}>{rankedCapLabel}</div>
        {!isRating && attendeeCluster && (
          <RankedAvatars attendees={attendeeCluster.attendees} />
        )}
      </div>
    </>
  );
}

function RankedHero({
  isRating,
  isBandEnded,
  count,
  missedCount,
  avgFormatted,
}: Readonly<{
  isRating: boolean;
  isBandEnded: boolean;
  count: number;
  missedCount?: number;
  avgFormatted?: string;
}>) {
  if (isRating) {
    return (
      <div className={styles.rankedHero} aria-label={avgFormatted}>
        <span className={styles.rankedHeroPaw}>
          <PawIcon filled size={16} />
        </span>
        {avgFormatted}
      </div>
    );
  }
  const sawCount = missedCount === undefined ? count : count - missedCount;
  return <div className={styles.rankedHero}>{isBandEnded ? sawCount : count}</div>;
}

function RankedAvatars({ attendees }: Readonly<{ attendees: BandAttendee[] }>) {
  if (attendees.length === 0) return null;
  const visible = attendees.slice(0, 3);
  return (
    <div className={styles.rankedAvatars} aria-hidden>
      {visible.map((a) => (
        <span key={a.id} className={styles.rankedAvatar}>
          {a.avatar_url ? (
            <img src={a.avatar_url} alt="" />
          ) : (
            a.label.charAt(0).toUpperCase()
          )}
        </span>
      ))}
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

function AttendanceChip({ kind }: Readonly<{ kind: AttendanceChipKind }>) {
  const { t } = useI18n('MyPicksPage');
  const label = kind === 'attended' ? t('chipAttended') : t('chipMissed');
  const kindClass = kind === 'attended' ? styles.attendanceChipAttended : styles.attendanceChipMissed;
  return (
    <output className={`${styles.attendanceChip} ${kindClass}`}>
      {label}
    </output>
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

