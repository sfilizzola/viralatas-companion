import { useRef, useCallback } from 'react';
import { useI18n } from '../../lib/i18n';
import styles from './TimelineScrubber.module.css';

interface Props {
  now: Date;
  previewTime: Date | null;
  windowStart: Date;
  windowEnd: Date;
  isActive: boolean;
  onPreview: (t: Date) => void;
  onClear: () => void;
}

/** Format a Date to HH:MM in CEST. */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  });
}

/** Convert a fractional position (0..1) to a Date within the window. */
export function timeFromFraction(
  fraction: number,
  windowStart: Date,
  windowEnd: Date,
): Date {
  const ms =
    windowStart.getTime() +
    Math.max(0, Math.min(1, fraction)) *
      (windowEnd.getTime() - windowStart.getTime());
  return new Date(ms);
}

/** Convert a Date to a fractional position (0..1) within the window. */
function fractionFromTime(date: Date, windowStart: Date, windowEnd: Date): number {
  const span = windowEnd.getTime() - windowStart.getTime();
  return (date.getTime() - windowStart.getTime()) / span;
}

/**
 * VikingSkull — 40×46px carved-bone skull handle.
 * Anatomically grounded: cranium, hollow eye sockets, nasal aperture,
 * visible jaw with 4 teeth, brow ridge, cheekbone shading, battle crack.
 * Bone-gold palette — the drag affordance.
 */
function VikingSkull() {
  return (
    <svg width="40" height="46" viewBox="0 0 40 46" fill="none" aria-hidden="true">
      {/* ── Main skull silhouette: cranium + jaw fused ── */}
      <path
        d="M20 1.5 C10.5 1.5 4 8 4 16.5 C4 22 6.5 26.5 10.5 29
           L10.5 31 C10.5 32 11.5 32.5 12.5 32.5
           L12.5 33 L13.5 33
           L13.5 38.5 L14 44.5 L26 44.5 L26.5 38.5 L26.5 33
           L27.5 33 L27.5 32.5 C28.5 32.5 29.5 32 29.5 31
           L29.5 29 C33.5 26.5 36 22 36 16.5
           C36 8 29.5 1.5 20 1.5Z"
        fill="#c8b880"
        stroke="#1a0b05"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* ── Jaw suture line ── */}
      <path d="M10.5 30 Q20 32 29.5 30" stroke="#8a6820" strokeWidth="0.8" fill="none" opacity="0.7" />
      {/* ── Tooth separators ── */}
      <line x1="17" y1="33" x2="16.5" y2="44" stroke="#7a5e18" strokeWidth="1" />
      <line x1="20" y1="33" x2="20"   y2="44.5" stroke="#7a5e18" strokeWidth="1" />
      <line x1="23" y1="33" x2="23.5" y2="44" stroke="#7a5e18" strokeWidth="1" />
      {/* ── Left eye socket ── */}
      <ellipse cx="14" cy="17" rx="5.5" ry="6.5" fill="#0e0806" stroke="#1a0b05" strokeWidth="0.6" />
      {/* Subtle bone rim highlight inside left socket */}
      <path d="M10.5 14 Q12 12 15 12.5" stroke="#d8c070" strokeWidth="0.6" strokeLinecap="round" opacity="0.2" />
      {/* ── Right eye socket ── */}
      <ellipse cx="26" cy="17" rx="5.5" ry="6.5" fill="#0e0806" stroke="#1a0b05" strokeWidth="0.6" />
      <path d="M22.5 14 Q24 12 27 12.5" stroke="#d8c070" strokeWidth="0.6" strokeLinecap="round" opacity="0.2" />
      {/* ── Nasal aperture (inverted pear) ── */}
      <path
        d="M18.2 25 Q18 22.5 20 22.5 Q22 22.5 21.8 25
           Q22 28 20 28 Q18 28 18.2 25Z"
        fill="#0e0806"
        stroke="#1a0b05"
        strokeWidth="0.5"
      />
      {/* Nasal spine divider */}
      <line x1="20" y1="25" x2="20" y2="27.5" stroke="#c8b880" strokeWidth="0.5" opacity="0.25" />
      {/* ── Brow ridge ── */}
      <path d="M8 14 Q14 11.5 20 12 Q26 11.5 32 14" stroke="#9a7830" strokeWidth="0.9" fill="none" opacity="0.55" />
      {/* ── Temporal/cheekbone shading ── */}
      <path d="M5 17 Q6 22 9 26.5" stroke="#906820" strokeWidth="0.8" opacity="0.45" />
      <path d="M35 17 Q34 22 31 26.5" stroke="#906820" strokeWidth="0.8" opacity="0.45" />
      {/* ── Battle crack across forehead ── */}
      <path d="M23.5 2.5 L25.5 6 L23 10.5 L24.5 15" stroke="#785020" strokeWidth="0.75" strokeLinecap="round" opacity="0.6" />
      {/* ── Cranial highlight (top-left specular) ── */}
      <path d="M10 8 Q12.5 5 18 4" stroke="#e8d8a0" strokeWidth="1.1" strokeLinecap="round" opacity="0.28" />
    </svg>
  );
}

