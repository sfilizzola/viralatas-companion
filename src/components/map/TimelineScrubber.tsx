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
 * WackenBull — 52×50px W:O:A-style bullhead handle.
 * Horns + broad face + angular eyes + nostrils + iconic nose ring.
 */
function WackenBull() {
  return (
    <svg width="52" height="50" viewBox="0 0 52 50" fill="none" aria-hidden="true">
      {/* ── Left horn — thick, sweeping up ── */}
      <path
        d="M15 22 Q11 17 8 10 Q6 5 8.5 3 Q11 1 13.5 4.5 Q16 9 18 17 Q19 20 20.5 22"
        fill="#c8a830"
        stroke="#0a0604"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* ── Right horn ── */}
      <path
        d="M37 22 Q41 17 44 10 Q46 5 43.5 3 Q41 1 38.5 4.5 Q36 9 34 17 Q33 20 31.5 22"
        fill="#c8a830"
        stroke="#0a0604"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* ── Main bull head — wide, squat, aggressive ── */}
      <path
        d="M10 23 Q7 26 7 30 Q7 34 10.5 37
           L13 39.5 Q15 43 17 46
           Q20 50 26 50 Q32 50 35 46
           Q37 43 39 39.5 L41.5 37
           Q45 34 45 30 Q45 26 42 23
           Q38 18.5 34 18 L26 17.5 L18 18
           Q14 18.5 10 23Z"
        fill="#c8a830"
        stroke="#0a0604"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* ── Forehead crown ridge ── */}
      <path d="M17 19.5 Q26 17 35 19.5" stroke="#7a5410" strokeWidth="1.1" fill="none" opacity="0.6" />
      {/* ── Left ear ── */}
      <path
        d="M8.5 25 Q4 23 4.5 29 Q6.5 33 11 31.5"
        fill="#c8a830"
        stroke="#0a0604"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* ── Right ear ── */}
      <path
        d="M43.5 25 Q48 23 47.5 29 Q45.5 33 41 31.5"
        fill="#c8a830"
        stroke="#0a0604"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* ── Left eye — angular, mean ── */}
      <path
        d="M13 27.5 Q13.5 23.5 17.5 23 Q21.5 23 22 27
           Q21.5 30 17.5 30.5 Q13.5 30 13 27.5Z"
        fill="#0a0604"
      />
      <circle cx="15" cy="26" r="1" fill="#c8a830" opacity="0.35" />
      {/* ── Right eye ── */}
      <path
        d="M30 27 Q30.5 23 34.5 23 Q38.5 23.5 39 27.5
           Q38.5 30 34.5 30.5 Q30.5 30 30 27Z"
        fill="#0a0604"
      />
      <circle cx="32" cy="26" r="1" fill="#c8a830" opacity="0.35" />
      {/* ── Muzzle ── */}
      <path
        d="M18 36 Q26 34 34 36 Q37.5 40.5 34 45.5 Q26 49 18 45.5 Q14.5 40.5 18 36Z"
        fill="#b09228"
        stroke="#0a0604"
        strokeWidth="1.2"
      />
      {/* ── Left nostril ── */}
      <ellipse cx="21.5" cy="41.5" rx="3.2" ry="2.6" fill="#0a0604" />
      {/* ── Right nostril ── */}
      <ellipse cx="30.5" cy="41.5" rx="3.2" ry="2.6" fill="#0a0604" />
      {/* ── Nose ring — the W:O:A signature detail ── */}
      <path
        d="M22 47 Q26 50 30 47"
        fill="none"
        stroke="#e8d060"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
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
