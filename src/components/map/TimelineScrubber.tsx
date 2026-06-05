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
 * WackenBull — actual bullhead PNG as the drag handle.
 */
function WackenBull() {
  return (
    <img
      src="/bullhead.png"
      alt=""
      aria-hidden="true"
      width={52}
      height={43}
      style={{ display: 'block', objectFit: 'contain', mixBlendMode: 'screen' }}
    />
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
          style={{ left: `calc(${handleFraction * 100}% - 26px)` }}
          role="slider"
          aria-label={t('handleAriaLabel')}
          aria-valuenow={Math.round(handleFraction * 100)}
          aria-valuemin={Math.round(nowFraction * 100)}
          aria-valuemax={100}
        >
          <WackenBull />
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