/** Padlock SVG for locked state. */
function Padlock() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true">
      <rect x="1" y="6" width="12" height="10" rx="2" fill="#1a0f1e" stroke="#120a18" strokeWidth="1.5" />
      <path d="M4 6 Q4 2 7 2 Q10 2 10 6" fill="none" stroke="#1e1220" strokeWidth="2" />
      <circle cx="7" cy="11" r="1.5" fill="#120a16" />
      <rect x="6.5" y="11" width="1" height="2.5" rx="0.5" fill="#120a16" />
    </svg>
  );
}

export default function TimelineScrubber({
  now,
  previewTime,
  windowStart,
  windowEnd,
  isActive,
  onPreview,
  onClear,
}: Props) {
  const { t } = useI18n('TimelineScrubber');
  const trackRef = useRef<HTMLDivElement>(null);

  const nowFraction = fractionFromTime(now, windowStart, windowEnd);
  const handleFraction = previewTime
    ? fractionFromTime(previewTime, windowStart, windowEnd)
    : nowFraction;

  const fractionFromPointer = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return nowFraction;
      const raw = (clientX - rect.left) / rect.width;
      return Math.max(nowFraction, Math.min(1, raw));
    },
    [nowFraction],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isActive) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const f = fractionFromPointer(e.clientX);
      onPreview(timeFromFraction(f, windowStart, windowEnd));
    },
    [isActive, fractionFromPointer, onPreview, windowStart, windowEnd],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const f = fractionFromPointer(e.clientX);
      onPreview(timeFromFraction(f, windowStart, windowEnd));
    },
    [fractionFromPointer, onPreview, windowStart, windowEnd],
  );

  const displayTime = previewTime ?? now;
  const isAtNow = previewTime === null;

  if (!isActive) {
    return (
      <div className={styles.lockedWrap}>
        <div className={styles.lockedHeader}>
          <span className={styles.lockedLabel}>{t('label')}</span>
          <Padlock />
        </div>
        <div className={styles.lockedInner}>
          <div className={styles.lockedBar} />
          <p className={styles.lockedText}>{t('locked')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* Row 1: label + back button */}
      <div className={styles.header}>
        <span className={styles.label}>{t('label')}</span>
        {!isAtNow && (
          <button type="button" className={styles.backBtn} onClick={onClear}>
            {t('backToNow')}
          </button>
        )}
      </div>

      {/* Row 2: now reference left — large preview time right */}
      <div className={styles.times}>
        <span className={styles.timeNow}>
          {t('nowLabel')} · {formatTime(now)}
        </span>
        <div className={styles.previewBlock}>
          <span className={styles.previewTime}>{formatTime(displayTime)}</span>
          <span className={isAtNow ? styles.previewTagLive : styles.previewTag}>
            {isAtNow ? t('live') : t('previewing')}
          </span>
        </div>
      </div>

      {/* Row 3: track */}
      <div className={styles.trackWrap}>
        <div
          ref={trackRef}
          className={styles.track}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
        >
          {/* Past fill — windowStart to now */}
          <div
            className={styles.fillPast}
            style={{ width: `${nowFraction * 100}%` }}
          />
          {/* Preview fill — now to handle */}
          {!isAtNow && (
            <div
              className={styles.fillPreview}
              style={{
                left: `${nowFraction * 100}%`,
                width: `${(handleFraction - nowFraction) * 100}%`,
              }}
            />
          )}
        </div>

        {/* Grip disc handle */}
        <div
          className={styles.handle}
          style={{ left: `calc(${handleFraction * 100}% - 20px)` }}
          role="slider"
          aria-label={t('handleAriaLabel')}
          aria-valuenow={Math.round(handleFraction * 100)}
          aria-valuemin={Math.round(nowFraction * 100)}
          aria-valuemax={100}
        >
          <VikingSkull />
        </div>
      </div>

      {/* Row 4: axis labels */}
      <div className={styles.axis}>
        <span className={styles.axisLabel}>{formatTime(windowStart)}</span>
        <span className={styles.axisLabel}>{formatTime(windowEnd)}</span>
      </div>
    </div>
  );
}
